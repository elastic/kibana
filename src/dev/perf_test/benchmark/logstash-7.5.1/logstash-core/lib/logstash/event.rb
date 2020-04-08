# encoding: utf-8

# used only in the Ruby execution engine
module LogStash
  class SignalEvent
    def flush?; raise "abstract method"; end;
    def shutdown?; raise "abstract method"; end;
  end

  class ShutdownEvent < SignalEvent
    def flush?; false; end;
    def shutdown?; true; end;
  end

  class FlushEvent < SignalEvent
    def flush?; true; end;
    def shutdown?; false; end;
  end

  class NoSignal < SignalEvent
    def flush?; false; end;
    def shutdown?; false; end;
  end

  FLUSH = FlushEvent.new
  SHUTDOWN = ShutdownEvent.new
  NO_SIGNAL = NoSignal.new
end
