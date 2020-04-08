# encoding: utf-8
module LogStash module Inputs class Beats
  # Base Transform class, expose the plugin decorate method,
  # apply the tags and make sure we copy the beat hostname into `host`
  # for backward compatibility.
  class EventTransformCommon
    def initialize(input)
      @input = input
      @logger = input.logger
    end

    # Copies the beat.hostname field into the host field unless
    # the host field is already defined
    def copy_beat_hostname(event)
      return unless @input.add_hostname
      host = event.get("[beat][hostname]")

      if host && event.get("host").nil?
        event.set("host", host)
      end
    end

    # This break the `#decorate` method visibility of the plugin base
    # class, the method is protected and we cannot access it, but well ruby
    # can let you do all the wrong thing.
    #
    # I think the correct behavior would be to allow the plugin to return a 
    # `Decorator` object that we can pass to other objects, since only the 
    # plugin know the data used to decorate. This would allow a more component
    # based workflow.
    def decorate(event)
      @input.send(:decorate, event)
    end

    def codec_name
      @codec_name ||= if @input.codec.respond_to?(:base_codec)
                        @input.codec.base_codec.class.config_name
                      else
                        @input.codec.class.config_name
                      end
    end

    def transform(event)
      copy_beat_hostname(event)
      decorate(event)
      event
    end

    def include_codec_tag?
      @input.include_codec_tag
    end
  end
end; end; end
