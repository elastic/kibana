# encoding: utf-8

module LogStash module PluginMixins module JdbcStreaming
  class ParameterHandler

    def self.build_parameter_handler(given_value)
      # does it really make sense to deal with normal parameters differently?
      handler = FieldParameter.new(given_value)
      return handler unless given_value.is_a?(String)

      first_percent_curly = given_value.index("%{")
      if first_percent_curly && given_value.index("}", first_percent_curly)
        return InterpolatedParameter.new(given_value)
      end

      handler
    end

    def self.build_bind_value_handler(given_value)
      handler = ConstantParameter.new(given_value)

      return handler unless given_value.is_a?(String) # allow non String constants

      first_percent_curly = given_value.index("%{")
      if first_percent_curly && given_value.index("}", first_percent_curly)
        return InterpolatedParameter.new(given_value)
      end

      if given_value =~ /\A\s*\[[^\]]+\]\s*\z/
        return FieldParameter.new(given_value)
      end

      handler
    end

    attr_reader :given_value

    def initialize(given_value)
      @given_value = given_value
    end

    def extract_from(event)
      # override in subclass
    end
  end

  class InterpolatedParameter < ParameterHandler
    def extract_from(event)
      event.sprintf(@given_value)
    end
  end

  class FieldParameter < ParameterHandler
    def extract_from(event)
      event.get(@given_value)
    end
  end

  class ConstantParameter < ParameterHandler
    def extract_from(event)
      @given_value
    end
  end
end end end
