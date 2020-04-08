# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"
require "logstash/json"
require "logstash/timestamp"

# This is a JSON parsing filter. It takes an existing field which contains JSON and
# expands it into an actual data structure within the Logstash event.
#
# By default it will place the parsed JSON in the root (top level) of the Logstash event, but this
# filter can be configured to place the JSON into any arbitrary event field, using the
# `target` configuration.
# 
# This plugin has a few fallback scenario when something bad happen during the parsing of the event.
# If the JSON parsing fails on the data, the event will be untouched and it will be tagged with a
# `_jsonparsefailure` then you can use conditionals to clean the data. You can configured this tag with then
# `tag_on_failure` option.
#
# If the parsed data contains a `@timestamp` field, we will try to use it for the event's `@timestamp`, if the
# parsing fails, the field will be renamed to `_@timestamp` and the event will be tagged with a
# `_timestampparsefailure`.
class LogStash::Filters::Json < LogStash::Filters::Base

  config_name "json"

  # The configuration for the JSON filter:
  # [source,ruby]
  #     source => source_field
  #
  # For example, if you have JSON data in the `message` field:
  # [source,ruby]
  #     filter {
  #       json {
  #         source => "message"
  #       }
  #     }
  #
  # The above would parse the json from the `message` field
  config :source, :validate => :string, :required => true

  # Define the target field for placing the parsed data. If this setting is
  # omitted, the JSON data will be stored at the root (top level) of the event.
  #
  # For example, if you want the data to be put in the `doc` field:
  # [source,ruby]
  #     filter {
  #       json {
  #         target => "doc"
  #       }
  #     }
  #
  # JSON in the value of the `source` field will be expanded into a
  # data structure in the `target` field.
  #
  # NOTE: if the `target` field already exists, it will be overwritten!
  config :target, :validate => :string

  # Append values to the `tags` field when there has been no
  # successful match
  config :tag_on_failure, :validate => :array, :default => ["_jsonparsefailure"]

  # Allow to skip filter on invalid json (allows to handle json and non-json data without warnings)
  config :skip_on_invalid_json, :validate => :boolean, :default => false

  def register
    # Nothing to do here
  end

  def filter(event)
    @logger.debug? && @logger.debug("Running json filter", :event => event)

    source = event.get(@source)
    return unless source

    begin
      parsed = LogStash::Json.load(source)
    rescue => e
      unless @skip_on_invalid_json
        _do_tag_on_failure(event)
        @logger.warn("Error parsing json", :source => @source, :raw => source, :exception => e)
      end
      return
    end

    if @target
      event.set(@target, parsed)
    else
      unless parsed.is_a?(Hash)
        _do_tag_on_failure(event)
        @logger.warn("Parsed JSON object/hash requires a target configuration option", :source => @source, :raw => source)
        return
      end

      # TODO: (colin) the timestamp initialization should be DRY'ed but exposing the similar code
      # in the Event#init_timestamp method. See https://github.com/elastic/logstash/issues/4293

      # a) since the parsed hash will be set in the event root, first extract any @timestamp field to properly initialized it
      parsed_timestamp = parsed.delete(LogStash::Event::TIMESTAMP)
      begin
        timestamp = parsed_timestamp ? LogStash::Timestamp.coerce(parsed_timestamp) : nil
      rescue LogStash::TimestampParserError => e
        timestamp = nil
      end

      # b) then set all parsed fields in the event
      parsed.each{|k, v| event.set(k, v)}

      # c) finally re-inject proper @timestamp
      if parsed_timestamp
        if timestamp
          event.timestamp = timestamp
        else
          event.timestamp = LogStash::Timestamp.new
          @logger.warn("Unrecognized #{LogStash::Event::TIMESTAMP} value, setting current time to #{LogStash::Event::TIMESTAMP}, original in #{LogStash::Event::TIMESTAMP_FAILURE_FIELD} field", :value => parsed_timestamp.inspect)
          event.tag(LogStash::Event::TIMESTAMP_FAILURE_TAG)
          event.set(LogStash::Event::TIMESTAMP_FAILURE_FIELD, parsed_timestamp.to_s)
        end
      end
    end

    filter_matched(event)

    @logger.debug? && @logger.debug("Event after json filter", :event => event)
  rescue => ex
    meta = { :exception => ex.message, :source => @source, :raw => source}
    meta[:backtrace] = ex.backtrace if logger.debug?
    logger.warn('Exception caught in json filter', meta)
    _do_tag_on_failure(event)
  end

  def _do_tag_on_failure(event)
    @tag_on_failure.each { |tag| event.tag(tag) }
  end
end
