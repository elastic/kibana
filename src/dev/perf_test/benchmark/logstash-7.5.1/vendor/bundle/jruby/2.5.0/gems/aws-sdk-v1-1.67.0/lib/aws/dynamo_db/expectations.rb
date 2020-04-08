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
  class DynamoDB

    module Expectations

      private
      def expect_conditions(options)
        expected = {}

        options[:if].each do |name, value|
          context = "expected value for attribute #{name}"
          expected[name.to_s] = {
            :value => format_attribute_value(value, context)
          }
        end if options[:if]

        [options[:unless_exists]].flatten.each do |name|
          expected[name.to_s] = { :exists => false }
        end if options[:unless_exists]

        expected
      end

    end

  end
end
