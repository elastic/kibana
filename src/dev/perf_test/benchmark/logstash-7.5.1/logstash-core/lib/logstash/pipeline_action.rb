# encoding: utf-8
require "logstash/pipeline_action/base"
require "logstash/pipeline_action/create"
require "logstash/pipeline_action/stop"
require "logstash/pipeline_action/reload"

module LogStash module PipelineAction
  ORDERING = {
    LogStash::PipelineAction::Create => 100,
    LogStash::PipelineAction::Reload => 200,
    LogStash::PipelineAction::Stop => 300
  }
end end
