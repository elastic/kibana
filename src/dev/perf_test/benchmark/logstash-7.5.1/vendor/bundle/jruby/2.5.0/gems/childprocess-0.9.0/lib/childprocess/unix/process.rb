module ChildProcess
  module Unix
    class Process < AbstractProcess
      attr_reader :pid

      def io
        @io ||= Unix::IO.new
      end

      def stop(timeout = 3)
        assert_started
        send_term

        begin
          return poll_for_exit(timeout)
        rescue TimeoutError
          # try next
        end

        send_kill
        wait
      rescue Errno::ECHILD, Errno::ESRCH
        # handle race condition where process dies between timeout
        # and send_kill
        true
      end

      def exited?
        return true if @exit_code

        assert_started
        pid, status = ::Process.waitpid2(_pid, ::Process::WNOHANG | ::Process::WUNTRACED)
        pid = nil if pid == 0 # may happen on jruby

        log(:pid => pid, :status => status)

        if pid
          set_exit_code(status)
        end

        !!pid
      rescue Errno::ECHILD
        # may be thrown for detached processes
        true
      end

      def wait
        assert_started

        if exited?
          exit_code
        else
          _, status = ::Process.waitpid2 _pid
          set_exit_code(status)
        end
      end

      private

      def send_term
        send_signal 'TERM'
      end

      def send_kill
        send_signal 'KILL'
      end

      def send_signal(sig)
        assert_started

        log "sending #{sig}"
        ::Process.kill sig, _pid
      end

      def set_exit_code(status)
        @exit_code = status.exitstatus || status.termsig
      end

      def _pid
        if leader?
          -@pid # negative pid == process group
        else
          @pid
        end
      end

    end # Process
  end # Unix
end # ChildProcess
