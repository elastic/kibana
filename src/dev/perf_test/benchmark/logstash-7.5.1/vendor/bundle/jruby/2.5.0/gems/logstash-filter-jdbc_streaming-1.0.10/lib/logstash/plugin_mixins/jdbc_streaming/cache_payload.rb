# encoding: utf-8

module LogStash module PluginMixins module JdbcStreaming
  class CachePayload
    attr_reader :payload

    def initialize
      @failure = false
      @payload = []
    end

    def push(data)
      @payload << data
    end

    def failed!
      @failure = true
    end

    def failed?
      @failure
    end

    def empty?
      @payload.empty?
    end
  end
end end end
