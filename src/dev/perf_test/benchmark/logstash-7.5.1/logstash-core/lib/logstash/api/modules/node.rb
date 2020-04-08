# encoding: utf-8
require "logstash/api/modules/base"
require "logstash/api/errors"

module LogStash
  module Api
    module Modules
      class Node < ::LogStash::Api::Modules::Base
        def node
          factory.build(:node)
        end

        get "/hot_threads" do
          begin
            ignore_idle_threads = params["ignore_idle_threads"] || true
            options = {:ignore_idle_threads => as_boolean(ignore_idle_threads)}
            options[:threads] = params["threads"].to_i if params.has_key?("threads")
            options[:ordered_by] = params["ordered_by"] if params.has_key?("ordered_by")
            options[:stacktrace_size] = params["stacktrace_size"] if params.has_key?("stacktrace_size")

            as = human? ? :string : :json
            respond_with(node.hot_threads(options), {:as => as})
          rescue ArgumentError => e
            response = respond_with({"error" => e.message})
            status(400)
            response
          end
        end

        get "/pipelines/:id" do
          pipeline_id = params["id"]
          opts = {:graph => as_boolean(params.fetch("graph", false)),
                  :vertices => as_boolean(params.fetch("vertices", false))}
          payload = node.pipeline(pipeline_id, opts)
          halt(404) if payload.empty?
          respond_with(:pipelines => { pipeline_id => payload } )
        end

        get "/pipelines" do
          opts = {:graph => as_boolean(params.fetch("graph", false)),
                  :vertices => as_boolean(params.fetch("vertices", false))}
          payload = node.pipelines(opts)
          halt(404) if payload.empty?
          respond_with(:pipelines => payload )
        end

         get "/?:filter?" do
           selected_fields = extract_fields(params["filter"].to_s.strip)
           values = node.all(selected_fields)

           if values.size == 0
             raise NotFoundError
           else
             respond_with(values)
           end
         end
      end
    end
  end
end
