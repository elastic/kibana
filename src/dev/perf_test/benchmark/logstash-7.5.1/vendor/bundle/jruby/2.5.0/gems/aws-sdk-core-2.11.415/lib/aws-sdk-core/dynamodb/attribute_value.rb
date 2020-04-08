require 'bigdecimal'
require 'stringio'
require 'set'

module Aws
  module DynamoDB
    # @api private
    class AttributeValue

      def initialize
        @marshaler = Marshaler.new
        @unmarshaler = Unmarshaler.new
      end

      def marshal(value)
        @marshaler.format(value)
      end

      def unmarshal(value)
        @unmarshaler.format(value)
      end

      class Marshaler
        STRINGY_TEST = lambda { |val| val.respond_to?(:to_str) }

        def format(obj)
          case obj
          when Hash
            obj.each.with_object(m:{}) do |(key, value), map|
              map[:m][key.to_s] = format(value)
            end
          when Array
            obj.each.with_object(l:[]) do |value, list|
              list[:l] << format(value)
            end
          when String then { s: obj }
          when Symbol then { s: obj.to_s }
          when STRINGY_TEST then { s: obj.to_str }
          when Numeric then { n: obj.to_s }
          when StringIO, IO then { b: obj }
          when Set then format_set(obj)
          when true, false then { bool: obj }
          when nil then { null: true }
          else
            msg = "unsupported type, expected Hash, Array, Set, String, Numeric, "
            msg << "IO, true, false, or nil, got #{obj.class.name}"
            raise ArgumentError, msg
          end
        end

        private

        def format_set(set)
          return { es: [] } if set.empty?
          case set.first
          when String, Symbol then { ss: set.map(&:to_s) }
          when STRINGY_TEST then { ss: set.map(&:to_str) }
          when Numeric then { ns: set.map(&:to_s) }
          when StringIO, IO then { bs: set.to_a }
          else
            msg = "set types only support String, Numeric, or IO objects"
            raise ArgumentError, msg
          end
        end

      end

      class Unmarshaler

        def format(obj)
          type, value = extract_type_and_value(obj)
          case type
          when :m
            value.each.with_object({}) do |(k, v), map|
              map[k] = format(v)
            end
          when :l then value.map { |v| format(v) }
          when :s then value
          when :n then BigDecimal(value)
          when :b then StringIO.new(value)
          when :null then nil
          when :bool then value
          when :ss then Set.new(value)
          when :ns then Set.new(value.map { |n| BigDecimal(n) })
          when :bs then Set.new(value.map { |b| StringIO.new(b) })
          when :es then Set.new
          else
            raise ArgumentError, "unhandled type #{type.inspect}"
          end
        end

        private

        def extract_type_and_value(obj)
          case obj
          when Hash then obj.to_a.first
          when Struct
            obj.members.each do |key|
              value = obj[key]
              return [key, value] unless value.nil?
            end
          else
            raise ArgumentError, "unhandled type #{obj.inspect}"
          end
        end

      end
    end
  end
end
