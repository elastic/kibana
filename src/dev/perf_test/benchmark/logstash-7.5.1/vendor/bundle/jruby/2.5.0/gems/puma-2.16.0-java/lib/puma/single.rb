require 'puma/runner'

module Puma
  class Single < Runner
    def stats
      b = @server.backlog
      r = @server.running
      %Q!{ "backlog": #{b}, "running": #{r} }!
    end

    def restart
      @server.begin_restart
    end

    def stop
      @server.stop false
    end

    def halt
      @server.halt
    end

    def stop_blocked
      log "- Gracefully stopping, waiting for requests to finish"
      @control.stop(true) if @control
      @server.stop(true)
    end

    def jruby_daemon?
      daemon? and @cli.jruby?
    end

    def run
      already_daemon = false

      if jruby_daemon?
        require 'puma/jruby_restart'

        if JRubyRestart.daemon?
          # load and bind before redirecting IO so errors show up on stdout/stderr
          load_and_bind
        end

        already_daemon = JRubyRestart.daemon_init
      end

      output_header "single"

      if jruby_daemon?
        if already_daemon
          JRubyRestart.perm_daemonize
        else
          pid = nil

          Signal.trap "SIGUSR2" do
            log "* Started new process #{pid} as daemon..."

            # Must use exit! so we don't unwind and run the ensures
            # that will be run by the new child (such as deleting the
            # pidfile)
            exit!(true)
          end

          Signal.trap "SIGCHLD" do
            log "! Error starting new process as daemon, exiting"
            exit 1
          end

          pid = @cli.jruby_daemon_start
          sleep
        end
      else
        if daemon?
          log "* Daemonizing..."
          Process.daemon(true)
          redirect_io
        end

        load_and_bind
      end

      @cli.write_state

      start_control

      @server = server = start_server

      unless daemon?
        log "Use Ctrl-C to stop"
        redirect_io
      end

      @cli.events.fire_on_booted!

      begin
        server.run.join
      rescue Interrupt
        # Swallow it
      end
    end
  end
end
