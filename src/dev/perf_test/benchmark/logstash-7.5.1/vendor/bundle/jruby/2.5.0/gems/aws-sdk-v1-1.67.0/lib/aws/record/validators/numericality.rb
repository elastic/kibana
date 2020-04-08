# Copyright 2011-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"). You
# may not use this file except in compliance with the License. A copy of
# the License is located at
#
#     http://aws.amazon.com/apache2.0/
#
# or in the "license" file accompanying this file. This file is
# distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
# ANY KIND, either express or implied. See the License for the specific
# language governing permissions and limitations under the License.

module AWS
  module Record

    # @api private
    class NumericalityValidator < Validator

      ACCEPTED_OPTIONS = [
        :greater_than, :greater_than_or_equal_to,
        :less_than, :less_than_or_equal_to,
        :equal_to, :only_integer, :odd, :even,
        :message, :allow_nil, :allow_blank, :on, :if, :unless,
      ]

      COMPARISONS = {
        :equal_to => :==,
        :greater_than => :>,
        :greater_than_or_equal_to => :>=,
        :less_than => :<,
        :less_than_or_equal_to => :<=,
        :even => lambda{|value| value.to_i % 2 == 0 },
        :odd => lambda{|value| value.to_i % 2 == 1 },
      }

      def setup record_class

        ensure_exclusive(:odd, :even)

        ensure_exclusive(:equal_to,
          [:greater_than, :greater_than_or_equal_to,
           :less_than, :less_than_or_equal_to])

        ensure_type([TrueClass, FalseClass], :only_integer)

        ensure_type(TrueClass, :odd, :even)

        ensure_type([Numeric, Symbol, Proc],
          :greater_than, :greater_than_or_equal_to,
          :less_than, :less_than_or_equal_to,
          :equal_to)

      end

      def read_attribute_for_validation(record, attribute_name)
        if record.respond_to?("#{attribute_name}_before_type_cast")
          record.send("#{attribute_name}_before_type_cast")
        else
          record.send(attribute_name)
        end
      end

      def validate_attribute record, attribute_name, raw
        each_value(raw) do |raw_value|

          if options[:only_integer] or options[:odd] or options[:even]
            value = as_integer(raw_value)
            error_type = :not_an_integer
          else
            value = as_number(raw_value)
            error_type = :not_a_number
          end

          unless value
            record.errors.add(attribute_name, message_for(error_type))
            return
          end

          COMPARISONS.each do |option,method|

            next unless options.has_key?(option)

            requirement = case options[option]
            when Symbol then record.send(options[option])
            when Proc then options[option].call(record)
            else options[option]
            end

            valid = case method
            when Symbol then value.send(method, requirement)
            else method.call(value)
            end

            unless valid
              message = message_for(option, requirement)
              record.errors.add(attribute_name, message)
            end

          end
        end
      end

      def message_for error_type, requirement = nil
        return options[:message] if options[:message]
        case error_type
        when :not_a_number   then 'is not a number'
        when :not_an_integer then 'must be an integer'
        when :even           then 'must be an even number'
        when :odd            then 'must be an odd number'
        when :equal_to       then "should equal #{requirement}"
        else
          "must be #{error_type.to_s.gsub(/_/, ' ')} #{requirement}"
        end
      end

      def as_number value
        begin
          Kernel.Float(value)
        rescue ArgumentError, TypeError
          nil
        end
      end

      def as_integer value
        begin
          Kernel.Integer(value)
        rescue ArgumentError, TypeError
          nil
        end
      end

    end

  end
end
