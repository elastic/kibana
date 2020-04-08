# encoding: utf-8
require "logstash/pipeline_action/base"

module LogStash module PipelineAction
  class Stop < Base
    attr_reader :pipeline_id

    def initialize(pipeline_id)
      @pipeline_id = pipeline_id
    end

    def execute(agent, pipelines_registry)
      pipelines_registry.terminate_pipeline(pipeline_id) do |pipeline|
        pipeline.shutdown { LogStash::ShutdownWatcher.start(pipeline) }
        pipeline.thread.join
      end

      LogStash::ConvergeResult::SuccessfulAction.new
    end

    def to_s
      "PipelineAction::Stop<#{pipeline_id}>"
    end
  end
end end
