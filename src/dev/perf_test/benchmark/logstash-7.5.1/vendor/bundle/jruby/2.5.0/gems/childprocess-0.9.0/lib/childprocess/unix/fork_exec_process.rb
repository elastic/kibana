module ChildProcess
  module Unix
    class ForkExecProcess < Process
      private

      def launch_process
        if @io
          stdout = @io.stdout
          stderr = @io.stderr
        end

        # pipe used to detect exec() failure
        exec_r, exec_w = ::IO.pipe
        ChildProcess.close_on_exec exec_w

        if duplex?
          reader, writer = ::IO.pipe
        end

        @pid = Kernel.fork {
          # Children of the forked process will inherit its process group
          # This is to make sure that all grandchildren dies when this Process instance is killed
          ::Process.setpgid 0, 0 if leader?

          if @cwd
            Dir.chdir(@cwd)
          end

          exec_r.close
          set_env

          STDOUT.reopen(stdout || "/dev/null")
          STDERR.reopen(stderr || "/dev/null")

          if duplex?
            STDIN.reopen(reader)
            writer.close
          end

          executable, *args = @args

          begin
            Kernel.exec([executable, executable], *args)
          rescue SystemCallError => ex
            exec_w << ex.message
          end
        }

        exec_w.close

        if duplex?
          io._stdin = writer
          reader.close
        end

        # if we don't eventually get EOF, exec() failed
        unless exec_r.eof?
          raise LaunchError, exec_r.read || "executing command with #{@args.inspect} failed"
        end

        ::Process.detach(@pid) if detach?
      end

      def set_env
        @environment.each { |k, v| ENV[k.to_s] = v.nil? ? nil : v.to_s }
      end

    end # Process
  end # Unix
end # ChildProcess
