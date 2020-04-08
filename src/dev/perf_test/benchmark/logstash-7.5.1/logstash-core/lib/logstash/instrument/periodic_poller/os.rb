# encoding: utf-8
require "logstash/instrument/periodic_poller/base"
require "logstash/instrument/periodic_poller/cgroup"

module LogStash module Instrument module PeriodicPoller
  class Os < Base
    def initialize(metric, options = {})
      super(metric, options)
    end

    def collect
      collect_cgroup
    end

    def collect_cgroup
      if stats = Cgroup.get
        save_metric([:os], :cgroup, stats)
      end
    end

    # Recursive function to create the Cgroups values form the created hash
    def save_metric(namespace, k, v)
      if v.is_a?(Hash)
        v.each do |new_key, new_value|
          n = namespace.dup
          n << k.to_sym
          save_metric(n, new_key, new_value)
        end
      else
        metric.gauge(namespace, k.to_sym, v)
      end
    end
  end
end; end; end
