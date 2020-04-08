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
  class SimpleDB

    # @api private
    module ExpectConditionOption

      # @api private
      protected
      def expect_condition_opts(opts)
        expected = []
        opts.each do |name, value|
          case name
          when :if
            (expected_name, expected_value) = value.to_a.first
            expected << {
              :name => expected_name.to_s,
              :value => expected_value
            }
          when :unless, :unless_exists
            expected << {
              :name => value.to_s,
              :exists => false
            }
          end
        end
        expected.empty? ? {} : expected.first
      end

    end

  end
end
