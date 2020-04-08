# encoding: utf-8
require "date"
require "logstash/inputs/ganglia/gmondpacket"
require "logstash/inputs/base"
require "logstash/namespace"
require "socket"
require "stud/interval"

# Read ganglia packets from the network via udp
#
class LogStash::Inputs::Ganglia < LogStash::Inputs::Base
  config_name "ganglia"

  default :codec, "plain"

  # The address to listen on
  config :host, :validate => :string, :default => "0.0.0.0"

  # The port to listen on. Remember that ports less than 1024 (privileged
  # ports) may require root to use.
  config :port, :validate => :number, :default => 8649

  public
  def initialize(params)
    super
    BasicSocket.do_not_reverse_lookup = true
  end # def initialize

  public
  def register
  end # def register

  public
  def run(output_queue)
    begin
      udp_listener(output_queue)
    rescue => e
      if !stop?
        @logger.warn("ganglia udp listener died",
                     :address => "#{@host}:#{@port}", :exception => e,
        :backtrace => e.backtrace)
        Stud.stoppable_sleep(5) { stop? }
        retry
      end
    end # begin
  end # def run

  private
  def udp_listener(output_queue)
    @logger.info("Starting ganglia udp listener", :address => "#{@host}:#{@port}")

    @udp.close if @udp

    @udp = UDPSocket.new(Socket::AF_INET)
    @udp.bind(@host, @port)

    @metadata = Hash.new if @metadata.nil?
    while !stop?
      packet = ""
      begin
        packet, client = @udp.recvfrom_nonblock(9000)
      rescue IO::WaitReadable
       # The socket is still not active and readable so the
       # read operation fails
       packet = ""
      end
      # recvfrom_nonblock return packet == String.empty? when no data is in the buffers,
      # we reused this same error code for IO:WaitReadable exception handler.
      next if packet.empty?
      # TODO(sissel): make this a codec...
      e = parse_packet(packet)
      unless e.nil?
        decorate(e)
        e.set("host", client[3]) # the IP address
        output_queue << e
      end
    end
  ensure
    close_udp
  end # def udp_listener

  private

  public
  def stop
    close_udp
  end

  private
  def close_udp
    if @udp
      @udp.close
      @udp = nil
    end
  end

  public
  def parse_packet(packet)
    gmonpacket=GmonPacket.new(packet)
    if gmonpacket.meta?
      # Extract the metadata from the packet
      meta=gmonpacket.parse_metadata
      # Add it to the global metadata of this connection
      @metadata[meta['name']]=meta

      # We are ignoring meta events for putting things on the queue
      @logger.debug("received a meta packet", @metadata)
      return nil
    elsif gmonpacket.data?
      data=gmonpacket.parse_data(@metadata)

      # Check if it was a valid data request
      return nil unless data
      props={ "program" => "ganglia", "log_host" => data["hostname"],
              "val" => data["val"] }
      %w{dmax tmax slope type units name}.each do |info|
        props[info] = @metadata[data["name"]][info]
      end
      return LogStash::Event.new(props)
    else
      # Skipping unknown packet types
      return nil
    end
  end # def parse_packet
end # class LogStash::Inputs::Ganglia
