class LogStash::Filters::Ruby::Script::Context
  require "logstash/filters/ruby/script/execution_context"
  require "logstash/filters/ruby/script/test_context"

  include ::LogStash::Util::Loggable

  attr_reader :script,
              :execution_context

  def initialize(script, parameters)
    @script = script
    @script_path = @script.script_path
    @parameters = parameters
    @test_contexts = []
    @script_lock = Mutex.new
    @concurrency = :single
  end

  def make_execution_context(name, test_mode)
    execution_context = LogStash::Filters::Ruby::Script::ExecutionContext.new(name, logger)

    # Proxy all the methods from this instance needed to be run from the execution context
    this = self # We need to use a clojure to retain access to this object
    # If we aren't in test mode we define the test. If we *are* then we don't define anything
    # since our tests are already defined
    if test_mode
      execution_context.define_singleton_method(:test) {|name,&block| nil }
    else
      execution_context.define_singleton_method(:test) {|name,&block| this.test(name, &block) }
    end
    execution_context
  end

  def load_execution_context(ec)
    ec.instance_eval(@script.content, @script_path, 1)
  end

  def load_script
    @execution_context = self.make_execution_context(:main, false)
    load_execution_context(@execution_context)
  end

  def execute_register()
    @execution_context.register(@parameters)
  end

  def concurrency(type)
    @concurrency = type
  end

  def execute_filter(event)
    if @concurrency == :shared
      @script_lock.synchronize { @execution_context.filter(event) }
    else
      @execution_context.filter(event)
    end
  end

  def execute_tests
    @test_contexts.
      map(&:execute).
      reduce({:passed => 0, :failed => 0, :errored => 0}) do |acc,res|
        acc[:passed] += res[:passed]
        acc[:failed] += res[:failed]
        acc[:errored] += res[:errored]
        acc
      end
  end

  def test(name, &block)
    test_context = LogStash::Filters::Ruby::Script::TestContext.new(self, name)
    test_context.instance_eval(&block)
    @test_contexts << test_context
  end
end
