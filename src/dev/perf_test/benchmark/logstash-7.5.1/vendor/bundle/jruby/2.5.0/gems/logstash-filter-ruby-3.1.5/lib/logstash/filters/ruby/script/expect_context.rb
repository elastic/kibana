# Handle expect blocks inside of test blocks
class ExpectContext
  include ::LogStash::Util::Loggable

  attr_reader :name

  def initialize(test_context, name, block)
    @test_context = test_context
    @name = name
    @block = block
  end

  def to_s
    "<Expect #{@test_context.name}/#{self.name}>"
  end

  def execute(events)
    begin
      if @block.call(events)
        return :passed
      else
        result = :failed
        message = "***TEST FAILURE FOR: '#{@test_context.name} #{@name}'***"
        log_hash = {}
      end
    rescue => e
      result = :errored
      message = "***TEST RAISED ERROR: '#{@test_context.name} #{@name}'***"
      log_hash = { "exception" => e.inspect, "backtrace" => e.backtrace }
    end
    script_path = @test_context.script_context.script.script_path
    log_hash.merge!({
      :parameters => @test_context.parameters,
      :in_events => @test_context.in_events.map(&:to_hash_with_metadata),
      :results => events.map(&:to_hash_with_metadata)
    })
    logger.error(message, log_hash)
    result
  end
end
