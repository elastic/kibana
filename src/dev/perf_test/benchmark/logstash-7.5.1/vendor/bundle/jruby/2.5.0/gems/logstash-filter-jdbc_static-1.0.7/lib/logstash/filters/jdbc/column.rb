# encoding: utf-8
require_relative "validatable"

module LogStash module Filters module Jdbc
  class Column < Validatable
    attr_reader :name, :datatype

    private

    def post_initialize
      if valid?
        @name = @name.to_sym
        @datatype = @datatype.to_sym
      end
    end

    def to_array
      [@name.to_s, @datatype.to_s]
    end

    def parse_options
      unless @options.is_a?(Array)
        @option_errors << "The column options must be an array"
      end

      @name, @datatype = @options

      unless @name && @name.is_a?(String)
        @option_errors << "The first column option is the name and must be a string"
      end

      unless @datatype && @datatype.is_a?(String)
        @option_errors << "The second column option is the datatype and must be a string"
      end

      @valid = @option_errors.empty?
    end
  end
end end end
