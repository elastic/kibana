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
    module ConsistentReadOption

      # Determines if SimpleDB should be read consistently or not.
      #
      # Precedence is given to:
      #
      # * `:consistent_read` option
      # * SimpleDB.consistent_reads block value
      # * AWS.config.simple_db_consistent_reads?
      #
      # @return [Boolean] Returns true if a read should be made consistently
      #   to SimpleDB.
      def consistent_read options
        if options.has_key?(:consistent_read)
          options[:consistent_read] ? true : false
        elsif SimpleDB.send(:in_consistent_reads_block?)
          SimpleDB.send(:consistent_reads_state)
        else
          config.simple_db_consistent_reads?
        end
      end

    end
  end
end
