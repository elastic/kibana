# encoding: utf-8
require "logstash/inputs/beats/event_transform_common"
module LogStash module Inputs class Beats
  # Take the extracted content from the codec, merged with the other data coming
  # from beats, apply the configured tags, normalize the host and try to coerce
  # the timestamp if it was provided in the hash.
  class DecodedEventTransform < EventTransformCommon
    def transform(event, hash)
      ts = coerce_ts(hash.delete("@timestamp"))

      event.set("@timestamp", ts) unless ts.nil?
      hash.each { |k, v| event.set(k, v) }
      super(event)
      event.tag("beats_input_codec_#{codec_name}_applied") if include_codec_tag?
      event
    end

    private
    def coerce_ts(ts)
      return nil if ts.nil?
      timestamp = LogStash::Timestamp.coerce(ts)

      return timestamp if timestamp

      @logger.warn("Unrecognized @timestamp value, setting current time to @timestamp",
                   :value => ts.inspect)
      return nil
    rescue LogStash::TimestampParserError => e
      @logger.warn("Error parsing @timestamp string, setting current time to @timestamp",
                   :value => ts.inspect, :exception => e.message)
      return nil
    end
  end
end; end; end
