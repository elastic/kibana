require 'cabin'
require 'ffi-rzmq'

# Output to a zeromq socket.
class Cabin::Outputs::ZeroMQ
  DEFAULTS = {
    :topology => "pushpull",
    :hwm => 0, # zeromq default: no limit
    :linger => -1, # zeromq default: wait until all messages are sent.
    :topic => ""
  }

  CONTEXT = ZMQ::Context.new

  attr_reader :socket, :topology, :topic

  # Create a new ZeroMQ output.
  #
  # arguments:
  # addresses A list of addresses to connect to. These are round-robined by zeromq.
  # 
  # :topology Either 'pushpull' or 'pubsub'. Specifies which zeromq socket type to use. Default pushpull.
  # :hwm Specifies the High Water Mark for the socket. Default 0, which means there is none.
  # :linger Specifies the linger time in milliseconds for the socket. Default -1, meaning wait forever for the socket to close.
  # :topic Specifies the topic for a pubsub topology. This can be a string or a proc with the event as the only argument.
  def initialize(addresses, options={})
    options = DEFAULTS.merge(options)

    @topology = options[:topology].to_s
    case @topology
    when "pushpull"
      socket_type = ZMQ::PUSH
    when "pubsub"
      socket_type = ZMQ::PUB
    end

    @topic = options[:topic]
    @socket = CONTEXT.socket(socket_type)
    
    Array(addresses).each do |address|
      error_check @socket.connect(address), "connecting to #{address}"
    end

    error_check @socket.setsockopt(ZMQ::LINGER, options[:linger]), "while setting ZMQ::LINGER to #{options[:linger]}"
    error_check @socket.setsockopt(ZMQ::HWM, options[:hwm]), "while setting ZMQ::HWM to #{options[:hwm]}"

    #TODO use cabin's teardown when it exists
    at_exit do
      teardown
    end

    #define_finalizer
  end

  def linger
    array = []
    error_check @socket.getsockopt(ZMQ::LINGER, array), "while getting ZMQ::LINGER"
    array.first
  end

  def hwm
    array = []
    error_check @socket.getsockopt(ZMQ::HWM, array), "while getting ZMQ::HWM"
    array.first
  end

  def <<(event)
    if @socket.name == "PUB"
      topic = @topic.is_a?(Proc) ? @topic.call(event) : @topic
      error_check @socket.send_string(topic, ZMQ::SNDMORE), "in topic send_string"
    end
    error_check @socket.send_string(event.inspect), "in send_string"
  end

  def teardown
    @socket.close if @socket
  end

  private
  def error_check(rc, doing)
    unless ZMQ::Util.resultcode_ok?(rc)
      raise "ZeroMQ Error while #{doing}"
    end
  end

  # This causes the following message on exit:
  # File exists (epoll.cpp:69)
  # [1]    26175 abort      bundle exec irb
  # def define_finalizer
  #   ObjectSpace.define_finalizer(self, self.class.finalize(@socket))
  # end

  # def self.finalize(socket)
  #   Proc.new { puts "finalizing"; socket.close unless socket.nil?; puts "done" }
  # end
end
