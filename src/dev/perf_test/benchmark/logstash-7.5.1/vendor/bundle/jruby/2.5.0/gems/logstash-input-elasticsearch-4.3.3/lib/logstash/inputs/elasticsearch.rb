# encoding: utf-8
require "logstash/inputs/base"
require "logstash/namespace"
require "logstash/json"
require "base64"

# .Compatibility Note
# [NOTE]
# ================================================================================
# Starting with Elasticsearch 5.3, there's an {ref}modules-http.html[HTTP setting]
# called `http.content_type.required`. If this option is set to `true`, and you
# are using Logstash 2.4 through 5.2, you need to update the Elasticsearch input
# plugin to version 4.0.2 or higher.
# 
# ================================================================================
# 
# Read from an Elasticsearch cluster, based on search query results.
# This is useful for replaying test logs, reindexing, etc.
# It also supports periodically scheduling lookup enrichments
# using a cron syntax (see `schedule` setting).
#
# Example:
# [source,ruby]
#     input {
#       # Read all documents from Elasticsearch matching the given query
#       elasticsearch {
#         hosts => "localhost"
#         query => '{ "query": { "match": { "statuscode": 200 } }, "sort": [ "_doc" ] }'
#       }
#     }
#
# This would create an Elasticsearch query with the following format:
# [source,json]
#     curl 'http://localhost:9200/logstash-*/_search?&scroll=1m&size=1000' -d '{
#       "query": {
#         "match": {
#           "statuscode": 200
#         }
#       },
#       "sort": [ "_doc" ]
#     }'
#
# ==== Scheduling
#
# Input from this plugin can be scheduled to run periodically according to a specific
# schedule. This scheduling syntax is powered by https://github.com/jmettraux/rufus-scheduler[rufus-scheduler].
# The syntax is cron-like with some extensions specific to Rufus (e.g. timezone support ).
#
# Examples:
#
# |==========================================================
# | `* 5 * 1-3 *`               | will execute every minute of 5am every day of January through March.
# | `0 * * * *`                 | will execute on the 0th minute of every hour every day.
# | `0 6 * * * America/Chicago` | will execute at 6:00am (UTC/GMT -5) every day.
# |==========================================================
#
#
# Further documentation describing this syntax can be found https://github.com/jmettraux/rufus-scheduler#parsing-cronlines-and-time-strings[here].
#
#
class LogStash::Inputs::Elasticsearch < LogStash::Inputs::Base
  config_name "elasticsearch"

  default :codec, "json"

  # List of elasticsearch hosts to use for querying.
  # Each host can be either IP, HOST, IP:port or HOST:port.
  # Port defaults to 9200
  config :hosts, :validate => :array

  # The index or alias to search.
  config :index, :validate => :string, :default => "logstash-*"

  # The query to be executed. Read the Elasticsearch query DSL documentation
  # for more info
  # https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html
  config :query, :validate => :string, :default => '{ "sort": [ "_doc" ] }'

  # This allows you to set the maximum number of hits returned per scroll.
  config :size, :validate => :number, :default => 1000

  # This parameter controls the keepalive time in seconds of the scrolling
  # request and initiates the scrolling process. The timeout applies per
  # round trip (i.e. between the previous scroll request, to the next).
  config :scroll, :validate => :string, :default => "1m"

  # This parameter controls the number of parallel slices to be consumed simultaneously
  # by this pipeline input.
  config :slices, :validate => :number

  # If set, include Elasticsearch document information such as index, type, and
  # the id in the event.
  #
  # It might be important to note, with regards to metadata, that if you're
  # ingesting documents with the intent to re-index them (or just update them)
  # that the `action` option in the elasticsearch output wants to know how to
  # handle those things. It can be dynamically assigned with a field
  # added to the metadata.
  #
  # Example
  # [source, ruby]
  #     input {
  #       elasticsearch {
  #         hosts => "es.production.mysite.org"
  #         index => "mydata-2018.09.*"
  #         query => "*"
  #         size => 500
  #         scroll => "5m"
  #         docinfo => true
  #       }
  #     }
  #     output {
  #       elasticsearch {
  #         index => "copy-of-production.%{[@metadata][_index]}"
  #         document_type => "%{[@metadata][_type]}"
  #         document_id => "%{[@metadata][_id]}"
  #       }
  #     }
  #
  config :docinfo, :validate => :boolean, :default => false

  # Where to move the Elasticsearch document information. By default we use the @metadata field.
  config :docinfo_target, :validate=> :string, :default => LogStash::Event::METADATA

  # List of document metadata to move to the `docinfo_target` field.
  # To learn more about Elasticsearch metadata fields read
  # http://www.elasticsearch.org/guide/en/elasticsearch/guide/current/_document_metadata.html
  config :docinfo_fields, :validate => :array, :default => ['_index', '_type', '_id']

  # Basic Auth - username
  config :user, :validate => :string

  # Basic Auth - password
  config :password, :validate => :password

  # SSL
  config :ssl, :validate => :boolean, :default => false

  # SSL Certificate Authority file in PEM encoded format, must also include any chain certificates as necessary 
  config :ca_file, :validate => :path

  # Schedule of when to periodically run statement, in Cron format
  # for example: "* * * * *" (execute query every minute, on the minute)
  #
  # There is no schedule by default. If no schedule is given, then the statement is run
  # exactly once.
  config :schedule, :validate => :string

  def register
    require "elasticsearch"
    require "rufus/scheduler"

    @options = {
      :index => @index,
      :scroll => @scroll,
      :size => @size
    }
    @base_query = LogStash::Json.load(@query)
    if @slices
      @base_query.include?('slice') && fail(LogStash::ConfigurationError, "Elasticsearch Input Plugin's `query` option cannot specify specific `slice` when configured to manage parallel slices with `slices` option")
      @slices < 1 && fail(LogStash::ConfigurationError, "Elasticsearch Input Plugin's `slices` option must be greater than zero, got `#{@slices}`")
    end

    transport_options = {}

    if @user && @password
      token = Base64.strict_encode64("#{@user}:#{@password.value}")
      transport_options[:headers] = { :Authorization => "Basic #{token}" }
    end

    hosts = if @ssl then
      @hosts.map do |h|
        host, port = h.split(":")
        { :host => host, :scheme => 'https', :port => port }
      end
    else
      @hosts
    end

    if @ssl && @ca_file
      transport_options[:ssl] = { :ca_file => @ca_file }
    end

    @client = Elasticsearch::Client.new(:hosts => hosts, :transport_options => transport_options)
  end


  def run(output_queue)
    if @schedule
      @scheduler = Rufus::Scheduler.new(:max_work_threads => 1)
      @scheduler.cron @schedule do
        do_run(output_queue)
      end

      @scheduler.join
    else
      do_run(output_queue)
    end
  end

  def stop
    @scheduler.stop if @scheduler
  end

  private

  def do_run(output_queue)
    # if configured to run a single slice, don't bother spinning up threads
    return do_run_slice(output_queue) if @slices.nil? || @slices <= 1

    logger.warn("managed slices for query is very large (#{@slices}); consider reducing") if @slices > 8

    @slices.times.map do |slice_id|
      Thread.new do
        LogStash::Util::set_thread_name("#{@id}_slice_#{slice_id}")
        do_run_slice(output_queue, slice_id)
      end
    end.map(&:join)
  end

  def do_run_slice(output_queue, slice_id=nil)
    slice_query = @base_query
    slice_query = slice_query.merge('slice' => { 'id' => slice_id, 'max' => @slices}) unless slice_id.nil?

    slice_options = @options.merge(:body => LogStash::Json.dump(slice_query) )

    logger.info("Slice starting", slice_id: slice_id, slices: @slices) unless slice_id.nil?
    r = search_request(slice_options)

    r['hits']['hits'].each { |hit| push_hit(hit, output_queue) }
    logger.debug("Slice progress", slice_id: slice_id, slices: @slices) unless slice_id.nil?

    has_hits = r['hits']['hits'].any?

    while has_hits && r['_scroll_id'] && !stop?
      r = process_next_scroll(output_queue, r['_scroll_id'])
      logger.debug("Slice progress", slice_id: slice_id, slices: @slices) unless slice_id.nil?
      has_hits = r['has_hits']
    end
    logger.info("Slice complete", slice_id: slice_id, slices: @slices) unless slice_id.nil?
  end

  def process_next_scroll(output_queue, scroll_id)
    r = scroll_request(scroll_id)
    r['hits']['hits'].each { |hit| push_hit(hit, output_queue) }
    {'has_hits' => r['hits']['hits'].any?, '_scroll_id' => r['_scroll_id']}
  end

  def push_hit(hit, output_queue)
    event = LogStash::Event.new(hit['_source'])

    if @docinfo
      # do not assume event[@docinfo_target] to be in-place updatable. first get it, update it, then at the end set it in the event.
      docinfo_target = event.get(@docinfo_target) || {}

      unless docinfo_target.is_a?(Hash)
        @logger.error("Elasticsearch Input: Incompatible Event, incompatible type for the docinfo_target=#{@docinfo_target} field in the `_source` document, expected a hash got:", :docinfo_target_type => docinfo_target.class, :event => event)

        # TODO: (colin) I am not sure raising is a good strategy here?
        raise Exception.new("Elasticsearch input: incompatible event")
      end

      @docinfo_fields.each do |field|
        docinfo_target[field] = hit[field]
      end

      event.set(@docinfo_target, docinfo_target)
    end

    decorate(event)

    output_queue << event
  end

  def scroll_request scroll_id
    @client.scroll(:body => { :scroll_id => scroll_id }, :scroll => @scroll)
  end

  def search_request(options)
    @client.search(options)
  end
end
