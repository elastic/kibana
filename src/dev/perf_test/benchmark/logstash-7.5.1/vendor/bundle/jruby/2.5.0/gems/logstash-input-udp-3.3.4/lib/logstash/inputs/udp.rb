# encoding: utf-8
require "date"
require "logstash/inputs/base"
require "logstash/namespace"
require "socket"
require "stud/interval"
require "ipaddr"

# Read messages as events over the network via udp. The only required
# configuration item is `port`, which specifies the udp port logstash
# will listen on for event streams.
#
class LogStash::Inputs::Udp < LogStash::Inputs::Base
  config_name "udp"

  default :codec, "plain"

  # The address which logstash will listen on.
  config :host, :validate => :string, :default => "0.0.0.0"

  # The port which logstash will listen on. Remember that ports less
  # than 1024 (privileged ports) may require root or elevated privileges to use.
  config :port, :validate => :number, :required => true

  # The maximum packet size to read from the network
  config :buffer_size, :validate => :number, :default => 65536

  # The socket receive buffer size in bytes.
  # If option is not set, the operating system default is used.
  # The operating system will use the max allowed value if receive_buffer_bytes is larger than allowed.
  # Consult your operating system documentation if you need to increase this max allowed value.
  config :receive_buffer_bytes, :validate => :number

  # Number of threads processing packets
  config :workers, :validate => :number, :default => 2

  # This is the number of unprocessed UDP packets you can hold in memory
  # before packets will start dropping.
  config :queue_size, :validate => :number, :default => 2000

  # The name of the field where the source IP address will be stored
  config :source_ip_fieldname, :validate => :string, :default => 'host'

  def initialize(params)
    super
    BasicSocket.do_not_reverse_lookup = true
  end

  def register
    @udp = nil
    @metric_errors = metric.namespace(:errors)
  end # def register

  def run(output_queue)
    @output_queue = output_queue

    @input_to_worker = SizedQueue.new(@queue_size)
    metric.gauge(:queue_size, @queue_size)
    metric.gauge(:workers, @workers)

    @input_workers = (1..@workers).to_a.map do |i|
      @logger.debug("Starting UDP worker thread", :worker => i)
      Thread.new(i, @codec.clone) { |i, codec| inputworker(i, codec) }
    end

    begin
      # udp server
      udp_listener(output_queue)
    rescue => e
      @logger.error("UDP listener died", :exception => e, :backtrace => e.backtrace)
      @metric_errors.increment(:listener)
      Stud.stoppable_sleep(5) { stop? }
      retry unless stop?
    ensure
      # signal workers to end
      @input_workers.size.times { @input_to_worker.push([:END, nil]) }
      @input_workers.each { |thread| thread.join }
    end
  end

  def close
    if @udp && !@udp.closed?
      @udp.close rescue ignore_close_and_log($!)
    end
  end

  def stop
    if @udp && !@udp.closed?
      @udp.close rescue ignore_close_and_log($!)
    end
  end

  private

  def udp_listener(output_queue)
    @logger.info("Starting UDP listener", :address => "#{@host}:#{@port}")

    if @udp && !@udp.closed?
      @udp.close
    end

    if IPAddr.new(@host).ipv6?
      @udp = UDPSocket.new(Socket::AF_INET6)
    elsif IPAddr.new(@host).ipv4?
      @udp = UDPSocket.new(Socket::AF_INET)
    end
    # set socket receive buffer size if configured
    if @receive_buffer_bytes
      @udp.setsockopt(Socket::SOL_SOCKET, Socket::SO_RCVBUF, @receive_buffer_bytes)
    end
    rcvbuf = @udp.getsockopt(Socket::SOL_SOCKET, Socket::SO_RCVBUF).unpack("i")[0]
    if @receive_buffer_bytes && rcvbuf != @receive_buffer_bytes
      @logger.warn("Unable to set receive_buffer_bytes to desired size. Requested #{@receive_buffer_bytes} but obtained #{rcvbuf} bytes.")
    end

    @udp.bind(@host, @port)
    @logger.info("UDP listener started", :address => "#{@host}:#{@port}", :receive_buffer_bytes => "#{rcvbuf}", :queue_size => "#{@queue_size}")


    while !stop?
      next if IO.select([@udp], [], [], 0.5).nil?
      # collect datagram messages and add to inputworker queue
      @queue_size.times do
        begin
          payload, client = @udp.recvfrom_nonblock(@buffer_size)
          break if payload.empty?
          push_data(payload, client)
        rescue IO::EAGAINWaitReadable
          break
        end
      end
    end
  ensure
    if @udp
      @udp.close_read rescue ignore_close_and_log($!)
      @udp.close_write rescue ignore_close_and_log($!)
    end
  end

  def inputworker(number, codec)
    LogStash::Util::set_thread_name("<udp.#{number}")

    while true
      # a worker should never terminate from an exception, only when it receives the :END symbol
      begin
        payload, client = @input_to_worker.pop
        break if payload == :END

        ip_address = client[3]

        codec.decode(payload) { |event| push_decoded_event(ip_address, event) }
        codec.flush { |event| push_decoded_event(ip_address, event) }
      rescue => e
        @logger.error("Exception in inputworker", "exception" => e, "backtrace" => e.backtrace)
        @metric_errors.increment(:worker)
      end
    end
  end

  # work around jruby/jruby#5148
  # For jruby 9k (ruby >= 2.x) we need to truncate the buffer
  # after reading from the socket otherwise each
  # message will use 64kb
  if RUBY_VERSION.match(/^2/)
    def push_data(payload, client)
      payload = payload.b.force_encoding(Encoding::UTF_8)
      @input_to_worker.push([payload, client])
    end
  else
    def push_data(payload, client)
      @input_to_worker.push([payload, client])
    end
  end

  def push_decoded_event(ip_address, event)
    decorate(event)
    event.set(source_ip_fieldname, ip_address) if event.get(source_ip_fieldname).nil?
    @output_queue.push(event)
    metric.increment(:events)
  end

  def ignore_close_and_log(e)
    @logger.debug("ignoring close exception", "exception" => e)
  end
end
