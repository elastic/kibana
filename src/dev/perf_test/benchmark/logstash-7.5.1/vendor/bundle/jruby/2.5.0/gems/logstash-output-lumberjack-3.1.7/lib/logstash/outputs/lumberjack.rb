# encoding: utf-8
require "logstash/outputs/base"
require "logstash/errors"
require "stud/buffer"
require "thread"

class LogStash::Outputs::Lumberjack < LogStash::Outputs::Base
  include Stud::Buffer

  config_name "lumberjack"

  # list of addresses lumberjack can send to
  config :hosts, :validate => :array, :required => true

  # the port to connect to
  config :port, :validate => :number, :required => true

  # ssl certificate to use
  config :ssl_certificate, :validate => :path, :required => true

  # To make efficient calls to the lumberjack output we are buffering events locally.
  # if the number of events exceed the number the declared `flush_size` we will
  # send them to the logstash server.
  config :flush_size, :validate => :number, :default => 1024

  # The amount of time since last flush before a flush is forced.
  #
  # This setting helps ensure slow event rates don't get stuck in Logstash.
  # For example, if your `flush_size` is 100, and you have received 10 events,
  # and it has been more than `idle_flush_time` seconds since the last flush,
  # Logstash will flush those 10 events automatically.
  #
  # This helps keep both fast and slow log streams moving along in
  # near-real-time.
  config :idle_flush_time, :validate => :number, :default => 1

  RECONNECT_BACKOFF_SLEEP = 0.5

  public
  def register
    require 'lumberjack/client'

    buffer_initialize(
      :max_items => @flush_size,
      :max_interval => @idle_flush_time,
      :logger => @logger
    )

    connect

    @codec.on_event do |event, payload|
      buffer_receive({ "line" => payload })
    end
  end # def register

  public
  def receive(event)
    return if event == LogStash::SHUTDOWN
    @codec.encode(event)
  end # def receive

  def flush(events, close = false)
    begin
      @logger.debug? && @logger.debug("Sending events to lumberjack", :size => events.size)
      @client.write(events)
    rescue Exception => e
      @logger.error("Client write error, trying connect", :e => e, :backtrace => e.backtrace)
      sleep(RECONNECT_BACKOFF_SLEEP)
      connect
      retry
    end # begin
  end

  def close
    buffer_flush(:force => true)
  end

  private
  def connect
    require 'resolv'
    @logger.debug("Connecting to lumberjack server.", :addresses => @hosts, :port => @port,
        :ssl_certificate => @ssl_certificate, :flush_size => @flush_size)
    begin
      ips = []
      @hosts.each { |host| ips += Resolv.getaddresses host }
      @client = Lumberjack::Client.new(:addresses => ips.uniq, :port => @port,
        :ssl_certificate => @ssl_certificate, :flush_size => @flush_size)
    rescue Exception => e
      @logger.error("All hosts unavailable, sleeping", :hosts => ips.uniq, :e => e,
        :backtrace => e.backtrace)
      sleep(10)
      retry
    end
  end
end
