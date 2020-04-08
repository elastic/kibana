# encoding: utf-8
require "logstash/api/commands/base"
require 'logstash/util/thread_dump'
require 'logstash/config/pipelines_info'
require_relative "hot_threads_reporter"

java_import java.nio.file.Files
java_import java.nio.file.Paths

module LogStash
  module Api
    module Commands
      class Stats < Commands::Base
        def queue
          pipeline_ids = service.get_shallow(:stats, :pipelines).keys
          total_queued_events = 0
          pipeline_ids.each do |pipeline_id|
            p_stats = service.get_shallow(:stats, :pipelines, pipeline_id.to_sym)
            type = p_stats[:queue] && p_stats[:queue][:type].value
            pipeline = service.agent.get_pipeline(pipeline_id)
            next if pipeline.nil? || pipeline.system? || type != 'persisted'
            total_queued_events += p_stats[:queue][:events].value
          end

          {:events_count => total_queued_events}
        end

        def jvm
          {
            :threads => extract_metrics(
              [:jvm, :threads],
              :count,
              :peak_count
            ),
            :mem => memory,
            :gc => gc,
            :uptime_in_millis => service.get_shallow(:jvm, :uptime_in_millis),
          }
        end

        def reloads
          service.get_shallow(:stats, :reloads)
        end

        def process
          extract_metrics(
            [:jvm, :process],
            :open_file_descriptors,
            :peak_open_file_descriptors,
            :max_file_descriptors,
            [:mem, [:total_virtual_in_bytes]],
            [:cpu, [:total_in_millis, :percent, :load_average]]
          )
        end

        def events
          extract_metrics(
            [:stats, :events],
            :in, :filtered, :out, :duration_in_millis, :queue_push_duration_in_millis
          )
        end

        def pipeline(pipeline_id = nil, opts={})
          extended_stats = LogStash::Config::PipelinesInfo.format_pipelines_info(
            service.agent,
            service.snapshot.metric_store,
            true).each_with_object({}) do |pipeline_stats, memo|
              p_id = pipeline_stats["id"].to_s
              memo[p_id] = pipeline_stats
            end

          if pipeline_id.nil?
            pipeline_ids = service.get_shallow(:stats, :pipelines).keys
            pipeline_ids.each_with_object({}) do |pipeline_id, result|
              extended_pipeline = extended_stats[pipeline_id.to_s]
              result[pipeline_id] = plugins_stats_report(pipeline_id, extended_pipeline, opts)
            end
          else
            extended_pipeline = extended_stats[pipeline_id.to_s]
            { pipeline_id => plugins_stats_report(pipeline_id, extended_pipeline, opts) }
          end
        rescue # failed to find pipeline
          {}
        end

        def memory
          memory = service.get_shallow(:jvm, :memory)
          {
            :heap_used_percent => memory[:heap][:used_percent],
            :heap_committed_in_bytes => memory[:heap][:committed_in_bytes],
            :heap_max_in_bytes => memory[:heap][:max_in_bytes],
            :heap_used_in_bytes => memory[:heap][:used_in_bytes],
            :non_heap_used_in_bytes => memory[:non_heap][:used_in_bytes],
            :non_heap_committed_in_bytes => memory[:non_heap][:committed_in_bytes],
            :pools => memory[:pools].inject({}) do |acc, (type, hash)|
              hash.delete("committed_in_bytes")
              acc[type] = hash
              acc
            end
          }
        end

        def os
          service.get_shallow(:os)
        rescue
          # The only currently fetch OS information is about the linux
          # containers.
          {}
        end

        def gc
          service.get_shallow(:jvm, :gc)
        end

        def hot_threads(options={})
          HotThreadsReport.new(self, options)
        end

        private
        def plugins_stats_report(pipeline_id, extended_pipeline, opts={})
          stats = service.get_shallow(:stats, :pipelines, pipeline_id.to_sym)
          PluginsStats.report(stats, extended_pipeline, opts)
        end

        module PluginsStats
          module_function

          def plugin_stats(stats, plugin_type)
            # Turn the `plugins` stats hash into an array of [ {}, {}, ... ]
            # This is to produce an array of data points, one point for each
            # plugin instance.
            return [] unless stats[:plugins] && stats[:plugins].include?(plugin_type)
            stats[:plugins][plugin_type].collect do |id, data|
              { :id => id }.merge(data)
            end
          end

          def report(stats, extended_stats=nil, opts={})
            ret = {
              :events => stats[:events],
              :plugins => {
                :inputs => plugin_stats(stats, :inputs),
                :codecs => plugin_stats(stats, :codecs),
                :filters => plugin_stats(stats, :filters),
                :outputs => plugin_stats(stats, :outputs)
              },
              :reloads => stats[:reloads],
              :queue => stats[:queue]
            }
            ret[:dead_letter_queue] = stats[:dlq] if stats.include?(:dlq)

            # if extended_stats were provided, enrich the return value
            if extended_stats
              ret[:queue]    = extended_stats["queue"] if extended_stats.include?("queue")
              ret[:hash] = extended_stats["hash"]
              ret[:ephemeral_id] = extended_stats["ephemeral_id"]
              if opts[:vertices] && extended_stats.include?("vertices")
                ret[:vertices] = extended_stats["vertices"].map { |vertex| decorate_vertex(vertex) }
              end
            end

            ret
          end

          ##
          # Returns a vertex, decorated with additional metadata if available.
          # Does not mutate the passed `vertex` object.
          # @api private
          # @param vertex [Hash{String=>Object}]
          # @return [Hash{String=>Object}]
          def decorate_vertex(vertex)
            plugin_id = vertex["id"]&.to_s
            return vertex unless plugin_id && LogStash::PluginMetadata.exists?(plugin_id)

            plugin_metadata = LogStash::PluginMetadata.for_plugin(plugin_id)
            cluster_uuid = plugin_metadata&.get(:cluster_uuid)
            vertex = vertex.merge("cluster_uuid" => cluster_uuid) unless cluster_uuid.nil?

            vertex
          end
        end # module PluginsStats
      end
    end
  end
end
