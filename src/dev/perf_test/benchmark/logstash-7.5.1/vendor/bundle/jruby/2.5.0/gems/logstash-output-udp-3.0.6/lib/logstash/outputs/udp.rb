# encoding: utf-8
require "logstash/outputs/base"
require "logstash/namespace"
require "socket"

# Send events over UDP
#
# Keep in mind that UDP will lose messages.
class LogStash::Outputs::UDP < LogStash::Outputs::Base
  config_name "udp"
  
  default :codec, "json"

  # The address to send messages to
  config :host, :validate => :string, :required => true

  # The port to send messages on
  config :port, :validate => :number, :required => true

  public
  def register
    @socket = UDPSocket.new
    @codec.on_event do |event, payload|
      @socket.send(payload, 0, @host, @port)
    end
  end

  def receive(event)
    
    return if event == LogStash::SHUTDOWN
    @codec.encode(event)
  end

end # class LogStash::Outputs::Stdout
