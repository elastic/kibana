# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#
module LogStash; module Inputs; class Metrics;
  class StatsEventFactory
    include ::LogStash::Util::Loggable
    require 'logstash/config/pipelines_info'

    def initialize(global_stats, snapshot)
      @global_stats = global_stats
      @snapshot = snapshot
      @metric_store = @snapshot.metric_store
    end

    def make(agent, extended_performance_collection=true)
      LogStash::Event.new(
        "timestamp" => @snapshot.created_at,
        "logstash" => fetch_node_stats(agent, @metric_store),
        "events" => format_global_event_count(@metric_store),
        "process" => format_process_stats(@metric_store),
        "pipelines" => LogStash::Config::PipelinesInfo.format_pipelines_info(agent, @metric_store, extended_performance_collection),
        "reloads" => format_reloads(@metric_store),
        "jvm" => format_jvm_stats(@metric_store),
        "os" => format_os_stats(@metric_store),
        "queue" => format_queue_stats(agent, @metric_store),
        "@metadata" => {
          "document_type" => "logstash_stats",
          "timestamp" => Time.now
        }
      )
    end

    def format_process_stats(stats)
      stats.extract_metrics([:jvm, :process],
        [:cpu, :percent],
        :open_file_descriptors,
        :max_file_descriptors
      )
    end

    def format_jvm_stats(stats)
      result = stats.extract_metrics([:jvm], :uptime_in_millis)

      heap_stats = stats.extract_metrics([:jvm, :memory, :heap],
                      :used_in_bytes, :used_percent, :max_in_bytes)

      result["mem"] = {
        "heap_used_in_bytes" => heap_stats[:used_in_bytes],
        "heap_used_percent" => heap_stats[:used_percent],
          "heap_max_in_bytes" => heap_stats[:max_in_bytes],
        }

      result["gc"] = {
        "collectors" => {
          "old" => stats.extract_metrics([:jvm, :gc, :collectors, :old],
                        :collection_time_in_millis, :collection_count),
          "young" => stats.extract_metrics([:jvm, :gc, :collectors, :young],
                        :collection_time_in_millis, :collection_count)
        }
      }

      result
    end

    def format_os_stats(stats)
      load_average = stats.extract_metrics([:jvm, :process, :cpu], :load_average)
      if os_stats?(stats)
        cpuacct = stats.extract_metrics([:os, :cgroup, :cpuacct], :control_group, :usage_nanos)
        cgroups_stats = stats.extract_metrics([:os, :cgroup, :cpu, :stat], :number_of_elapsed_periods, :number_of_times_throttled, :time_throttled_nanos)
        control_group = stats.get_shallow(:os, :cgroup, :cpu, :control_group).value
        {:cpu => load_average, :cgroup => {:cpuacct =>  cpuacct, :cpu => {:control_group => control_group, :stat => cgroups_stats}}}
      else
        {:cpu => load_average}
      end
    end

    # OS stats are not available on all platforms
    # TODO: replace exception logic with has_keys? when it is implemented in MetricStore
    def os_stats?(stats)
      stats.get_shallow(:os)
      true
    rescue LogStash::Instrument::MetricStore::MetricNotFound
      false
    end

    def format_reloads(stats)
      stats.extract_metrics([:stats, :reloads], :successes, :failures)
    end

    def format_global_event_count(stats)
      stats.extract_metrics([:stats, :events], :in, :filtered, :out, :duration_in_millis)
    end

    def format_queue_stats(agent, stats)
      pipelines_stats = stats.get_shallow(:stats, :pipelines)

      total_queued_events = 0
      pipelines_stats.each do |pipeline_id, p_stats|
        type = p_stats[:queue] && p_stats[:queue][:type].value
        pipeline = agent.get_pipeline(pipeline_id)
        # Check if pipeline is nil to avoid race condition where metrics system refers pipeline that has been stopped already
        next if pipeline.nil? || pipeline.system? || type != 'persisted'
        total_queued_events += p_stats[:queue][:events].value
      end

      {:events_count => total_queued_events}
    end

    def fetch_node_stats(agent, stats)
      @global_stats.merge({
        "http_address" => stats.get_shallow(:http_address).value,
        "ephemeral_id" => agent.ephemeral_id
      })
    end
  end
end; end; end
