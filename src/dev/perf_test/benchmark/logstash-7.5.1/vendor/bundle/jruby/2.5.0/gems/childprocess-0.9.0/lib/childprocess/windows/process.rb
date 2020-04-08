module ChildProcess
  module Windows
    class Process < AbstractProcess

      attr_reader :pid

      def io
        @io ||= Windows::IO.new
      end

      def stop(timeout = 3)
        assert_started

        log "sending KILL"
        @handle.send(WIN_SIGKILL)

        poll_for_exit(timeout)
      ensure
        close_handle
        close_job_if_necessary
      end

      def wait
        if exited?
          exit_code
        else
          @handle.wait
          @exit_code = @handle.exit_code

          close_handle
          close_job_if_necessary

          @exit_code
        end
      end

      def exited?
        return true if @exit_code
        assert_started

        code   = @handle.exit_code
        exited = code != PROCESS_STILL_ACTIVE

        log(:exited? => exited, :code => code)

        if exited
          @exit_code = code
          close_handle
          close_job_if_necessary
        end

        exited
      end

      private

      def launch_process
        builder = ProcessBuilder.new(@args)
        builder.leader      = leader?
        builder.detach      = detach?
        builder.duplex      = duplex?
        builder.environment = @environment unless @environment.empty?
        builder.cwd         = @cwd

        if @io
          builder.stdout      = @io.stdout
          builder.stderr      = @io.stderr
        end

        @pid = builder.start
        @handle = Handle.open @pid

        if leader?
          @job = Job.new
          @job << @handle
        end

        if duplex?
          raise Error, "no stdin stream" unless builder.stdin
          io._stdin = builder.stdin
        end

        self
      end

      def close_handle
        @handle.close
      end

      def close_job_if_necessary
        @job.close if leader?
      end


      class Job
        def initialize
          @pointer = Lib.create_job_object(nil, nil)

          if @pointer.nil? || @pointer.null?
            raise Error, "unable to create job object"
          end

          basic = JobObjectBasicLimitInformation.new
          basic[:LimitFlags] = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_BREAKAWAY_OK

          extended = JobObjectExtendedLimitInformation.new
          extended[:BasicLimitInformation] = basic

          ret = Lib.set_information_job_object(
            @pointer,
            JOB_OBJECT_EXTENDED_LIMIT_INFORMATION,
            extended,
            extended.size
          )

          Lib.check_error ret
        end

        def <<(handle)
          Lib.check_error Lib.assign_process_to_job_object(@pointer, handle.pointer)
        end

        def close
          Lib.close_handle @pointer
        end
      end

    end # Process
  end # Windows
end # ChildProcess
