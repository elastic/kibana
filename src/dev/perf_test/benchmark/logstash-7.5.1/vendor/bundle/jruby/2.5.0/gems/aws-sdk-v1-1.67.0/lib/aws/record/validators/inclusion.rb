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
    class InclusionValidator < Validator

      ACCEPTED_OPTIONS = [:in, :message, :allow_nil, :allow_blank, :on, :if, :unless]

      def setup record_class
        ensure_present(:in)
        ensure_type(Enumerable, :in)
      end

      def validate_attribute record, attribute_name, value_or_values
        each_value(value_or_values) do |value|

          included = if value.is_a?(Enumerable)
            value.all?{|v| value_included?(v) }
          else
            value_included?(value)
          end

          record.errors.add(attribute_name, message) unless included

        end
      end

      def value_included? value
        options[:in].respond_to?(:cover?) ?
          options[:in].cover?(value) :
          options[:in].include?(value)
      end

      def message
        options[:message] || 'is not included in the list'
      end

    end

  end
end
