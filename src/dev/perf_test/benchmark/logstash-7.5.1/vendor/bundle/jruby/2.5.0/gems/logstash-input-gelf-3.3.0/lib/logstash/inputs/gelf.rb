# encoding: utf-8
require "logstash/inputs/base"
require "logstash/namespace"
require "logstash/json"
require "logstash/timestamp"
require "stud/interval"
require "date"
require "socket"
require "json"

# This input will read GELF messages as events over the network,
# making it a good choice if you already use Graylog2 today.
#
# The main use case for this input is to leverage existing GELF
# logging libraries such as the GELF log4j appender.

class LogStash::Inputs::Gelf < LogStash::Inputs::Base
  config_name "gelf"

  default :codec, "plain"

  # The IP address or hostname to listen on.
  config :host, :validate => :string, :default => "0.0.0.0"

  # The ports to listen on. Remember that ports less than 1024 (privileged
  # ports) may require root to use.
  # port_tcp and port_udp can be used to have a different port for udp than the tcp port.
  config :port, :validate => :number, :default => 12201
  config :port_tcp, :validate => :number
  config :port_udp, :validate => :number

  # Whether or not to remap the GELF message fields to Logstash event fields or
  # leave them intact.
  #
  # Remapping converts the following GELF fields to Logstash equivalents:
  #
  # * `full\_message` becomes `event.get("message")`.
  # * if there is no `full\_message`, `short\_message` becomes `event.get("message")`.
  config :remap, :validate => :boolean, :default => true

  # Whether or not to remove the leading `\_` in GELF fields or leave them
  # in place. (Logstash < 1.2 did not remove them by default.). Note that
  # GELF version 1.1 format now requires all non-standard fields to be added
  # as an "additional" field, beginning with an underscore.
  #
  # e.g. `\_foo` becomes `foo`
  #
  config :strip_leading_underscore, :validate => :boolean, :default => true

  RECONNECT_BACKOFF_SLEEP = 5
  TIMESTAMP_GELF_FIELD = "timestamp".freeze
  SOURCE_HOST_FIELD = "source_host".freeze
  MESSAGE_FIELD = "message"
  TAGS_FIELD = "tags"
  PARSE_FAILURE_TAG = "_jsonparsefailure"
  PARSE_FAILURE_LOG_MESSAGE = "JSON parse failure. Falling back to plain-text"

  # Whether or not to use TCP or/and UDP
  config :use_tcp, :validate => :boolean, :default => false
  config :use_udp, :validate => :boolean, :default => true

  def initialize(params)
    super
    BasicSocket.do_not_reverse_lookup = true
  end

  def register
    require 'gelfd2'
    @port_tcp ||= @port
    @port_udp ||= @port
  end

  def run(output_queue)
    begin
      if @use_tcp
        @tcp_thr = Thread.new(output_queue) { |output_queue| tcp_listener(output_queue) }
      end
      if @use_udp
        @udp_thr = Thread.new(output_queue) { |output_queue| udp_listener(output_queue) }
      end
    rescue => e
      unless stop?
        @logger.warn("gelf listener died", :exception => e, :backtrace => e.backtrace)
        Stud.stoppable_sleep(RECONNECT_BACKOFF_SLEEP) { stop? }
        if !stop?
          # before retrying make sure we close all sockets
          stop
          wait_server_thread
          retry
        end
      end
    end

    wait_server_thread
  end

  def stop
    begin
      @udp.close if @use_udp
      @udp = nil
    rescue => e
      @logger.debug("Caught exception while closing udp socket", :exception => e)
    end
    begin
      @tcp.close if @use_tcp
      @tcp = nil
    rescue => e
      @logger.debug("Caught exception while closing tcp socket", :exception => e)
    end
  end

  private

  def wait_server_thread
    @tcp_thr.join if @use_tcp
    @udp_thr.join if @use_udp
  end

  def tcp_listener(output_queue)
    @logger.info("Starting gelf listener (tcp) ...", :address => "#{@host}:#{@port_tcp}")

    if @tcp.nil?
      @tcp = TCPServer.new(@host, @port_tcp)
    end

    while !stop?
      Thread.new(@tcp.accept) do |client|
        begin
          @logger.debug? && @logger.debug("Gelf (tcp): Accepting connection from:  #{client.peeraddr[2]}:#{client.peeraddr[1]}")

          while !client.nil? && !client.eof? && !stop?

            begin # Read from socket
              data_in = client.gets("\u0000")
            rescue => ex
              if !stop?
                @logger.warn("Gelf (tcp): failed gets from client socket:", :exception => ex, :backtrace => ex.backtrace)
              end
            end

             if data_in.nil?
              @logger.debug("Gelf (tcp): socket read succeeded, but data is nil. Skipping.")
              next
             end

            # data received.  Remove trailing \0
            data_in[-1] == "\u0000" && data_in = data_in[0...-1]

            event = self.class.new_event(data_in, client.peeraddr[3])
            next if event.nil?

            remap_gelf(event) if @remap
            strip_leading_underscore(event) if @strip_leading_underscore
            decorate(event)
            output_queue << event
          end

          @logger.debug? && @logger.debug("Gelf (tcp): Closing client connection")
          client.close rescue nil
          client = nil
        rescue => ex
          if !stop?
            @logger.warn("Gelf (tcp): client socket failed.", :exception => ex, :backtrace => ex.backtrace)
          end
        ensure
          if !client.nil?
            @logger.debug? && @logger.debug("Gelf (tcp): Ensuring client is closed")
            client.close rescue nil
            client = nil
          end
        end
      end
    end
  ensure
    @logger.debug? && @logger.debug("Gelf (tcp): Ensuring tcp server is closed")
    @tcp.close rescue nil
    @tcp = nil
  end

  def udp_listener(output_queue)
    @logger.info("Starting gelf listener (udp) ...", :address => "#{@host}:#{@port_udp}")

    @udp = UDPSocket.new(Socket::AF_INET)
    @udp.bind(@host, @port_udp)

    while !stop?
      begin
        line, client = @udp.recvfrom(8192)
      rescue => e
        if !stop?
          @logger.error("Caught exception while reading from UDP socket", :exception => e)
        end
        next
      end

      begin
        data = Gelfd2::Parser.parse(line)
      rescue => ex
        @logger.warn("Gelfd failed to parse a message skipping", :exception => ex, :backtrace => ex.backtrace)
        next
      end

      # Gelfd parser outputs null if it received and cached a non-final chunk
      next if data.nil?

      event = self.class.new_event(data, client[3])
      next if event.nil?

      remap_gelf(event) if @remap
      strip_leading_underscore(event) if @strip_leading_underscore
      decorate(event)

      output_queue << event
    end
  ensure
    @logger.debug? && @logger.debug("Gelf (udp): Ensuring udp socket is closed")
    @udp.close rescue nil
    @udp = nil
  end

  # generate a new LogStash::Event from json input and assign host to source_host event field.
  # @param json_gelf [String] GELF json data
  # @param host [String] source host of GELF data
  # @return [LogStash::Event] new event with parsed json gelf, assigned source host and coerced timestamp
  def self.new_event(json_gelf, host)
    event = parse(json_gelf)
    return if event.nil?

    event.set(SOURCE_HOST_FIELD, host.force_encoding("UTF-8"))

    if (gelf_timestamp = event.get(TIMESTAMP_GELF_FIELD)).is_a?(Numeric)
      event.timestamp = self.coerce_timestamp(gelf_timestamp)
      event.remove(TIMESTAMP_GELF_FIELD)
    end

    event
  end

  # transform a given timestamp value into a proper LogStash::Timestamp, preserving microsecond precision
  # and work around a JRuby issue with Time.at loosing fractional part with BigDecimal.
  # @param timestamp [Numeric] a Numeric (integer, float or bigdecimal) timestampo representation
  # @return [LogStash::Timestamp] the proper LogStash::Timestamp representation
  def self.coerce_timestamp(timestamp)
    # bug in JRuby prevents correcly parsing a BigDecimal fractional part, see https://github.com/elastic/logstash/issues/4565
    timestamp.is_a?(BigDecimal) ? LogStash::Timestamp.at(timestamp.to_i, timestamp.frac * 1000000) : LogStash::Timestamp.at(timestamp)
  end

  def self.parse(json)
    o = LogStash::Json.load(json)
    LogStash::Event.new(o)
  rescue LogStash::Json::ParserError => e
    logger.error(PARSE_FAILURE_LOG_MESSAGE, :error => e, :data => json.inspect)
    LogStash::Event.new(MESSAGE_FIELD => json.inspect, TAGS_FIELD => [PARSE_FAILURE_TAG])
  end

  def remap_gelf(event)
    if event.get("full_message") && !event.get("full_message").empty?
      event.set("message", event.get("full_message").dup)
      event.remove("full_message")
      if event.get("short_message") == event.get("message")
        event.remove("short_message")
      end
    elsif event.get("short_message") && !event.get("short_message").empty?
      event.set("message", event.get("short_message").dup)
      event.remove("short_message")
    end
  end

  def strip_leading_underscore(event)
     # Map all '_foo' fields to simply 'foo'
     event.to_hash.keys.each do |key|
       next unless key[0,1] == "_"
       event.set(key[1..-1], event.get(key))
       event.remove(key)
     end
  end
end
