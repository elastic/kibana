# encoding: utf-8
require "logstash/codecs/base"
require "logstash/codecs/line"
require "logstash/json"

# This codec will decode the http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/docs-bulk.html[Elasticsearch bulk format]
# into individual events, plus metadata into the `@metadata` field.
#
# Encoding is not supported at this time as the Elasticsearch
# output submits Logstash events in bulk format.
class LogStash::Codecs::ESBulk < LogStash::Codecs::Base
  config_name "es_bulk"

  public
  def initialize(params={})
    super(params)
    @lines = LogStash::Codecs::Line.new
    @lines.charset = "UTF-8"
    @state = :initial
    @metadata = Hash.new
  end

  public
  def decode(data)
    @lines.decode(data) do |bulk|
      begin
        line = LogStash::Json.load(bulk.get("message"))
        case @state
        when :metadata
          event = LogStash::Event.new(line)
          event.set("@metadata", @metadata)
          yield event
          @state = :initial
        when :initial
          @metadata = line[line.keys[0]]
          @metadata["action"] = line.keys[0].to_s
          @state = :metadata
          if line.keys[0] == 'delete'
            event = LogStash::Event.new()
            event.set("@metadata", @metadata)
            yield event
            @state = :initial
          end
        end
      rescue LogStash::Json::ParserError => e
        @logger.error("JSON parse failure. ES Bulk messages must in be UTF-8 JSON", :error => e, :data => data)
      end
    end
  end # def decode

end # class LogStash::Codecs::ESBulk
