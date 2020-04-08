# encoding: utf-8
module LogStash
  module Api
    module Modules
      class NodeStats < ::LogStash::Api::Modules::Base

        before do
          @stats = factory.build(:stats)
        end

        get "/pipelines/:id?" do
          payload = pipeline_payload(params["id"])
          halt(404) if payload.empty?
          respond_with(:pipelines => payload)
        end

        get "/?:filter?" do
          payload = {
            :jvm => jvm_payload,
            :process => process_payload,
            :events => events_payload,
            :pipelines => pipeline_payload,
            :reloads => reloads_payload,
            :os => os_payload,
            :queue => queue
          }
          respond_with(payload, {:filter => params["filter"]})
        end

        private
        def queue
          @stats.queue
        end

        private
        def os_payload
          @stats.os
        end

        def events_payload
          @stats.events
        end

        def jvm_payload
          @stats.jvm
        end

        def reloads_payload
          @stats.reloads
        end

        def process_payload
          @stats.process
        end

        def mem_payload
          @stats.memory
        end

        def pipeline_payload(val = nil)
          opts = {:vertices => as_boolean(params.fetch("vertices", false))}
          @stats.pipeline(val, opts)
        end
      end
    end
  end
end
