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
    class LengthValidator < Validator

      ACCEPTED_OPTIONS = [
        :exactly, :within, :minimum, :maximum,
        :too_long, :too_short, :wrong_length,
        :allow_nil, :allow_blank, :on, :if, :unless,
      ]

      def setup record_class
        ensure_at_least_one(:within, :exactly, :minimum, :maximum)
        ensure_exclusive(:within, :exactly, [:minimum, :maximum])
        ensure_type(Range, :within)
        ensure_type(Integer, :exactly, :minimum, :maximum)
        ensure_type(String, :too_long, :too_short, :wrong_length)
      end

      def validate_attribute record, attribute_name, value_or_values
        each_value(value_or_values) do |value|

          length = value.respond_to?(:length) ? value.length : value.to_s.length

          if exact = options[:exactly]
            unless length == exact
              record.errors.add(attribute_name, wrong_length(exact, length))
            end
          end

          if within = options[:within]
            if length < within.first
              record.errors.add(attribute_name, too_short(within.first, length))
            end
            if length > within.last
              record.errors.add(attribute_name, too_long(within.last, length))
            end
          end

          if min = options[:minimum]
            if length < min
              record.errors.add(attribute_name, too_short(min, length))
            end
          end

          if max = options[:maximum]
            if length > max
              record.errors.add(attribute_name, too_long(max, length))
            end
          end

        end
      end

      # @api private
      protected
      def wrong_length exactly, got
        msg = options[:wrong_length] ||
          "is the wrong length (should be %{exactly} characters)"
        interpolate(msg, :exactly => exactly, :length => got)
      end

      # @api private
      protected
      def too_short min, got
        msg = options[:too_short] ||
          "is too short (minimum is %{minimum} characters)"
        interpolate(msg, :minimum => min, :length => got)
      end

      # @api private
      protected
      def too_long max, got
        msg = options[:too_long] ||
          "is too long (maximum is %{maximum} characters)"
        interpolate(msg, :maximum => max, :length => got)
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
