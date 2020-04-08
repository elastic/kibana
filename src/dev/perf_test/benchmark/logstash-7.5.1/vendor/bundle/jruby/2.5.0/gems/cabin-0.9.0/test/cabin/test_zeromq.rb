require "test_helper"
require "cabin/outputs/zeromq"

describe Cabin::Outputs::ZeroMQ do

  def error_check(rc, doing)
    unless ZMQ::Util.resultcode_ok?(rc)
      raise "ZeroMQ Error while #{doing}"
    end
  end

  NonBlockingFlag = (ZMQ::LibZMQ.version2? ? ZMQ::NOBLOCK : ZMQ::DONTWAIT) unless defined?(NonBlockingFlag)
  def receive(socket)
    received = ""
    error_check socket.recv_string(received, NonBlockingFlag), "receiving"
    received
  end

  before do
    @logger = Cabin::Channel.new
    @address = "inproc://zeromq-output"
    @pull   = Cabin::Outputs::ZeroMQ::CONTEXT.socket(ZMQ::PULL)
    @sub    = Cabin::Outputs::ZeroMQ::CONTEXT.socket(ZMQ::SUB)
  end

  after do
    @pull.close
    @sub.close
    @output.teardown if @output
  end

  test 'push messages' do
    @pull.bind(@address); sleep 0.1 # sleeps are necessary for inproc transport
    @output = Cabin::Outputs::ZeroMQ.new(@address)
    @logger.subscribe(@output)
    @logger.info("hello")
    @logger.info("hello2")
    assert_equal "hello", JSON.parse(receive(@pull))['message']
    assert_equal "hello2", JSON.parse(receive(@pull))['message']
  end

  test "pub messages" do
    @sub.bind(@address); sleep 0.1
    error_check @sub.setsockopt(ZMQ::SUBSCRIBE, ""), "subscribing"
    @output = Cabin::Outputs::ZeroMQ.new(@address, :topology => "pubsub")
    @logger.subscribe(@output)
    @logger.info("hi")
    assert_equal "", receive(@sub)
    assert_equal "hi", JSON.parse(receive(@sub))['message']
  end

  test "pub messages on a topic" do
    @sub.bind(@address); sleep 0.1
    error_check @sub.setsockopt(ZMQ::SUBSCRIBE, "topic"), "subscribing"
    @output = Cabin::Outputs::ZeroMQ.new(@address, :topology => "pubsub", :topic => "topic")
    @logger.subscribe(@output)
    @logger.info("hi")
    assert_equal "topic", receive(@sub)
    assert_equal "hi", JSON.parse(receive(@sub))['message']
  end

  test "topic proc" do
    @sub.bind(@address); sleep 0.1
    error_check @sub.setsockopt(ZMQ::SUBSCRIBE, "topic2"), "subscribing"
    @output = Cabin::Outputs::ZeroMQ.new(@address, :topology => "pubsub", :topic => Proc.new { |event| event[:message] })
    @logger.subscribe(@output)
    @logger.info("topic1")
    @logger.info("topic2")
    assert_equal "topic2", receive(@sub)
    assert_equal "topic2", JSON.parse(receive(@sub))['message']
  end

  test "multiple addresses" do
    @pull.bind(@address); sleep 0.1
    @pull2 = Cabin::Outputs::ZeroMQ::CONTEXT.socket(ZMQ::PULL)
    @pull2.bind(@address.succ); sleep 0.1

    @output = Cabin::Outputs::ZeroMQ.new([@address, @address.succ])
    @logger.subscribe(@output)
    @logger.info("yo")
    @logger.info("yo")

    assert_equal "yo", JSON.parse(receive(@pull))['message']
    assert_equal "yo", JSON.parse(receive(@pull2))['message']
  end

  test "options" do
    @pull.bind(@address); sleep 0.1
    @output = Cabin::Outputs::ZeroMQ.new(@address, :hwm => 10, :linger => 100)

    assert_equal 10, @output.hwm
    assert_equal 100, @output.linger
  end
end
