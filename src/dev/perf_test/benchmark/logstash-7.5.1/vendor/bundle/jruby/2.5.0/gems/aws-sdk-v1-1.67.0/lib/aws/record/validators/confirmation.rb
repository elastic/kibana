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
    class ConfirmationValidator < Validator

      ACCEPTED_OPTIONS = [:message, :on, :if, :unless]

      def setup record_class
        accessors = attribute_names.collect{|m| "#{m}_confirmation" }
        add_accessors(record_class, *accessors)
      end

      def validate_attribute record, attribute_name, value
        confirmation_value = record.send("#{attribute_name}_confirmation")
        unless value == confirmation_value
          record.errors.add(attribute_name, message)
        end
      end

      def message
        options[:message] || "doesn't match confirmation"
      end

    end

  end
end
