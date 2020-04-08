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
    class BlockValidator < Validator

      ACCEPTED_OPTIONS = [:allow_nil, :allow_blank, :on, :if, :unless]

      def initialize *args, &block
        @block = block
        super(*args)
      end

      attr_reader :block

      def validate_attribute record, attribute_name, value
        block.call(record, attribute_name, value)
      end

    end

  end
end
