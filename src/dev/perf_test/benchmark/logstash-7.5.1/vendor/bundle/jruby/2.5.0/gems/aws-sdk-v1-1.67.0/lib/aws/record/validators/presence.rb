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
    class PresenceValidator < Validator

      ACCEPTED_OPTIONS = [:message, :allow_nil, :allow_blank, :on, :if, :unless]

      def validate_attribute record, attribute_name, value

        blank = case
        when value.nil?                 then true
        when value.is_a?(String)        then value !~ /\S/
        when value == false             then false # defeat false.blank? == true
        when value.respond_to?(:empty?) then value.empty?
        when value.respond_to?(:blank?) then value.blank?
        else false
        end

        record.errors.add(attribute_name, message) if blank

      end

      def message
        options[:message] || 'may not be blank'
      end

    end
  end
end
