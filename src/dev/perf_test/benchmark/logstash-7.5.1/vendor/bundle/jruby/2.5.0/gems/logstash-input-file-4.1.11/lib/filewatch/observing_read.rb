# encoding: utf-8
require "logstash/util/loggable"
require_relative "read_mode/processor"

module FileWatch
  class ObservingRead
    include LogStash::Util::Loggable
    include ObservingBase

    def subscribe(observer)
      # observer here is the file input
      watch.subscribe(observer, sincedb_collection)
      sincedb_collection.write("read mode subscribe complete - shutting down")
    end

    private

    def build_specific_processor(settings)
      ReadMode::Processor.new(settings)
    end
  end
end
