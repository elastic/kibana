# encoding: utf-8
# I've decided to take the action strategy, I think this make the code a bit easier to understand.
# maybe in the context of config management we will want to have force kill on the
# threads instead of waiting forever or sending feedback to the host
#
# Some actions could be retryable, or have a delay or timeout.
module LogStash module PipelineAction
  class Base
    # Only used for debugging purpose and in the logger statement.
    def inspect
      "#{self.class.name}/pipeline_id:#{pipeline_id}"
    end
    alias_method :to_s, :inspect

    def execute(agent, pipelines_registry)
      raise "`#execute` Not implemented!"
    end

    # See the definition in `logstash/pipeline_action.rb` for the default ordering
    def execution_priority
      ORDERING.fetch(self.class)
    end

    def <=>(other)
      order = self.execution_priority <=> other.execution_priority
      order.nonzero? ? order : self.pipeline_id <=> other.pipeline_id
    end
  end
end end
