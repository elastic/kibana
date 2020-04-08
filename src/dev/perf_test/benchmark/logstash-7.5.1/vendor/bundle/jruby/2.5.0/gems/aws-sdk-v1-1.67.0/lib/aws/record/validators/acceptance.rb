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
    class AcceptanceValidator < Validator

      ACCEPTED_OPTIONS = [:accept, :message, :allow_nil, :allow_blank, :on, :if, :unless]

      def setup record_class
        set_default(:allow_nil, true)
        add_accessors(record_class, *attribute_names)
      end

      def validate_attribute record, attribute_name, value

        accepted = case value
        when '1'  then true
        when true then true
        else
          options.has_key?(:accept) ?
            value == options[:accept] :
            false
        end

        record.errors.add(attribute_name, message) unless accepted

      end

      def message
        options[:message] || 'must be accepted'
      end

    end

  end
end
