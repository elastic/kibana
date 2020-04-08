# Handle top level test blocks
class LogStash::Filters::Ruby::Script::TestContext
  require "logstash/filters/ruby/script/expect_context"
  attr_reader :name, :script_context

  def initialize(script_context, name)
    @name = name
    @script_context = script_context
    @expect_contexts = []
    @parameters = {}
    @execution_context = script_context.make_execution_context("Test/#{name}", true)
    @script_context.load_execution_context(@execution_context)
  end

  def parameters(&block)
    # Can act as a reader if no block passed
    return @parameters unless block

    @parameters = block.call
    if !@parameters.is_a?(Hash)
      raise ArgumentError, "Test parameters must be a hash in #{@name}!"
    end

    @execution_context.register(@parameters)
  end

  def in_event(&block)
    return @in_events unless block

    orig = block.call
    event_hashes = orig.is_a?(Hash) ? [orig] : orig
    event_hashes.each do |e|
      if !e.is_a?(Hash)
        raise ArgumentError,
          "In event for #{self.name} must receive either a hash or an array of hashes! got a '#{e.class}' in #{event_hashes.inspect}"
      end
    end
    @in_events = Array(event_hashes).map {|h| ::LogStash::Event.new(h) }
  end
  alias_method :in_events, :in_event

  def execute
    if !@in_events
      raise "You must declare an `in_event` to run tests!"
    end

    results = []
    @in_events.each do |e|
      single_result = @execution_context.filter(e)
      ::LogStash::Filters::Ruby.check_result_events!(single_result)
      results += single_result
    end

    @expect_contexts.map do |ec|
      ec.execute(results)
    end.reduce({:passed => 0, :failed => 0, :errored => 0}) do |acc,res|
      acc[res] += 1
      acc
    end
  end

  def expect(name, &block)
    @expect_contexts << ExpectContext.new(self, name, block)
  end
end
