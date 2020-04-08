# encoding: utf-8
module LogStash
  module Api
    module Modules
      class Stats < ::LogStash::Api::Modules::Base
        def stats_command
          factory.build(:stats)
        end

        # return hot threads information
        get "/jvm/hot_threads" do
          begin
            top_threads_count = params["threads"] || 10
            ignore_idle_threads = params["ignore_idle_threads"] || true
            options = {
              :threads => top_threads_count.to_i,
              :ignore_idle_threads => as_boolean(ignore_idle_threads)
            }

            respond_with(stats_command.hot_threads(options))
          rescue ArgumentError => e
            response = respond_with({"error" => e.message})
            status(400)
            response
          end
        end

        # return hot threads information
        get "/jvm/memory" do
          respond_with({ :memory => stats_command.memory })
        end

        get "/?:filter?" do
          payload = {
            :events => stats_command.events,
            :jvm => {
              :timestamp => stats_command.started_at,
              :uptime_in_millis => stats_command.uptime,
              :memory => stats_command.memory,
            },
            :os => stats_command.os
          }
          respond_with(payload, {:filter => params["filter"]})
        end
      end
    end
  end
end
