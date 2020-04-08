require 'optparse'
require 'uri'

require 'puma/server'
require 'puma/const'
require 'puma/configuration'
require 'puma/binder'
require 'puma/detect'
require 'puma/daemon_ext'
require 'puma/util'
require 'puma/single'
require 'puma/cluster'

require 'puma/commonlogger'

module Puma
  class << self
    # The CLI exports its Puma::Configuration object here to allow
    # apps to pick it up. An app needs to use it conditionally though
    # since it is not set if the app is launched via another
    # mechanism than the CLI class.
    attr_accessor :cli_config
  end

  # Handles invoke a Puma::Server in a command line style.
  #
  class CLI
    KEYS_NOT_TO_PERSIST_IN_STATE = [
      :logger, :lowlevel_error_handler,
      :before_worker_shutdown, :before_worker_boot, :before_worker_fork,
      :after_worker_boot, :before_fork, :on_restart
    ]

    # Create a new CLI object using +argv+ as the command line
    # arguments.
    #
    # +stdout+ and +stderr+ can be set to IO-like objects which
    # this object will report status on.
    #
    def initialize(argv, events=Events.stdio)
      @debug = false
      @argv = argv

      @events = events

      @status = nil
      @runner = nil

      @config = nil

      setup_options
      generate_restart_data

      @binder = Binder.new(@events)
      @binder.import_from_env
    end

    # The Binder object containing the sockets bound to.
    attr_reader :binder

    # The Configuration object used.
    attr_reader :config

    # The Hash of options used to configure puma.
    attr_reader :options

    # The Events object used to output information.
    attr_reader :events

    # Delegate +log+ to +@events+
    #
    def log(str)
      @events.log str
    end

    # Delegate +error+ to +@events+
    #
    def error(str)
      @events.error str
    end

    def debug(str)
      @events.log "- #{str}" if @options[:debug]
    end

    def clustered?
      @options[:workers] > 0
    end

    def prune_bundler?
      @options[:prune_bundler] && clustered? && !@options[:preload_app]
    end

    def jruby?
      IS_JRUBY
    end

    def windows?
      RUBY_PLATFORM =~ /mswin32|ming32/
    end

    def env
      @options[:environment] || @cli_options[:environment] || ENV['RACK_ENV'] || 'development'
    end

    def write_state
      write_pid

      path = @options[:state]
      return unless path

      state = { 'pid' => Process.pid }
      cfg = @config.dup

      KEYS_NOT_TO_PERSIST_IN_STATE.each { |k| cfg.options.delete(k) }
      state['config'] = cfg

      require 'yaml'
      File.open(path, 'w') { |f| f.write state.to_yaml }
    end

    # If configured, write the pid of the current process out
    # to a file.
    #
    def write_pid
      path = @options[:pidfile]
      return unless path

      File.open(path, 'w') { |f| f.puts Process.pid }
      cur = Process.pid
      at_exit do
        delete_pidfile if cur == Process.pid
      end
    end

    def delete_pidfile
      path = @options[:pidfile]
      File.unlink(path) if path && File.exist?(path)
    end

    def graceful_stop
      @runner.stop_blocked
      log "=== puma shutdown: #{Time.now} ==="
      log "- Goodbye!"
    end

    def jruby_daemon_start
      require 'puma/jruby_restart'
      JRubyRestart.daemon_start(@restart_dir, restart_args)
    end

    def restart!
      @options[:on_restart].each do |block|
        block.call self
      end

      if jruby?
        close_binder_listeners

        require 'puma/jruby_restart'
        JRubyRestart.chdir_exec(@restart_dir, restart_args)
      elsif windows?
        close_binder_listeners

        argv = restart_args
        Dir.chdir(@restart_dir)
        argv += [redirects] if RUBY_VERSION >= '1.9'
        Kernel.exec(*argv)
      else
        redirects = {:close_others => true}
        @binder.listeners.each_with_index do |(l, io), i|
          ENV["PUMA_INHERIT_#{i}"] = "#{io.to_i}:#{l}"
          redirects[io.to_i] = io.to_i
        end

        argv = restart_args
        Dir.chdir(@restart_dir)
        argv += [redirects] if RUBY_VERSION >= '1.9'
        Kernel.exec(*argv)
      end
    end

    # Parse the options, load the rackup, start the server and wait
    # for it to finish.
    #
    def run
      begin
        parse_options
      rescue UnsupportedOption
        exit 1
      end

      dir = @options[:directory]
      Dir.chdir(dir) if dir

      prune_bundler if prune_bundler?

      set_rack_environment

      if clustered?
        @events.formatter = Events::PidFormatter.new
        @options[:logger] = @events

        @runner = Cluster.new(self)
      else
        @runner = Single.new(self)
      end

      setup_signals
      set_process_title

      @status = :run

      @runner.run

      case @status
      when :halt
        log "* Stopping immediately!"
      when :run, :stop
        graceful_stop
      when :restart
        log "* Restarting..."
        @runner.before_restart
        restart!
      when :exit
        # nothing
      end
    end

    def stop
      @status = :stop
      @runner.stop
    end

    def restart
      @status = :restart
      @runner.restart
    end

    def reload_worker_directory
      @runner.reload_worker_directory if @runner.respond_to?(:reload_worker_directory)
    end

    def phased_restart
      unless @runner.respond_to?(:phased_restart) and @runner.phased_restart
        log "* phased-restart called but not available, restarting normally."
        return restart
      end
      true
    end

    def redirect_io
      @runner.redirect_io
    end

    def stats
      @runner.stats
    end

    def halt
      @status = :halt
      @runner.halt
    end

  private
    def title
      buffer = "puma #{Puma::Const::VERSION} (#{@options[:binds].join(',')})"
      buffer << " [#{@options[:tag]}]" if @options[:tag] && !@options[:tag].empty?
      buffer
    end

    def unsupported(str)
      @events.error(str)
      raise UnsupportedOption
    end

    def restart_args
      cmd = @options[:restart_cmd]
      if cmd
        cmd.split(' ') + @original_argv
      else
        @restart_argv
      end
    end

    def set_process_title
      Process.respond_to?(:setproctitle) ? Process.setproctitle(title) : $0 = title
    end

    def find_config
      if @cli_options[:config_file] == '-'
        @cli_options[:config_file] = nil
      else
        @cli_options[:config_file] ||= %W(config/puma/#{env}.rb config/puma.rb).find { |f| File.exist?(f) }
      end
    end

    # Build the OptionParser object to handle the available options.
    #

    def setup_options
      @cli_options = {}
      @options = {}

      @parser = OptionParser.new do |o|
        o.on "-b", "--bind URI", "URI to bind to (tcp://, unix://, ssl://)" do |arg|
          (@cli_options[:binds] ||= []) << arg
        end

        o.on "-C", "--config PATH", "Load PATH as a config file" do |arg|
          @cli_options[:config_file] = arg
        end

        o.on "--control URL", "The bind url to use for the control server",
                              "Use 'auto' to use temp unix server" do |arg|
          if arg
            @cli_options[:control_url] = arg
          elsif jruby?
            unsupported "No default url available on JRuby"
          end
        end

        o.on "--control-token TOKEN",
             "The token to use as authentication for the control server" do |arg|
          @cli_options[:control_auth_token] = arg
        end

        o.on "-d", "--daemon", "Daemonize the server into the background" do
          @cli_options[:daemon] = true
          @cli_options[:quiet] = true
        end

        o.on "--debug", "Log lowlevel debugging information" do
          @cli_options[:debug] = true
        end

        o.on "--dir DIR", "Change to DIR before starting" do |d|
          @cli_options[:directory] = d.to_s
          @cli_options[:worker_directory] = d.to_s
        end

        o.on "-e", "--environment ENVIRONMENT",
             "The environment to run the Rack app on (default development)" do |arg|
          @cli_options[:environment] = arg
        end

        o.on "-I", "--include PATH", "Specify $LOAD_PATH directories" do |arg|
          $LOAD_PATH.unshift(*arg.split(':'))
        end

        o.on "-p", "--port PORT", "Define the TCP port to bind to",
                                  "Use -b for more advanced options" do |arg|
          binds = (@cli_options[:binds] ||= [])
          binds << "tcp://#{Configuration::DefaultTCPHost}:#{arg}"
        end

        o.on "--pidfile PATH", "Use PATH as a pidfile" do |arg|
          @cli_options[:pidfile] = arg
        end

        o.on "--preload", "Preload the app. Cluster mode only" do
          @cli_options[:preload_app] = true
        end

        o.on "--prune-bundler", "Prune out the bundler env if possible" do
          @cli_options[:prune_bundler] = true
        end

        o.on "-q", "--quiet", "Quiet down the output" do
          @cli_options[:quiet] = true
        end

        o.on "-R", "--restart-cmd CMD",
             "The puma command to run during a hot restart",
             "Default: inferred" do |cmd|
          @cli_options[:restart_cmd] = cmd
        end

        o.on "-S", "--state PATH", "Where to store the state details" do |arg|
          @cli_options[:state] = arg
        end

        o.on '-t', '--threads INT', "min:max threads to use (default 0:16)" do |arg|
          min, max = arg.split(":")
          if max
            @cli_options[:min_threads] = min
            @cli_options[:max_threads] = max
          else
            @cli_options[:min_threads] = 0
            @cli_options[:max_threads] = arg
          end
        end

        o.on "--tcp-mode", "Run the app in raw TCP mode instead of HTTP mode" do
          @cli_options[:mode] = :tcp
        end

        o.on "-V", "--version", "Print the version information" do
          puts "puma version #{Puma::Const::VERSION}"
          exit 0
        end

        o.on "-w", "--workers COUNT",
                   "Activate cluster mode: How many worker processes to create" do |arg|
          @cli_options[:workers] = arg.to_i
        end

        o.on "--tag NAME", "Additional text to display in process listing" do |arg|
          @cli_options[:tag] = arg
        end

        o.on "--redirect-stdout FILE", "Redirect STDOUT to a specific file" do |arg|
          @cli_options[:redirect_stdout] = arg
        end

        o.on "--redirect-stderr FILE", "Redirect STDERR to a specific file" do |arg|
          @cli_options[:redirect_stderr] = arg
        end

        o.on "--[no-]redirect-append", "Append to redirected files" do |val|
          @cli_options[:redirect_append] = val
        end

        o.banner = "puma <options> <rackup file>"

        o.on_tail "-h", "--help", "Show help" do
          log o
          exit 0
        end
      end
    end

    def generate_restart_data
      # Use the same trick as unicorn, namely favor PWD because
      # it will contain an unresolved symlink, useful for when
      # the pwd is /data/releases/current.
      if dir = ENV['PWD']
        s_env = File.stat(dir)
        s_pwd = File.stat(Dir.pwd)

        if s_env.ino == s_pwd.ino and (jruby? or s_env.dev == s_pwd.dev)
          @restart_dir = dir
          @options[:worker_directory] = dir
        end
      end

      @restart_dir ||= Dir.pwd

      @original_argv = @argv.dup

      require 'rubygems'

      # if $0 is a file in the current directory, then restart
      # it the same, otherwise add -S on there because it was
      # picked up in PATH.
      #
      if File.exist?($0)
        arg0 = [Gem.ruby, $0]
      else
        arg0 = [Gem.ruby, "-S", $0]
      end

      # Detect and reinject -Ilib from the command line
      lib = File.expand_path "lib"
      arg0[1,0] = ["-I", lib] if $:[0] == lib

      if defined? Puma::WILD_ARGS
        @restart_argv = arg0 + Puma::WILD_ARGS + @original_argv
      else
        @restart_argv = arg0 + @original_argv
      end
    end

    def set_rack_environment
      @options[:environment] = env
      ENV['RACK_ENV'] = env
    end

    def setup_signals
      begin
        Signal.trap "SIGUSR2" do
          restart
        end
      rescue Exception
        log "*** SIGUSR2 not implemented, signal based restart unavailable!"
      end

      begin
        Signal.trap "SIGUSR1" do
          phased_restart
        end
      rescue Exception
        log "*** SIGUSR1 not implemented, signal based restart unavailable!"
      end

      begin
        Signal.trap "SIGTERM" do
          stop
        end
      rescue Exception
        log "*** SIGTERM not implemented, signal based gracefully stopping unavailable!"
      end

      begin
        Signal.trap "SIGHUP" do
          redirect_io
        end
      rescue Exception
        log "*** SIGHUP not implemented, signal based logs reopening unavailable!"
      end

      if jruby?
        Signal.trap("INT") do
          @status = :exit
          graceful_stop
          exit
        end
      end
    end

    def close_binder_listeners
      @binder.listeners.each do |l, io|
        io.close
        uri = URI.parse(l)
        next unless uri.scheme == 'unix'
        File.unlink("#{uri.host}#{uri.path}")
      end
    end

    def parse_options
      @parser.parse! @argv

      @cli_options[:rackup] = @argv.shift if @argv.last

      find_config

      @config = Puma::Configuration.new @cli_options

      # Advertise the Configuration
      Puma.cli_config = @config

      @config.load

      @options = @config.options

      if clustered? && (jruby? || windows?)
        unsupported 'worker mode not supported on JRuby or Windows'
      end

      if @options[:daemon] && windows?
        unsupported 'daemon mode not supported on Windows'
      end
    end

    def prune_bundler
      return unless defined?(Bundler)
      puma = Bundler.rubygems.loaded_specs("puma")
      dirs = puma.require_paths.map { |x| File.join(puma.full_gem_path, x) }
      puma_lib_dir = dirs.detect { |x| File.exist? File.join(x, '../bin/puma-wild') }

      unless puma_lib_dir
        log "! Unable to prune Bundler environment, continuing"
        return
      end

      deps = puma.runtime_dependencies.map do |d|
        spec = Bundler.rubygems.loaded_specs(d.name)
        "#{d.name}:#{spec.version.to_s}"
      end

      log '* Pruning Bundler environment'
      home = ENV['GEM_HOME']
      Bundler.with_clean_env do
        ENV['GEM_HOME'] = home
        ENV['PUMA_BUNDLER_PRUNED'] = '1'
        wild = File.expand_path(File.join(puma_lib_dir, "../bin/puma-wild"))
        args = [Gem.ruby, wild, '-I', dirs.join(':'), deps.join(',')] + @original_argv
        Kernel.exec(*args)
      end
    end
  end
end
