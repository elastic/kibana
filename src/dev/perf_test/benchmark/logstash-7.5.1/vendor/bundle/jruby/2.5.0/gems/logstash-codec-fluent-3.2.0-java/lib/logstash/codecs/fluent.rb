# encoding: utf-8
require "logstash/codecs/base"
require "logstash/util/charset"
require "logstash/timestamp"
require "logstash/util"

# This codec handles fluentd's msgpack schema.
#
# For example, you can receive logs from `fluent-logger-ruby` with:
# [source,ruby]
#     input {
#       tcp {
#         codec => fluent
#         port => 4000
#       }
#     }
#
# And from your ruby code in your own application:
# [source,ruby]
#     logger = Fluent::Logger::FluentLogger.new(nil, :host => "example.log", :port => 4000)
#     logger.post("some_tag", { "your" => "data", "here" => "yay!" })
#
# Notes:
#
# * the fluent uses a second-precision time for events, so you will never see
#   subsecond precision on events processed by this codec.
#
class LogStash::Codecs::Fluent < LogStash::Codecs::Base
  config_name "fluent"

  def register
    require "msgpack"
    @decoder = MessagePack::Unpacker.new
  end

  def decode(data, &block)
    @decoder.feed_each(data) do |item|
      decode_event(item, &block)
    end
  end # def decode

  def encode(event)
    # Ensure tag to "tag1.tag2.tag3" style string.
    # Fluentd cannot handle Array class value in forward protocol's tag.
    tag = forwardable_tag(event)
    epochtime = event.timestamp.to_i

    # use normalize to make sure returned Hash is pure Ruby for
    # MessagePack#pack which relies on pure Ruby object recognition
    data = LogStash::Util.normalize(event.to_hash)
    # timestamp is serialized as a iso8601 string
    # merge to avoid modifying data which could have side effects if multiple outputs
    @on_event.call(event, MessagePack.pack([tag, epochtime, data.merge(LogStash::Event::TIMESTAMP => event.timestamp.to_iso8601)]))
  end # def encode

  def forwardable_tag(event)
    tag = event.get("tags") || "log"
    case tag
    when Array
      tag.join('.')
    when String
      tag
    else
      tag.to_s
    end
  end

  private

  def decode_event(data, &block)
    tag = data[0]
    entries = data[1]

    case entries
    when String
      # PackedForward
      option = data[2]
      compressed = (option && option['compressed'] == 'gzip')
      if compressed
        raise(LogStash::Error, "PackedForward with compression is not supported")
      end

      entries_decoder = MessagePack::Unpacker.new
      entries_decoder.feed_each(entries) do |entry|
        epochtime = entry[0]
        map = entry[1]
        event = LogStash::Event.new(map.merge(
                                      LogStash::Event::TIMESTAMP => LogStash::Timestamp.at(epochtime),
                                      "tags" => [ tag ]
                                    ))
        yield event
      end
    when Array
      # Forward
      entries.each do |entry|
        epochtime = entry[0]
        map = entry[1]
        event = LogStash::Event.new(map.merge(
                                      LogStash::Event::TIMESTAMP => LogStash::Timestamp.at(epochtime),
                                      "tags" => [ tag ]
                                    ))
        yield event
      end
    when Fixnum
      # Message
      epochtime = entries
      map = data[2]
      event = LogStash::Event.new(map.merge(
                                    LogStash::Event::TIMESTAMP => LogStash::Timestamp.at(epochtime),
                                    "tags" => [ tag ]
                                  ))
      yield event
    else
      raise(LogStash::Error, "Unknown event type")
    end
  rescue StandardError => e
    @logger.error("Fluent parse error, original data now in message field", :error => e, :data => data)
    yield LogStash::Event.new("message" => data, "tags" => [ "_fluentparsefailure" ])
  end

end # class LogStash::Codecs::Fluent
