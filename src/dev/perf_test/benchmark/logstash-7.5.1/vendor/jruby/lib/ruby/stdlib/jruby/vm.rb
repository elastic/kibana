require 'java'
require 'jruby'

module JRuby
  class VM
    class << self
      def stats
        raise NotImplementedError
      end

      def load_library(path, name)
        raise NotImplementedError
      end

      def reset_method_cache(sym)
        raise NotImplementedError
      end

      def save_encloser_path
        raise NotImplementedError
      end

      def restore_encloser_path
        raise NotImplementedError
      end

      def coerce_to_array(object)
        raise NotImplementedError
      end

      # Semantics of this are very important. ret MUST be returned.
      def perform_hook(obj, meth, arg, ret)
        raise NotImplementedError
      end

      def join(id)
        MAP[id].join
      end

      def poll_message
        CURRENT.queue.poll
      end

      def send_message(id, obj)
        MAP[id].send(obj)
      end

      def spawn(*args)
        new_vm = ChildVM.new(args)
        MAP[new_vm.id] = new_vm
      end

      def get_message
        CURRENT.queue.take
      end

      def each_message
        while true
          yield get_message
        end
      end
    end

    attr_reader :id
    attr_reader :main
    attr_reader :queue

    def send(obj)
      case obj
      when String
        @queue.put obj
      when Fixnum
        @queue.put obj
      end
    end

    def join
      @main.join
    end

    def <<(obj)
      send obj
    end
  end
  
  java_import java.util.concurrent.LinkedBlockingQueue
  java_import java.util.HashMap  

  class ChildVM < VM
    JThread = java.lang.Thread
    Runnable = java.lang.Runnable
    java_import org.jruby.RubyInstanceConfig
    java_import org.jruby.Ruby
    java_import org.jruby.RubyIO
    java_import java.nio.channels.Pipe
    java_import java.nio.channels.Channels
    java_import java.io.PrintStream
    
    attr_reader :stdin
    attr_reader :stdout
    attr_reader :stderr

    def initialize(args)
      @config = RubyInstanceConfig.new
      inpipe = Pipe.open
      outpipe = Pipe.open
      errpipe = Pipe.open

      @config.input = Channels.new_input_stream inpipe.source
      @config.output = PrintStream.new(Channels.new_output_stream outpipe.sink)
      @config.error = PrintStream.new(Channels.new_output_stream errpipe.sink)

      @stdin = RubyIO.newIO(JRuby.runtime, inpipe.sink)
      @stdout = RubyIO.newIO(JRuby.runtime, outpipe.source)
      @stderr = RubyIO.newIO(JRuby.runtime, errpipe.source)

      # stdin should not be buffered, immediately write to pipe
      @stdin.sync = true

      @config.process_arguments(args.to_java :string)

      @id = hash

      # set up queue
      @queue = LinkedBlockingQueue.new
    end

    def start
      if @started
        raise RuntimeError, "already started VM"
      end

      # Create the main thread for the child VM
      @main = JThread.new do
        begin
          @runtime = Ruby.new_instance(@config)
          @runtime.load_service.require('jruby/vm')
          vm_class = JRuby.reference(@runtime.get_class_from_path("JRuby::VM"))
          vm_class.set_constant("CURRENT", self)
          vm_class.set_constant("MAP", JRuby.reference(MAP))

          script = @config.script_source
          filename = @config.displayed_file_name
          @runtime.run_from_main(script, filename)

          # shut down the streams
          @config.input.close
          @config.output.close
          @config.error.close
        rescue Exception => e
          e.printStackTrace
        end
      end

      @main.start
      @started = true
    end

    def send(obj)
      _check_started
      super
    end

    def join
      _check_started
      super
    end

    def <<(obj)
      _check_started
      super
    end

    private
    def _check_started
      raise RuntimeError, "child VM not started" unless @started
    end
  end
  
  class MainVM < VM
    def initialize()
      # set up queue
      @queue = LinkedBlockingQueue.new
      @main = JRuby.runtime.thread_service.main_thread
    end
  end
  
  VM_ID = JRuby.runtime.hashCode
  CURRENT = MainVM.new
  MAP ||= HashMap.new
  MAP[VM_ID] = CURRENT
end