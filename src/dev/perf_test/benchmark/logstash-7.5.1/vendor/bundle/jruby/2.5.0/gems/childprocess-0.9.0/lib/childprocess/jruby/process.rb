require "java"

module ChildProcess
  module JRuby
    class Process < AbstractProcess
      def initialize(args)
        super(args)

        @pumps = []
      end

      def io
        @io ||= JRuby::IO.new
      end

      def exited?
        return true if @exit_code

        assert_started
        @exit_code = @process.exitValue
        stop_pumps

        true
      rescue java.lang.IllegalThreadStateException => ex
        log(ex.class => ex.message)
        false
      ensure
        log(:exit_code => @exit_code)
      end

      def stop(timeout = nil)
        assert_started

        @process.destroy
        wait # no way to actually use the timeout here..
      end

      def wait
        if exited?
          exit_code
        else
          @process.waitFor

          stop_pumps
          @exit_code = @process.exitValue
        end
      end

      #
      # Only supported in JRuby on a Unix operating system, thanks to limitations
      # in Java's classes
      #
      # @return [Integer] the pid of the process after it has started
      # @raise [NotImplementedError] when trying to access pid on non-Unix platform
      #
      def pid
        if @process.getClass.getName != "java.lang.UNIXProcess"
          raise NotImplementedError, "pid is only supported by JRuby child processes on Unix"
        end

        # About the best way we can do this is with a nasty reflection-based impl
        # Thanks to Martijn Courteaux
        # http://stackoverflow.com/questions/2950338/how-can-i-kill-a-linux-process-in-java-with-sigkill-process-destroy-does-sigter/2951193#2951193
        field = @process.getClass.getDeclaredField("pid")
        field.accessible = true
        field.get(@process)
      end

      private

      def launch_process(&blk)
        pb = java.lang.ProcessBuilder.new(@args)

        pb.directory java.io.File.new(@cwd || Dir.pwd)
        set_env pb.environment

        begin
          @process = pb.start
        rescue java.io.IOException => ex
          raise LaunchError, ex.message
        end

        setup_io
      end

      def setup_io
        if @io
          redirect(@process.getErrorStream, @io.stderr)
          redirect(@process.getInputStream, @io.stdout)
        else
          @process.getErrorStream.close
          @process.getInputStream.close
        end

        if duplex?
          io._stdin = create_stdin
        else
          @process.getOutputStream.close
        end
      end

      def redirect(input, output)
        if output.nil?
          input.close
          return
        end

        @pumps << Pump.new(input, output.to_outputstream).run
      end

      def stop_pumps
        @pumps.each { |pump| pump.stop }
      end

      def set_env(env)
        merged = ENV.to_hash

        @environment.each { |k, v| merged[k.to_s] = v }

        merged.each do |k, v|
          if v
            env.put(k, v.to_s)
          elsif env.has_key? k
            env.remove(k)
          end
        end

        removed_keys = env.key_set.to_a - merged.keys
        removed_keys.each { |k| env.remove(k) }
      end

      def create_stdin
        output_stream = @process.getOutputStream

        stdin = output_stream.to_io
        stdin.sync = true
        stdin.instance_variable_set(:@childprocess_java_stream, output_stream)

        class << stdin
          # The stream provided is a BufferedeOutputStream, so we
          # have to flush it to make the bytes flow to the process
          def __childprocess_flush__
            @childprocess_java_stream.flush
          end

          [:flush, :print, :printf, :putc, :puts, :write, :write_nonblock].each do |m|
            define_method(m) do |*args|
              super(*args)
              self.__childprocess_flush__
            end
          end
        end

        stdin
      end

    end # Process
  end # JRuby
end # ChildProcess
