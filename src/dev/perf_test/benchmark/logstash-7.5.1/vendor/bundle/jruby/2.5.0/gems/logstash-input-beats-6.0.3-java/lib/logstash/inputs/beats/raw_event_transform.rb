# encoding: utf-8
require "logstash/inputs/beats/event_transform_common"
module LogStash module Inputs class Beats
  # Take the the raw output from the library, decorate it with
  # the configured tags in the plugins and normalize the hostname
  # for backward compatibility
  #
  #
  # @see [Lumberjack::Beats::Parser]
  #
  class RawEventTransform < EventTransformCommon
    def transform(event)
      super(event)
      event.tag("beats_input_raw_event") if include_codec_tag?
      event
    end
  end
end; end;end
