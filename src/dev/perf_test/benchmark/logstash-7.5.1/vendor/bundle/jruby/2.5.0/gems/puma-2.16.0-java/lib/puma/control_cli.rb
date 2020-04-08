require 'optparse'
require 'puma/const'
require 'puma/configuration'
require 'yaml'
require 'uri'
require 'socket'
module Puma
  class ControlCLI

    COMMANDS = %w{halt restart phased-restart start stats status stop reload-worker-directory}

    def is_windows?
      RUBY_PLATFORM =~ /(win|w)32$/ ? true : false
    end

    def initialize(argv, stdout=STDOUT, stderr=STDERR)
      @argv = argv
      @stdout = stdout
      @stderr = stderr
      @cli_options = {}

      opts = OptionParser.new do |o|
        o.banner = "Usage: pumactl (-p PID | -P pidfile | -S status_file | -C url -T token | -F config.rb) (#{COMMANDS.join("|")})"

        o.on "-S", "--state PATH", "Where the state file to use is" do |arg|
          @cli_options[:state] = arg
        end

        o.on "-Q", "--quiet", "Not display messages" do |arg|
          @cli_options[:quiet_flag] = true
        end

        o.on "-P", "--pidfile PATH", "Pid file" do |arg|
          @cli_options[:pidfile] = arg
        end

        o.on "-p", "--pid PID", "Pid" do |arg|
          @cli_options[:pid] = arg.to_i
        end

        o.on "-C", "--control-url URL", "The bind url to use for the control server" do |arg|
          @cli_options[:control_url] = arg
        end

        o.on "-T", "--control-token TOKEN", "The token to use as authentication for the control server" do |arg|
          @cli_options[:control_auth_token] = arg
        end

        o.on "-F", "--config-file PATH", "Puma config script" do |arg|
          @cli_options[:config_file] = arg
        end

        o.on_tail("-H", "--help", "Show this message") do
          @stdout.puts o
          exit
        end

        o.on_tail("-V", "--version", "Show version") do
          puts Const::PUMA_VERSION
          exit
        end
      end

      opts.order!(argv) { |a| opts.terminate a }

      command = argv.shift
      @cli_options[:command] = command if command

      @options = nil

      unless @cli_options[:config_file] == '-'
        if @cli_options[:config_file].nil? and File.exist?('config/puma.rb')
          @cli_options[:config_file] = 'config/puma.rb'
        end

        if @cli_options[:config_file]
          config = Puma::Configuration.new(@cli_options)
          config.load
          @options = config.options
        end
      end

      @options ||= @cli_options

      # check present of command
      unless @options[:command]
        raise "Available commands: #{COMMANDS.join(", ")}"
      end

      unless COMMANDS.include? @options[:command]
        raise "Invalid command: #{@options[:command]}"
      end

    rescue => e
      @stdout.puts e.message
      exit 1
    end

    def message(msg)
      @stdout.puts msg unless @options[:quiet_flag]
    end

    def prepare_configuration
      if @options.has_key? :state
        unless File.exist? @options[:state]
          raise "Status file not found: #{@options[:state]}"
        end

        status = YAML.load File.read(@options[:state])

        if status.kind_of?(Hash) && status.has_key?("config")

          conf = status["config"]

          # get control_url
          if url = conf.options[:control_url]
            @options[:control_url] = url
          end

          # get control_auth_token
          if token = conf.options[:control_auth_token]
            @options[:control_auth_token] = token
          end

          # get pid
          @options[:pid] = status["pid"].to_i
        else
          raise "Invalid status file: #{@options[:state]}"
        end

      elsif @options.has_key? :pidfile
        # get pid from pid_file
        @options[:pid] = File.open(@options[:pidfile]).gets.to_i
      end
    end

    def send_request
      uri = URI.parse @options[:control_url]

      # create server object by scheme
      @server = case uri.scheme
                when "tcp"
                  TCPSocket.new uri.host, uri.port
                when "unix"
                  UNIXSocket.new "#{uri.host}#{uri.path}"
                else
                  raise "Invalid scheme: #{uri.scheme}"
                end

      if @options[:command] == "status"
        message "Puma is started"
      else
        url = "/#{@options[:command]}"

        if @options.has_key?(:control_auth_token)
          url = url + "?token=#{@options[:control_auth_token]}"
        end

        @server << "GET #{url} HTTP/1.0\r\n\r\n"

        unless data = @server.read
          raise "Server closed connection before responding"
        end

        response = data.split("\r\n")

        if response.empty?
          raise "Server sent empty response"
        end

        (@http,@code,@message) = response.first.split(" ",3)

        if @code == "403"
          raise "Unauthorized access to server (wrong auth token)"
        elsif @code == "404"
          raise "Command error: #{response.last}"
        elsif @code != "200"
          raise "Bad response from server: #{@code}"
        end

        message "Command #{@options[:command]} sent success"
        message response.last if @options[:command] == "stats"
      end

      @server.close
    end

    def send_signal
      unless pid = @options[:pid]
        raise "Neither pid nor control url available"
      end

      begin
        Process.getpgid pid
      rescue SystemCallError
        if @options[:command] == "restart"
          @options.delete(:command)
          start
        else
          raise "No pid '#{pid}' found"
        end
      end

      case @options[:command]
      when "restart"
        Process.kill "SIGUSR2", pid

      when "halt"
        Process.kill "QUIT", pid

      when "stop"
        Process.kill "SIGTERM", pid

      when "stats"
        puts "Stats not available via pid only"
        return

      when "reload-worker-directory"
        puts "reload-worker-directory not available via pid only"
        return

      when "phased-restart"
        Process.kill "SIGUSR1", pid

      else
        message "Puma is started"
        return
      end

      message "Command #{@options[:command]} sent success"
    end

    def run
      start if @options[:command] == "start"

      prepare_configuration

      if is_windows?
        send_request
      else
        @options.has_key?(:control_url) ? send_request : send_signal
      end

    rescue => e
      message e.message
      exit 1
    end

  private
    def start
      require 'puma/cli'

      run_args = @argv

      if path = @options[:state]
        run_args = ["-S", path] + run_args
      end

      if path = @options[:config_file]
        run_args = ["-C", path] + run_args
      end

      events = Puma::Events.new @stdout, @stderr

      # replace $0 because puma use it to generate restart command
      puma_cmd = $0.gsub(/pumactl$/, 'puma')
      $0 = puma_cmd if File.exist?(puma_cmd)

      cli = Puma::CLI.new run_args, events
      cli.run
    end
  end
end
