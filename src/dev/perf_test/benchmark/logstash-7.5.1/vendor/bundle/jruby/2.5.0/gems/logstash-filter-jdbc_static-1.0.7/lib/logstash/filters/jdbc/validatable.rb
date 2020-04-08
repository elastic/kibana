# encoding: utf-8
module LogStash module Filters module Jdbc
  class Validatable
    def self.find_validation_errors(options)
      array_of_options = Array(options)
      errors = []
      array_of_options.each do |options|
        instance = new(options)
        unless instance.valid?
          errors << instance.formatted_errors
        end
      end
      return nil if errors.empty?
      errors.join("; ")
    end

    def initialize(options)
      pre_initialize(options)
      @options = options
      @valid = false
      @option_errors = []
      parse_options
      post_initialize
    end

    def valid?
      @valid
    end

    def formatted_errors
      @option_errors.join(", ")
    end

    private

    def pre_initialize(options)
    end

    def post_initialize
    end

    def parse_options
      raise "Subclass must implement 'parse_options'"
    end
  end
end end end
