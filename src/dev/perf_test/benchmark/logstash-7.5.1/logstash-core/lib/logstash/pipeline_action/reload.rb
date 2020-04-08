# encoding: utf-8
require "logstash/pipeline_action/base"
require "logstash/pipeline_action/create"
require "logstash/pipeline_action/stop"

module LogStash module PipelineAction
  class Reload < Base
    include LogStash::Util::Loggable

    def initialize(pipeline_config, metric)
      @pipeline_config = pipeline_config
      @metric = metric
    end

    def pipeline_id
      @pipeline_config.pipeline_id
    end

    def to_s
      "PipelineAction::Reload<#{pipeline_id}>"
    end

    def execute(agent, pipelines_registry)
      old_pipeline = pipelines_registry.get_pipeline(pipeline_id)

      if old_pipeline.nil?
        return LogStash::ConvergeResult::FailedAction.new("Cannot reload pipeline, because the pipeline does not exist")
      end

      if !old_pipeline.reloadable?
        return LogStash::ConvergeResult::FailedAction.new("Cannot reload pipeline, because the existing pipeline is not reloadable")
      end

      java_exec = @pipeline_config.settings.get_value("pipeline.java_execution")

      begin
        pipeline_validator = java_exec ? LogStash::JavaBasePipeline.new(@pipeline_config, nil, logger, nil) : LogStash::BasePipeline.new(@pipeline_config)
      rescue => e
        return LogStash::ConvergeResult::FailedAction.from_exception(e)
      end

      if !pipeline_validator.reloadable?
        return LogStash::ConvergeResult::FailedAction.new("Cannot reload pipeline, because the new pipeline is not reloadable")
      end

      logger.info("Reloading pipeline", "pipeline.id" => pipeline_id)

      success = pipelines_registry.reload_pipeline(pipeline_id) do
        # important NOT to explicitly return from block here
        # the block must emit a success boolean value

        # First shutdown old pipeline
        old_pipeline.shutdown { LogStash::ShutdownWatcher.start(old_pipeline) }
        old_pipeline.thread.join

        # Then create a new pipeline
        new_pipeline = java_exec ? LogStash::JavaPipeline.new(@pipeline_config, @metric, agent) : LogStash::Pipeline.new(@pipeline_config, @metric, agent)
        success = new_pipeline.start # block until the pipeline is correctly started or crashed

        # return success and new_pipeline to registry reload_pipeline
        [success, new_pipeline]
      end

      LogStash::ConvergeResult::ActionResult.create(self, success)
    end

  end
end end
