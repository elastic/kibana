module LogStash
  module Util
    class TimeValue
      def initialize(duration, time_unit)
        @duration = duration
        @time_unit = time_unit
      end

      def self.from_value(value)
        if value.is_a?(TimeValue)
          TimeValue.new(value.duration, value.time_unit)
        elsif value.is_a?(::String)
          normalized = value.downcase.strip
          if normalized.end_with?("nanos")
            TimeValue.new(parse(normalized, 5), :nanosecond)
          elsif normalized.end_with?("micros")
            TimeValue.new(parse(normalized, 6), :microsecond)
          elsif normalized.end_with?("ms")
            TimeValue.new(parse(normalized, 2), :millisecond)
          elsif normalized.end_with?("s")
            TimeValue.new(parse(normalized, 1), :second)
          elsif normalized.end_with?("m")
            TimeValue.new(parse(normalized, 1), :minute)
          elsif normalized.end_with?("h")
            TimeValue.new(parse(normalized, 1), :hour)
          elsif normalized.end_with?("d")
            TimeValue.new(parse(normalized, 1), :day)
          elsif normalized =~ /^-0*1/
            TimeValue.new(-1, :nanosecond)
          else
            raise ArgumentError.new("invalid time unit: \"#{value}\"")
          end
        else
          raise ArgumentError.new("value is not a string: #{value} [#{value.class}]")
        end
      end

      def to_nanos
        case @time_unit
        when :day
          86400000000000 * @duration
        when :hour
          3600000000000 * @duration
        when :minute
          60000000000 * @duration
        when :second
          1000000000 * @duration
        when :millisecond
          1000000 * @duration
        when :microsecond
          1000 * @duration
        when :nanosecond
          @duration
        end
      end

      def ==(other)
        self.duration == other.duration and self.time_unit == other.time_unit
      end

      def self.parse(value, suffix)
        Integer(value[0..(value.size - suffix - 1)].strip)
      end

      private_class_method :parse
      attr_reader :duration
      attr_reader :time_unit
    end
  end
end
