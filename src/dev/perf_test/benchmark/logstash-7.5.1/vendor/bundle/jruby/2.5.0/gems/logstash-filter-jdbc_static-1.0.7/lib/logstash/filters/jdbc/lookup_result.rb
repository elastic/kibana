# encoding: utf-8
module LogStash module Filters module Jdbc
  class LookupResult
    attr_reader :payload, :invalid_parameters

    def initialize
      @failure = false
      @payload = []
      @invalid_parameters = []
    end

    def push(data)
      @payload << data
    end

    def invalid_parameters_push(data)
      @invalid_parameters << data
    end

    def failed!
      @failure = true
    end

    def valid?
      !failed? && @invalid_parameters.empty?
    end

    def failed?
      @failure
    end

    def parameters_invalid?
      !@invalid_parameters.empty?
    end

    def empty?
      @payload.empty?
    end
  end
end end end
