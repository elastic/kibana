class LogStash::Filters::Ruby::Script
  include ::LogStash::Util::Loggable
  require "logstash/filters/ruby/script/context"

  attr_reader :content, :script_path

  def initialize(script_path, parameters)
    @content = File.read(script_path)
    @script_path = script_path
    @context = Context.new(self, parameters)
  end

  def load
    @context.load_script

    if !@context.execution_context.methods.include?(:filter)
      raise "Script does not define a filter! Please ensure that you have defined a filter method!"
    end
  rescue => e
    raise ::LogStash::Filters::Ruby::ScriptError.new("Error during load of '#{script_path}': #{e.inspect}")
  end

  def register
    @context.execute_register
  rescue => e
    raise ::LogStash::Filters::Ruby::ScriptError.new("Error during register of '#{script_path}': #{e.inspect}")
  end

  def execute(event)
    @context.execute_filter(event)
  end

  def test
    results = @context.execute_tests
    logger.info("Test run complete", :script_path => script_path, :results => results)
    if results[:failed] > 0 || results[:errored] > 0
      raise ::LogStash::Filters::Ruby::ScriptError.new("Script '#{script_path}' had #{results[:failed] + results[:errored]} failing tests! Check the error log for details.")
    end
  end
end
