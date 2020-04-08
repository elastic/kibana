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

    # Use this class to wrap strings that you want Amazon DynamoDB
    # to store as a binary attribute.  This can reduce the size
    # of larger attributes to save on storage costs.
    #
    #     table = AWS::DynamoDB.new.tables['data-table']
    #     table.hash_key = { 'id' => :string }
    #     table.range_key = { 'position' => :number }
    #
    #     # put an item with a binary data attribute
    #     table.items.create(
    #       'id' => 'abc',
    #       'position' => 5,
    #       'data' => AWS::DynamoDB::Binary.new('abc')
    #     )
    #
    class Binary < String; end

  end
end
