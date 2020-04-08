require "logstash/outputs/elasticsearch"
require "cabin"
require "base64"
require 'logstash/outputs/elasticsearch/http_client/pool'
require 'logstash/outputs/elasticsearch/http_client/manticore_adapter'
require 'cgi'
require 'zlib'
require 'stringio'

module LogStash; module Outputs; class ElasticSearch;
  # This is a constant instead of a config option because
  # there really isn't a good reason to configure it.
  #
  # The criteria used are:
  # 1. We need a number that's less than 100MiB because ES
  #    won't accept bulks larger than that.
  # 2. It must be large enough to amortize the connection constant
  #    across multiple requests.
  # 3. It must be small enough that even if multiple threads hit this size
  #    we won't use a lot of heap.
  #
  # We wound up agreeing that a number greater than 10 MiB and less than 100MiB
  # made sense. We picked one on the lowish side to not use too much heap.
  TARGET_BULK_BYTES = 20 * 1024 * 1024 # 20MiB

  class HttpClient
    attr_reader :client, :options, :logger, :pool, :action_count, :recv_count
    # This is here in case we use DEFAULT_OPTIONS in the future
    # DEFAULT_OPTIONS = {
    #   :setting => value
    # }

#
    # The `options` is a hash where the following symbol keys have meaning:
    #
    # * `:hosts` - array of String. Set a list of hosts to use for communication.
    # * `:port` - number. set the port to use to communicate with Elasticsearch
    # * `:user` - String. The user to use for authentication.
    # * `:password` - String. The password to use for authentication.
    # * `:timeout` - Float. A duration value, in seconds, after which a socket
    #    operation or request will be aborted if not yet successfull
    # * `:client_settings` - a hash; see below for keys.
    #
    # The `client_settings` key is a has that can contain other settings:
    #
    # * `:ssl` - Boolean. Enable or disable SSL/TLS.
    # * `:proxy` - String. Choose a HTTP HTTProxy to use.
    # * `:path` - String. The leading path for prefixing Elasticsearch
    # * `:headers` - Hash. Pairs of headers and their values
    #   requests. This is sometimes used if you are proxying Elasticsearch access
    #   through a special http path, such as using mod_rewrite.
    def initialize(options={})
      @logger = options[:logger]
      @metric = options[:metric]
      @bulk_request_metrics = @metric.namespace(:bulk_requests)
      @bulk_response_metrics = @bulk_request_metrics.namespace(:responses)

      # Again, in case we use DEFAULT_OPTIONS in the future, uncomment this.
      # @options = DEFAULT_OPTIONS.merge(options)
      @options = options

      @url_template = build_url_template

      @pool = build_pool(@options)
      # mutex to prevent requests and sniffing to access the
      # connection pool at the same time
      @bulk_path = @options[:bulk_path]
    end

    def build_url_template
      {
        :scheme => self.scheme,
        :user => self.user,
        :password => self.password,
        :host => "URLTEMPLATE",
        :port => self.port,
        :path => self.path
      }
    end

    def template_install(name, template, force=false)
      if template_exists?(name) && !force
        @logger.debug("Found existing Elasticsearch template. Skipping template management", :name => name)
        return
      end
      template_put(name, template)
    end

    def maximum_seen_major_version
      @pool.maximum_seen_major_version
    end

    def bulk(actions)
      @action_count ||= 0
      @action_count += actions.size

      return if actions.empty?

      bulk_actions = actions.collect do |action, args, source|
        args, source = update_action_builder(args, source) if action == 'update'

        if source && action != 'delete'
          next [ { action => args }, source ]
        else
          next { action => args }
        end
      end

      body_stream = StringIO.new
      if http_compression
        body_stream.set_encoding "BINARY"
        stream_writer = Zlib::GzipWriter.new(body_stream, Zlib::DEFAULT_COMPRESSION, Zlib::DEFAULT_STRATEGY)
      else 
        stream_writer = body_stream
      end
      bulk_responses = []
      bulk_actions.each do |action|
        as_json = action.is_a?(Array) ?
                    action.map {|line| LogStash::Json.dump(line)}.join("\n") :
                    LogStash::Json.dump(action)
        as_json << "\n"
        if (body_stream.size + as_json.bytesize) > TARGET_BULK_BYTES
          bulk_responses << bulk_send(body_stream) unless body_stream.size == 0
        end
        stream_writer.write(as_json)
      end
      stream_writer.close if http_compression
      bulk_responses << bulk_send(body_stream) if body_stream.size > 0
      body_stream.close if !http_compression
      join_bulk_responses(bulk_responses)
    end

    def join_bulk_responses(bulk_responses)
      {
        "errors" => bulk_responses.any? {|r| r["errors"] == true},
        "items" => bulk_responses.reduce([]) {|m,r| m.concat(r.fetch("items", []))}
      }
    end

    def bulk_send(body_stream)
      params = http_compression ? {:headers => {"Content-Encoding" => "gzip"}} : {}
      # Discard the URL
      response = @pool.post(@bulk_path, params, body_stream.string)
      if !body_stream.closed?
        body_stream.truncate(0)
        body_stream.seek(0)
      end

      @bulk_response_metrics.increment(response.code.to_s)

      if response.code != 200
        url = ::LogStash::Util::SafeURI.new(response.final_url)
        raise ::LogStash::Outputs::ElasticSearch::HttpClient::Pool::BadResponseCodeError.new(
          response.code, url, body_stream.to_s, response.body
        )
      end

      LogStash::Json.load(response.body)
    end

    def get(path)
      response = @pool.get(path, nil)
      LogStash::Json.load(response.body)
    end

    def post(path, params = {}, body_string)
      response = @pool.post(path, params, body_string)
      LogStash::Json.load(response.body)
    end

    def close
      @pool.close
    end

    def calculate_property(uris, property, default, sniff_check)
      values = uris.map(&property).uniq

      if sniff_check && values.size > 1
        raise LogStash::ConfigurationError, "Cannot have multiple values for #{property} in hosts when sniffing is enabled!"
      end

      uri_value = values.first

      default = nil if default.is_a?(String) && default.empty? # Blanks are as good as nil
      uri_value = nil if uri_value.is_a?(String) && uri_value.empty?

      if default && uri_value && (default != uri_value)
        raise LogStash::ConfigurationError, "Explicit value for '#{property}' was declared, but it is different in one of the URLs given! Please make sure your URLs are inline with explicit values. The URLs have the property set to '#{uri_value}', but it was also set to '#{default}' explicitly"
      end

      uri_value || default
    end

    def sniffing
      @options[:sniffing]
    end

    def user
      calculate_property(uris, :user, @options[:user], sniffing)
    end

    def password
      calculate_property(uris, :password, @options[:password], sniffing)
    end

    def path
      calculated = calculate_property(uris, :path, client_settings[:path], sniffing)
      calculated = "/#{calculated}" if calculated && !calculated.start_with?("/")
      calculated
    end

    def scheme
      explicit_scheme = if ssl_options && ssl_options.has_key?(:enabled)
                          ssl_options[:enabled] ? 'https' : 'http'
                        else
                          nil
                        end
      
      calculated_scheme = calculate_property(uris, :scheme, explicit_scheme, sniffing)

      if calculated_scheme && calculated_scheme !~ /https?/
        raise LogStash::ConfigurationError, "Bad scheme '#{calculated_scheme}' found should be one of http/https"
      end

      if calculated_scheme && explicit_scheme && calculated_scheme != explicit_scheme
        raise LogStash::ConfigurationError, "SSL option was explicitly set to #{ssl_options[:enabled]} but a URL was also declared with a scheme of '#{explicit_scheme}'. Please reconcile this"
      end

      calculated_scheme # May be nil if explicit_scheme is nil!
    end

    def port
      # We don't set the 'default' here because the default is what the user
      # indicated, so we use an || outside of calculate_property. This lets people
      # Enter things like foo:123, bar and wind up with foo:123, bar:9200
      calculate_property(uris, :port, nil, sniffing) || 9200
    end
    
    def uris
      @options[:hosts]
    end

    def client_settings
      @options[:client_settings] || {}
    end

    def ssl_options
      client_settings.fetch(:ssl, {})
    end

    def http_compression
      client_settings.fetch(:http_compression, false)
    end

    def build_adapter(options)
      timeout = options[:timeout] || 0
      
      adapter_options = {
        :socket_timeout => timeout,
        :request_timeout => timeout,
      }

      adapter_options[:proxy] = client_settings[:proxy] if client_settings[:proxy]

      adapter_options[:check_connection_timeout] = client_settings[:check_connection_timeout] if client_settings[:check_connection_timeout]

      # Having this explicitly set to nil is an error
      if client_settings[:pool_max]
        adapter_options[:pool_max] = client_settings[:pool_max]
      end

      # Having this explicitly set to nil is an error
      if client_settings[:pool_max_per_route]
        adapter_options[:pool_max_per_route] = client_settings[:pool_max_per_route]
      end

      adapter_options[:ssl] = ssl_options if self.scheme == 'https'

      adapter_options[:headers] = client_settings[:headers] if client_settings[:headers]

      adapter_class = ::LogStash::Outputs::ElasticSearch::HttpClient::ManticoreAdapter
      adapter = adapter_class.new(@logger, adapter_options)
    end
    
    def build_pool(options)
      adapter = build_adapter(options)

      pool_options = {
        :sniffing => sniffing,
        :sniffer_delay => options[:sniffer_delay],
        :sniffing_path => options[:sniffing_path],
        :healthcheck_path => options[:healthcheck_path],
        :resurrect_delay => options[:resurrect_delay],
        :url_normalizer => self.method(:host_to_url),
        :metric => options[:metric]
      }
      pool_options[:scheme] = self.scheme if self.scheme

      pool_class = ::LogStash::Outputs::ElasticSearch::HttpClient::Pool
      full_urls = @options[:hosts].map {|h| host_to_url(h) }
      pool = pool_class.new(@logger, adapter, full_urls, pool_options)
      pool.start
      pool
    end

    def host_to_url(h)
      # Never override the calculated scheme
      raw_scheme = @url_template[:scheme] || 'http'

      raw_user = h.user || @url_template[:user]
      raw_password = h.password || @url_template[:password]
      postfixed_userinfo = raw_user && raw_password ? "#{raw_user}:#{raw_password}@" : nil

      raw_host = h.host # Always replace this!
      raw_port =  h.port || @url_template[:port]

      raw_path = !h.path.nil? && !h.path.empty? &&  h.path != "/" ? h.path : @url_template[:path]
      prefixed_raw_path = raw_path && !raw_path.empty? ? raw_path : "/"

      parameters = client_settings[:parameters]
      raw_query = if parameters && !parameters.empty?
                    combined = h.query ?
                      Hash[URI::decode_www_form(h.query)].merge(parameters) :
                      parameters
                    query_str = combined.flat_map {|k,v|
                      values = Array(v)
                      values.map {|av| "#{k}=#{av}"}
                    }.join("&")
                    query_str
                  else
                    h.query
                  end
      prefixed_raw_query = raw_query && !raw_query.empty? ? "?#{raw_query}" : nil
      
      raw_url = "#{raw_scheme}://#{postfixed_userinfo}#{raw_host}:#{raw_port}#{prefixed_raw_path}#{prefixed_raw_query}"

      ::LogStash::Util::SafeURI.new(raw_url)
    end

    def exists?(path, use_get=false)
      response = use_get ? @pool.get(path) : @pool.head(path)
      response.code >= 200 && response.code <= 299
    end

    def template_exists?(name)
      exists?("/_template/#{name}")
    end

    def template_put(name, template)
      path = "_template/#{name}"
      logger.info("Installing elasticsearch template to #{path}")
      @pool.put(path, nil, LogStash::Json.dump(template))
    end

    # ILM methods

    # check whether rollover alias already exists
    def rollover_alias_exists?(name)
      exists?(name)
    end

    # Create a new rollover alias
    def rollover_alias_put(alias_name, alias_definition)
      logger.info("Creating rollover alias #{alias_name}")
      begin
        @pool.put(CGI::escape(alias_name), nil, LogStash::Json.dump(alias_definition))
        # If the rollover alias already exists, ignore the error that comes back from Elasticsearch
      rescue ::LogStash::Outputs::ElasticSearch::HttpClient::Pool::BadResponseCodeError => e
        if e.response_code == 400
            logger.info("Rollover Alias #{alias_name} already exists. Skipping")
            return
        end
        raise e
      end
    end

    def get_xpack_info
      get("/_xpack")
    end

    def get_ilm_endpoint
      @pool.get("/_ilm/policy")
    end

    def ilm_policy_exists?(name)
      exists?("/_ilm/policy/#{name}", true)
    end

    def ilm_policy_put(name, policy)
      path = "_ilm/policy/#{name}"
      logger.info("Installing ILM policy #{policy} to #{path}")
      @pool.put(path, nil, LogStash::Json.dump(policy))
    end


    # Build a bulk item for an elasticsearch update action
    def update_action_builder(args, source)
      if args[:_script]
        # Use the event as a hash from your script with variable name defined
        # by script_var_name (default: "event")
        # Ex: event["@timestamp"]
        source_orig = source
        source = { 'script' => {'params' => { @options[:script_var_name] => source_orig }} }
        if @options[:scripted_upsert]
          source['scripted_upsert'] = true
          source['upsert'] = {}
        elsif @options[:doc_as_upsert]
          source['upsert'] = source_orig
        else
          source['upsert'] = args.delete(:_upsert) if args[:_upsert]
        end
        case @options[:script_type]
        when 'indexed'
          source['script']['id'] = args.delete(:_script)
        when 'file'
          source['script']['file'] = args.delete(:_script)
        when 'inline'
          source['script']['inline'] = args.delete(:_script)
        end
        source['script']['lang'] = @options[:script_lang] if @options[:script_lang] != ''
      else
        source = { 'doc' => source }
        if @options[:doc_as_upsert]
          source['doc_as_upsert'] = true
        else
          source['upsert'] = args.delete(:_upsert) if args[:_upsert]
        end
      end
      [args, source]
    end
  end
end end end
