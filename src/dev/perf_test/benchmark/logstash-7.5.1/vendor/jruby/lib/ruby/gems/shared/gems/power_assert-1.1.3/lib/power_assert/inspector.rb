require 'power_assert/configuration'

module PowerAssert
  class InspectedValue
    def initialize(value)
      @value = value
    end

    def inspect
      @value
    end
  end
  private_constant :InspectedValue

  class SafeInspectable
    def initialize(value)
      @value = value
    end

    def inspect
      inspected = @value.inspect
      if Encoding.compatible?(Encoding.default_external, inspected)
        inspected
      else
        begin
          "#{inspected.encode(Encoding.default_external)}(#{inspected.encoding})"
        rescue Encoding::UndefinedConversionError, Encoding::InvalidByteSequenceError
          inspected.force_encoding(Encoding.default_external)
        end
      end
    rescue => e
      "InspectionFailure: #{e.class}: #{e.message.each_line.first}"
    end
  end
  private_constant :SafeInspectable

  class Formatter
    def initialize(value, indent)
      @value = value
      @indent = indent
    end

    def inspect
      if PowerAssert.configuration._colorize_message
        if PowerAssert.configuration._use_pp
          width = [Pry::Terminal.width! - 1 - @indent, 10].max
          Pry::ColorPrinter.pp(@value, '', width)
        else
          Pry::Code.new(@value.inspect).highlighted
        end
      else
        if PowerAssert.configuration._use_pp
          PP.pp(@value, '')
        else
          @value.inspect
        end
      end
    end
  end
  private_constant :Formatter
end
