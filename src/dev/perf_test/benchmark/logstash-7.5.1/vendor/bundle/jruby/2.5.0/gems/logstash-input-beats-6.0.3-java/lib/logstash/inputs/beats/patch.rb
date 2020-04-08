# encoding: utf-8
class LogStash::Codecs::Base
  # This monkey patch add callback based
  # flow to the codec until its shipped with core.
  # This give greater flexibility to the implementation by
  # sending more data to the actual block.
  if !method_defined?(:accept)
    def accept(listener)
      decode(listener.data) do |event|
        listener.process_event(event)
      end
    end
  end
  if !method_defined?(:auto_flush)
    def auto_flush(*)
    end
  end
end

