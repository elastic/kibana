# encoding: utf-8
class LogStash::Codecs::Base
  # TODO - move this to core
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

