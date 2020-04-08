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
    class FormatValidator < Validator

      ACCEPTED_OPTIONS = [
        :with, :without,
        :message, :allow_nil, :allow_blank, :on, :if, :unless,
      ]

      def setup record_class
        ensure_type(Regexp, :with, :without)
        ensure_at_least_one(:with, :without)
      end

      def validate_attribute record, attribute_name, value_or_values
        each_value(value_or_values) do |value|

          if options[:with]
            unless value.to_s =~ options[:with]
              record.errors.add(attribute_name, message)
            end
          end

          if options[:without]
            unless value.to_s !~ options[:without]
              record.errors.add(attribute_name, message)
            end
          end

        end
      end

      def message
        options[:message] || 'is invalid'
      end

    end

  end
end
