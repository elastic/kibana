require "test_helper"

describe Cabin::Channel do

  # Cabin::Channel is a subscription thing, so implement
  # a simple receiver that just stores events in an array
  # for later access - this lets us see exactly what is
  # logged, in order.
  class Receiver
    attr_accessor :data

    public
    def initialize
      @data = []
    end

    public
    def <<(data)
      @data << data
    end
  end # class Receiver

  class TtyReceiver < Receiver
    def tty?
      true
    end
  end

  before do
    @logger = Cabin::Channel.new
    @target = Receiver.new
    @logger.subscribe(@target)
  end

  test "simple string publishing" do
    @logger.publish("Hello world")
    assert_equal(1, @target.data.length)
    assert_equal("Hello world", @target.data[0][:message])
  end

  test "simple context data" do
    @logger[:foo] = "bar"
    @logger.publish("Hello world")
    assert_equal(1, @target.data.length)
    assert_equal("Hello world", @target.data[0][:message])
    assert_equal("bar", @target.data[0][:foo])
  end

  test "time something" do
    timer = @logger.time("some sample")
    timer.stop

    event = @target.data[0]
    assert_equal("some sample", event[:message])
    assert(event[:duration].is_a?(Numeric))
  end

  test "double subscription should still only subscribe once" do
    @logger.subscribe(@target)
    @logger.publish("Hello world")
    assert_equal(1, @target.data.length)
    assert_equal("Hello world", @target.data[0][:message])
  end 

  test "subscribe with a level impacts log publishing" do
    sub1 = Receiver.new
    sub2 = Receiver.new
    @logger.subscribe(sub1, :level => :info)
    @logger.subscribe(sub2, :level => :error)
    @logger.debug("test debug")
    @logger.info("test info")
    @logger.error("test error")

    assert_equal("test info", sub1.data[0][:message])
    assert_equal("test error", sub1.data[1][:message])
    assert_equal("test error", sub2.data[0][:message])
  end
  test "context values" do
    context = @logger.context
    context["foo"] = "hello"
    @logger.publish("testing")
    assert_equal(1, @target.data.length)
    assert_equal("hello", @target.data[0]["foo"])
    assert_equal("testing", @target.data[0][:message])
  end

  test "context values clear properly" do
    context = @logger.context
    context["foo"] = "hello"
    context.clear
    @logger.publish("testing")
    assert_equal(1, @target.data.length)
    assert(!@target.data[0].has_key?("foo"))
    assert_equal("testing", @target.data[0][:message])
  end

  %w(fatal error warn info debug).each do |level|
    level = level.to_sym
    test "standard use case, '#{level}' logging when enabled" do
      @logger.level = level
      @logger.send(level, "Hello world")
      event = @target.data[0]
      assert(@logger.send("#{level}?"),
             "At level #{level}, Channel##{level}? should return true.")
      assert_equal("Hello world", event[:message])
      assert_equal(level, event[:level])
    end
  end

  %w(error warn info debug).each do |level|
    level = level.to_sym
    test "standard use case, '#{level}' logging when wrong level" do
      @logger.level = :fatal
      # Should not log since log level is :fatal and we are above that.
      @logger.send(level, "Hello world")
      assert_equal(0, @target.data.length)
    end
  end

  test "standard use case, 'terminal' logging when there is no tty" do
    @logger.terminal('Hello world')
    assert_equal(true, @target.data.empty?)
  end

  test "standard use case, 'terminal' logging when there is a tty" do
    tty_target = TtyReceiver.new
    id   = @logger.subscribe(tty_target)
    @logger.terminal('Hello world')
    assert_equal('Hello world', tty_target.data[0][:message])
    @logger.unsubscribe(id)
  end

  test "extra debugging data" do 
    @logger.level = :debug
    @logger.info("Hello world")
    event = @target.data[0]
    assert(event.include?(:file), "At debug level, there should be a :file attribute")
    assert(event.include?(:line), "At debug level, there should be a :line attribute")
    assert(event.include?(:method), "At debug level, there should be a :method attribute")
  end

  test "extra debugging data absent if log level is not debug" do 
    @logger.level = :info
    @logger.info("Hello world")
    event = @target.data[0]
    assert(!event.include?(:file), "At non-debug level, there should not be a :file attribute")
    assert(!event.include?(:line), "At non-debug level, there should not be a :line attribute")
    assert(!event.include?(:method), "At non-debug level, there should not be a :method attribute")
  end

  test "invalid arguments to logger.info raises ArgumentError" do
    assert_raises(ArgumentError, "logger.info() should raise ArgumentError") do
      @logger.info()
    end

    assert_raises(ArgumentError, "logger.info('foo', 'bar') should raise " \
                  "ArgumentError because 'bar' is not a Hash.") do
      @logger.info("foo", "bar")
    end

    assert_raises(ArgumentError, "logger.info('foo', { 'foo': 'bar' }, 'baz')" \
                  "should raise ArgumentError for too many arguments") do
      @logger.info("foo", { "foo" => "bar" }, "bar")
    end
  end

  test "output to queue" do
    require "thread"
    queue = Queue.new
    @logger.subscribe(queue)

    @logger.info("Hello world")
    event = queue.pop
    assert_equal("Hello world", event[:message])
    assert_equal(:info, event[:level])
  end
end # describe Cabin::Channel do
