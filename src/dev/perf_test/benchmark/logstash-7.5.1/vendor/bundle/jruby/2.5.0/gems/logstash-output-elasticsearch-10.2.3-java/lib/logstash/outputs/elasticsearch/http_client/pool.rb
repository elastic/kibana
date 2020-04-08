module LogStash; module Outputs; class ElasticSearch; class HttpClient;
  class Pool
    class NoConnectionAvailableError < Error; end
    class BadResponseCodeError < Error
      attr_reader :url, :response_code, :request_body, :response_body

      def initialize(response_code, url, request_body, response_body)
        @response_code = response_code
        @url = url
        @request_body = request_body
        @response_body = response_body
      end

      def message
        "Got response code '#{response_code}' contacting Elasticsearch at URL '#{@url}'"
      end
    end
    class HostUnreachableError < Error;
      attr_reader :original_error, :url

      def initialize(original_error, url)
        @original_error = original_error
        @url = url
      end

      def message
        "Elasticsearch Unreachable: [#{@url}][#{original_error.class}] #{original_error.message}"
      end
    end

    attr_reader :logger, :adapter, :sniffing, :sniffer_delay, :resurrect_delay, :healthcheck_path, :sniffing_path, :bulk_path

    ROOT_URI_PATH = '/'.freeze
    LICENSE_PATH = '/_license'.freeze

    DEFAULT_OPTIONS = {
      :healthcheck_path => ROOT_URI_PATH,
      :sniffing_path => "/_nodes/http",
      :bulk_path => "/_bulk",
      :scheme => 'http',
      :resurrect_delay => 5,
      :sniffing => false,
      :sniffer_delay => 10,
    }.freeze

    def initialize(logger, adapter, initial_urls=[], options={})
      @logger = logger
      @adapter = adapter
      @metric = options[:metric]
      @initial_urls = initial_urls
      
      raise ArgumentError, "No URL Normalizer specified!" unless options[:url_normalizer]
      @url_normalizer = options[:url_normalizer]
      DEFAULT_OPTIONS.merge(options).tap do |merged|
        @bulk_path = merged[:bulk_path]
        @sniffing_path = merged[:sniffing_path]
        @healthcheck_path = merged[:healthcheck_path]
        @resurrect_delay = merged[:resurrect_delay]
        @sniffing = merged[:sniffing]
        @sniffer_delay = merged[:sniffer_delay]
      end

      # Used for all concurrent operations in this class
      @state_mutex = Mutex.new

      # Holds metadata about all URLs
      @url_info = {}
      @stopping = false
    end

    def oss?
     LogStash::Outputs::ElasticSearch.oss?
    end
    
    def start
      update_initial_urls
      start_resurrectionist
      start_sniffer if @sniffing
    end

    def update_initial_urls
      update_urls(@initial_urls)
    end

    def close
      @state_mutex.synchronize { @stopping = true }

      logger.debug  "Stopping sniffer"
      stop_sniffer

      logger.debug  "Stopping resurrectionist"
      stop_resurrectionist

      logger.debug  "Waiting for in use manticore connections"
      wait_for_in_use_connections

      logger.debug("Closing adapter #{@adapter}")
      @adapter.close
    end

    def wait_for_in_use_connections
      until in_use_connections.empty?
        logger.info "Blocked on shutdown to in use connections #{@state_mutex.synchronize {@url_info}}"
        sleep 1
      end
    end

    def in_use_connections
      @state_mutex.synchronize { @url_info.values.select {|v| v[:in_use] > 0 } }
    end

    def alive_urls_count
      @state_mutex.synchronize { @url_info.values.select {|v| v[:state] == :alive }.count }
    end

    def url_info
      @state_mutex.synchronize { @url_info }
    end

    def maximum_seen_major_version
      @state_mutex.synchronize do
        @maximum_seen_major_version
      end
    end

    def urls
      url_info.keys
    end

    def until_stopped(task_name, delay)
      last_done = Time.now
      until @state_mutex.synchronize { @stopping }
        begin
          now = Time.now
          if (now - last_done) >= delay
            last_done = now
            yield
          end
          sleep 1
        rescue => e
          logger.warn(
            "Error while performing #{task_name}",
            :error_message => e.message,
            :class => e.class.name,
            :backtrace => e.backtrace
            )
        end
      end
    end

    def start_sniffer
      @sniffer = Thread.new do
        until_stopped("sniffing", sniffer_delay) do
          begin
            sniff!
          rescue NoConnectionAvailableError => e
            @state_mutex.synchronize { # Synchronize around @url_info
              logger.warn("Elasticsearch output attempted to sniff for new connections but cannot. No living connections are detected. Pool contains the following current URLs", :url_info => @url_info) }
          end
        end
      end
    end

    # Sniffs the cluster then updates the internal URLs
    def sniff!
      update_urls(check_sniff)
    end

    ES1_SNIFF_RE_URL  = /\[([^\/]*)?\/?([^:]*):([0-9]+)\]/
    ES2_AND_ABOVE_SNIFF_RE_URL  = /([^\/]*)?\/?([^:]*):([0-9]+)/
    # Sniffs and returns the results. Does not update internal URLs!
    def check_sniff
      _, url_meta, resp = perform_request(:get, @sniffing_path)
      @metric.increment(:sniff_requests)
      parsed = LogStash::Json.load(resp.body)
      nodes = parsed['nodes']
      if !nodes || nodes.empty?
        @logger.warn("Sniff returned no nodes! Will not update hosts.")
        return nil
      else
        case major_version(url_meta[:version])
        when 5, 6, 7, 8
          sniff_5x_and_above(nodes)
        when 2, 1
          sniff_2x_1x(nodes)
        else
          @logger.warn("Could not determine version for nodes in ES cluster!")
          return nil
        end
      end
    end
    
    def major_version(version_string)
      version_string.split('.').first.to_i
    end
    
    def sniff_5x_and_above(nodes)
      nodes.map do |id,info|
        # Skip master-only nodes
        next if info["roles"] && info["roles"] == ["master"]
        address_str_to_uri(info["http"]["publish_address"]) if info["http"]
      end.compact
    end

    def address_str_to_uri(addr_str)
      matches = addr_str.match(ES1_SNIFF_RE_URL) || addr_str.match(ES2_AND_ABOVE_SNIFF_RE_URL)
      if matches
        host = matches[1].empty? ? matches[2] : matches[1]
        ::LogStash::Util::SafeURI.new("#{host}:#{matches[3]}")
      end
    end


    def sniff_2x_1x(nodes)
      nodes.map do |id,info|
        # TODO Make sure this works with shield. Does that listed
        # stuff as 'https_address?'
        
        addr_str = info['http_address'].to_s
        next unless addr_str # Skip hosts with HTTP disabled

        # Only connect to nodes that serve data
        # this will skip connecting to client, tribe, and master only nodes
        # Note that if 'attributes' is NOT set, then that's just a regular node
        # with master + data + client enabled, so we allow that
        attributes = info['attributes']
        next if attributes && attributes['data'] == 'false'
        address_str_to_uri(addr_str)
      end.compact
    end

    def stop_sniffer
      @sniffer.join if @sniffer
    end

    def sniffer_alive?
      @sniffer ? @sniffer.alive? : nil
    end

    def start_resurrectionist
      @resurrectionist = Thread.new do
        until_stopped("resurrection", @resurrect_delay) do
          healthcheck!
        end
      end
    end

    def get_license(url)
      response = perform_request_to_url(url, :get, LICENSE_PATH)
      LogStash::Json.load(response.body)
    end

    def valid_es_license?(url)
      license = get_license(url)
      license.fetch("license", {}).fetch("status", nil) == "active"
    rescue => e
      false
    end

    def health_check_request(url)
      perform_request_to_url(url, :head, @healthcheck_path)
    end

    def healthcheck!
      # Try to keep locking granularity low such that we don't affect IO...
      @state_mutex.synchronize { @url_info.select {|url,meta| meta[:state] != :alive } }.each do |url,meta|
        begin
          logger.debug("Running health check to see if an Elasticsearch connection is working",
                        :healthcheck_url => url, :path => @healthcheck_path)
          health_check_request(url)
          # If no exception was raised it must have succeeded!
          logger.warn("Restored connection to ES instance", :url => url.sanitized.to_s)
          # We reconnected to this node, check its ES version
          es_version = get_es_version(url)
          @state_mutex.synchronize do
            meta[:version] = es_version
            major = major_version(es_version)
            if !@maximum_seen_major_version
              @logger.info("ES Output version determined", :es_version => major)
              set_new_major_version(major)
            elsif major > @maximum_seen_major_version
              @logger.warn("Detected a node with a higher major version than previously observed. This could be the result of an elasticsearch cluster upgrade.", :previous_major => @maximum_seen_major_version, :new_major => major, :node_url => url.sanitized.to_s)
              set_new_major_version(major)
            end
            if oss? || valid_es_license?(url)
              meta[:state] = :alive
            else
              # As this version is to be shipped with Logstash 7.x we won't mark the connection as unlicensed
              #
              #  logger.error("Cannot connect to the Elasticsearch cluster configured in the Elasticsearch output. Logstash requires the default distribution of Elasticsearch. Please update to the default distribution of Elasticsearch for full access to all free features, or switch to the OSS distribution of Logstash.", :url => url.sanitized.to_s)
              #  meta[:state] = :unlicensed
              #
              # Instead we'll log a deprecation warning and mark it as alive:
              #
              log_license_deprecation_warn(url)
              meta[:state] = :alive
            end
          end
        rescue HostUnreachableError, BadResponseCodeError => e
          logger.warn("Attempted to resurrect connection to dead ES instance, but got an error.", url: url.sanitized.to_s, error_type: e.class, error: e.message)
        end
      end
    end

    def stop_resurrectionist
      @resurrectionist.join if @resurrectionist
    end

    def log_license_deprecation_warn(url)
      logger.warn("DEPRECATION WARNING: Connecting to an OSS distribution of Elasticsearch using the default distribution of Logstash will stop working in Logstash 8.0.0. Please upgrade to the default distribution of Elasticsearch, or use the OSS distribution of Logstash", :url => url.sanitized.to_s)
    end

    def resurrectionist_alive?
      @resurrectionist ? @resurrectionist.alive? : nil
    end

    def perform_request(method, path, params={}, body=nil)
      with_connection do |url, url_meta|
        resp = perform_request_to_url(url, method, path, params, body)
        [url, url_meta, resp]
      end
    end

    [:get, :put, :post, :delete, :patch, :head].each do |method|
      define_method(method) do |path, params={}, body=nil|
        _, _, response = perform_request(method, path, params, body)
        response
      end
    end

    def perform_request_to_url(url, method, path, params={}, body=nil)
      res = @adapter.perform_request(url, method, path, params, body)
    rescue *@adapter.host_unreachable_exceptions => e
      raise HostUnreachableError.new(e, url), "Could not reach host #{e.class}: #{e.message}"
    end

    def normalize_url(uri)
      u = @url_normalizer.call(uri)
      if !u.is_a?(::LogStash::Util::SafeURI)
        raise "URL Normalizer returned a '#{u.class}' rather than a SafeURI! This shouldn't happen!"
      end
      u
    end

    def update_urls(new_urls)
      return if new_urls.nil?
      
      # Normalize URLs
      new_urls = new_urls.map(&method(:normalize_url))

      # Used for logging nicely
      state_changes = {:removed => [], :added => []}
      @state_mutex.synchronize do
        # Add new connections
        new_urls.each do |url|
          # URI objects don't have real hash equality! So, since this isn't perf sensitive we do a linear scan
          unless @url_info.keys.include?(url)
            state_changes[:added] << url
            add_url(url)
          end
        end

        # Delete connections not in the new list
        @url_info.each do |url,_|
          unless new_urls.include?(url)
            state_changes[:removed] << url
            remove_url(url)
          end
        end
      end

      if state_changes[:removed].size > 0 || state_changes[:added].size > 0
        if logger.info?
          logger.info("Elasticsearch pool URLs updated", :changes => state_changes)
        end
      end
      
      # Run an inline healthcheck anytime URLs are updated
      # This guarantees that during startup / post-startup
      # sniffing we don't have idle periods waiting for the
      # periodic sniffer to allow new hosts to come online
      healthcheck! 
    end
    
    def size
      @state_mutex.synchronize { @url_info.size }
    end

    def es_versions
      @state_mutex.synchronize { @url_info.size }
    end

    def add_url(url)
      @url_info[url] ||= empty_url_meta
    end

    def remove_url(url)
      @url_info.delete(url)
    end

    def empty_url_meta
      {
        :in_use => 0,
        :state => :unknown
      }
    end

    def with_connection
      url, url_meta = get_connection

      # Custom error class used here so that users may retry attempts if they receive this error
      # should they choose to
      raise NoConnectionAvailableError, "No Available connections" unless url
      yield url, url_meta
    rescue HostUnreachableError => e
      # Mark the connection as dead here since this is likely not transient
      mark_dead(url, e)
      raise e
    rescue BadResponseCodeError => e
      # These aren't discarded from the pool because these are often very transient
      # errors
      raise e
    ensure
      return_connection(url)
    end

    def mark_dead(url, error)
      @state_mutex.synchronize do
        meta = @url_info[url]
        # In case a sniff happened removing the metadata just before there's nothing to mark
        # This is an extreme edge case, but it can happen!
        return unless meta
        logger.warn("Marking url as dead. Last error: [#{error.class}] #{error.message}",
                    :url => url, :error_message => error.message, :error_class => error.class.name)
        meta[:state] = :dead
        meta[:last_error] = error
        meta[:last_errored_at] = Time.now
      end
    end

    def url_meta(url)
      @state_mutex.synchronize do
        @url_info[url]
      end
    end

    def get_connection
      @state_mutex.synchronize do
        # The goal here is to pick a random connection from the least-in-use connections
        # We want some randomness so that we don't hit the same node over and over, but
        # we also want more 'fair' behavior in the event of high concurrency
        eligible_set = nil
        lowest_value_seen = nil
        @url_info.each do |url,meta|
          meta_in_use = meta[:in_use]
          next if meta[:state] == :dead

          if lowest_value_seen.nil? || meta_in_use < lowest_value_seen
            lowest_value_seen = meta_in_use
            eligible_set = [[url, meta]]
          elsif lowest_value_seen == meta_in_use
            eligible_set << [url, meta]
          end
        end

        return nil if eligible_set.nil?

        pick, pick_meta = eligible_set.sample
        pick_meta[:in_use] += 1

        [pick, pick_meta]
      end
    end

    def return_connection(url)
      @state_mutex.synchronize do
        if @url_info[url] # Guard against the condition where the connection has already been deleted
          @url_info[url][:in_use] -= 1
        end
      end
    end

    def get_es_version(url)
      request = perform_request_to_url(url, :get, ROOT_URI_PATH)
      LogStash::Json.load(request.body)["version"]["number"]
    end

    def set_new_major_version(version)
      @maximum_seen_major_version = version
      if @maximum_seen_major_version >= 6
        @logger.warn("Detected a 6.x and above cluster: the `type` event field won't be used to determine the document _type", :es_version => @maximum_seen_major_version)
      end
    end
  end
end; end; end; end;
