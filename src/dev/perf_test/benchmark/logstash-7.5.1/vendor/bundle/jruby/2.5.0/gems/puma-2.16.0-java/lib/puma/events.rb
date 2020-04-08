require 'puma/const'
require 'stringio'

module Puma
  # The default implement of an event sink object used by Server
  # for when certain kinds of events occur in the life of the server.
  #
  # The methods available are the events that the Server fires.
  #
  class Events
    class DefaultFormatter
      def call(str)
        str
      end
    end

    class PidFormatter
      def call(str)
        "[#{$$}] #{str}"
      end
    end

    include Const

    # Create an Events object that prints to +stdout+ and +stderr+.
    #
    def initialize(stdout, stderr)
      @formatter = DefaultFormatter.new
      @stdout = stdout
      @stderr = stderr

      @stdout.sync = true
      @stderr.sync = true

      @debug = ENV.key? 'PUMA_DEBUG'

      @on_booted = []

      @hooks = Hash.new { |h,k| h[k] = [] }
    end

    attr_reader :stdout, :stderr
    attr_accessor :formatter

    # Fire callbacks for the named hook
    #
    def fire(hook, *args)
      @hooks[hook].each { |t| t.call(*args) }
    end

    # Register a callbock for a given hook
    #
    def register(hook, obj=nil, &blk)
      if obj and blk
        raise "Specify either an object or a block, not both"
      end

      h = obj || blk

      @hooks[hook] << h

      h
    end

    # Write +str+ to +@stdout+
    #
    def log(str)
      @stdout.puts format(str)
    end

    def write(str)
      @stdout.write format(str)
    end

    def debug(str)
      log("% #{str}") if @debug
    end

    # Write +str+ to +@stderr+
    #
    def error(str)
      @stderr.puts format("ERROR: #{str}")
      exit 1
    end

    def format(str)
      formatter.call(str)
    end

    # An HTTP parse error has occurred.
    # +server+ is the Server object, +env+ the request, and +error+ a
    # parsing exception.
    #
    def parse_error(server, env, error)
      @stderr.puts "#{Time.now}: HTTP parse error, malformed request (#{env[HTTP_X_FORWARDED_FOR] || env[REMOTE_ADDR]}): #{error.inspect}"
      @stderr.puts "#{Time.now}: ENV: #{env.inspect}\n---\n"
    end

    # An SSL error has occurred.
    # +server+ is the Server object, +peeraddr+ peer address, +peercert+
    # any peer certificate (if present), and +error+ an exception object.
    #
    def ssl_error(server, peeraddr, peercert, error)
      subject = peercert ? peercert.subject : nil
      @stderr.puts "#{Time.now}: SSL error, peer: #{peeraddr}, peer cert: #{subject}, #{error.inspect}"
    end

    # An unknown error has occurred.
    # +server+ is the Server object, +env+ the request, +error+ an exception
    # object, and +kind+ some additional info.
    #
    def unknown_error(server, error, kind="Unknown")
      if error.respond_to? :render
        error.render "#{Time.now}: #{kind} error", @stderr
      else
        @stderr.puts "#{Time.now}: #{kind} error: #{error.inspect}"
        @stderr.puts error.backtrace.join("\n")
      end
    end

    def on_booted(&b)
      @on_booted << b
    end

    def fire_on_booted!
      @on_booted.each { |b| b.call }
    end

    DEFAULT = new(STDOUT, STDERR)

    # Returns an Events object which writes its status to 2 StringIO
    # objects.
    #
    def self.strings
      Events.new StringIO.new, StringIO.new
    end

    def self.stdio
      Events.new $stdout, $stderr
    end
  end
end
