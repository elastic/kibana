# encoding: utf-8
require "logstash/inputs/beats"

module LogStash module Inputs class Beats
  # Use the new callback based approch instead of using blocks
  # so we can retain some context of the execution, and make it easier to test
  class CodecCallbackListener
    attr_accessor :data
    # The path acts as the `stream_identity`, 
    # usefull when the clients is reading multiples files
    attr_accessor :path

    def initialize(data, hash, path, transformer, queue)
      @data = data
      @hash = hash 
      @path = path
      @queue = queue
      @transformer = transformer
    end

    def process_event(event)
      @transformer.transform(event, @hash)
      @queue << event
    end
  end
end; end; end
