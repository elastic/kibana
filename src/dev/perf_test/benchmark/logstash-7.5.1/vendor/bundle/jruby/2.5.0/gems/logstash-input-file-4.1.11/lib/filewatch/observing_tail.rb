# encoding: utf-8
require "logstash/util/loggable"
require_relative 'tail_mode/processor'

module FileWatch
  class ObservingTail
    include LogStash::Util::Loggable
    include ObservingBase

    def subscribe(observer)
      # observer here is the file input
      watch.subscribe(observer, sincedb_collection)
      sincedb_collection.write("tail mode subscribe complete - shutting down")
    end

    private

    def build_specific_processor(settings)
      TailMode::Processor.new(settings)
    end
  end
end
