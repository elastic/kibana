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

    # @api private
    module Keys

      include Types

      # @return [Hash] Client options for identifying an item.
      def item_key_options(item, extra = {})
        key = item_key_hash(item)
        extra.merge({ :table_name => item.table.name, :key => key })
      end

      # @return [Hash] Returns just the hash key element and range key element
      def item_key_hash item
        item.table.assert_schema!
        key = {}
        key[:hash_key_element] = format_attribute_value(item.hash_value)
        key[:range_key_element] = format_attribute_value(item.range_value) if
          item.table.composite_key?
        key
      end

    end

  end
end
