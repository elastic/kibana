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
  class SimpleWorkflow

    # Simple Workflow returns counts that may be truncated.  Truncated
    # counts indicate a lower bound.  A count of 100 that is truncated
    # could be represented to a user like "100+".  Non-truncated counts
    # are definitive.
    class Count

      # @api private
      def initialize count, truncated
        @count = count
        @truncated = truncated
      end

      # @return [Integer]
      attr_reader :count

      alias_method :to_i, :count

      # @return [Boolean]
      def truncated?
        @truncated
      end

      def == other
        other.is_a?(Count) and
        other.count == self.count and
        other.truncated? == self.truncated?
      end

      alias_method :eql?, :==

    end
  end
end
