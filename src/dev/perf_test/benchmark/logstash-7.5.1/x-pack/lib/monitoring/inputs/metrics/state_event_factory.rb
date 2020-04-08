# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#
module LogStash; module Inputs; class Metrics;
  class StateEventFactory
    require "logstash/config/lir_serializer"
    def initialize(pipeline)
      raise ArgumentError, "No pipeline passed in!" unless pipeline.is_a?(LogStash::Pipeline) || pipeline.is_a?(LogStash::JavaPipeline)
      @event = LogStash::Event.new

      @event.set("[@metadata]", {
        "document_type" => "logstash_state",
        "timestamp" => Time.now
      })

      @event.set("[pipeline]", pipeline_data(pipeline))

      @event.remove("@timestamp")
      @event.remove("@version")

      @event
    end

    def pipeline_data(pipeline)
      {
        "id" => pipeline.pipeline_id,
        "hash" => pipeline.lir.unique_hash,
        "ephemeral_id" => pipeline.ephemeral_id,
        "workers" =>  pipeline.settings.get("pipeline.workers"),
        "batch_size" =>  pipeline.settings.get("pipeline.batch.size"),
        "representation" => ::LogStash::Config::LIRSerializer.serialize(pipeline.lir)
      }
    end

    def make
      @event
    end
  end
end; end; end

