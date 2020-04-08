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
    class CountValidator < Validator

      ACCEPTED_OPTIONS = [
        :exactly, :within, :minimum, :maximum,
        :too_many, :too_few, :wrong_number,
        :on, :if, :unless,
      ]

      def setup record_class
        ensure_at_least_one(:within, :exactly, :minimum, :maximum)
        ensure_exclusive(:within, :exactly, [:minimum, :maximum])
        ensure_type(Range, :within)
        ensure_type(Integer, :exactly, :minimum, :maximum)
        ensure_type(String, :too_many, :too_few, :wrong_number)
      end

      def validate_attribute record, attribute_name, value

        count = case value
        when nil then 0
        when String then 1
        when Enumerable then value.count
        else 1
        end

        if exact = options[:exactly]
          unless count == exact
            record.errors.add(attribute_name, wrong_number(exact, count))
          end
        end

        if within = options[:within]
          if count < within.first
            record.errors.add(attribute_name, too_few(within.first, count))
          end
          if count > within.last
            record.errors.add(attribute_name, too_many(within.last, count))
          end
        end

        if min = options[:minimum]
          if count < min
            record.errors.add(attribute_name, too_few(min, count))
          end
        end

        if max = options[:maximum]
          if count > max
            record.errors.add(attribute_name, too_many(max, count))
          end
        end

      end

      # @api private
      protected
      def wrong_number exactly, got
        msg = options[:wrong_number] ||
          "has the wrong number of values (should have %{exactly})"
        interpolate(msg, :exactly => exactly, :count => got)
      end

      # @api private
      protected
      def too_few min, got
        msg = options[:too_few] || "has too few values (minimum is %{minimum})"
        interpolate(msg, :minimum => min, :count => got)
      end

      # @api private
      protected
      def too_many max, got
        msg = options[:too_many] || "has too many values (maximum is %{maximum})"
        interpolate(msg, :maximum => max, :count => got)
      end

      protected
      def interpolate message_with_placeholders, values
        msg = message_with_placeholders.dup
        values.each_pair do |key,value|
          msg.gsub!(/%\{#{key}\}/, value.to_s)
        end
        msg
      end

    end

  end
end
