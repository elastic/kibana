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

require 'aws/core'
require 'aws/dynamo_db/config'

module AWS

  # Provides a high-level interface for using DynamoDB.
  #
  #     dynamo_db = AWS::DynamoDB.new(
  #       :access_key_id => '...',
  #       :secret_access_key => '...')
  #
  # # Supported API Version
  #
  # Please note, the `AWS::DynamoDB` classes have been built against
  # the 2011-12-05 API version. Constructing a `AWS::DynamoDB` object
  # with a newer API version will emit a warning and then ignore the
  # specified version.
  #
  # If you would like to use features of the newer 2012-08-10 API
  # version, then please construct a DynamoDB client and use the
  # client API directly.
  #
  #     # supports the latest API version
  #     ddb = AWS::DynamoDB::Client.new(api_verison:'2012-08-10')
  #
  # # Tables
  #
  # Tables contain items, and organize information into discrete
  # areas. All items in the table have the same primary key
  # scheme. You designate the attribute name (or names) to use for the
  # primary key when you create a table, and the table requires each
  # item in the table to have a unique primary key value. The first
  # step in writing data to DynamoDB is to create a table and
  # designate a table name with a primary key.
  #
  #     table = dynamo_db.tables.create(
  #       "MyTable", 10, 5,
  #       :hash_key => { :id => :string }
  #     )
  #     sleep 1 while table.status == :creating
  #
  # See {Table} and {TableCollection} for more information on creating
  # and managing tables.
  #
  # # Items and Attributes
  #
  # An item is a collection of one or more attributes, where each
  # attribute has a string name and a string, number, string set or
  # number set value.
  #
  # The identity of an item consists of its hash key value and -- if
  # the table's schema includes a range key -- its range key value.
  #
  #     item = table.items.put(:id => "abc123")
  #     item.hash_value # => "abc123"
  #     item.attributes.set(
  #       :colors => ["red", "blue"],
  #       :numbers => [12, 24]
  #     )
  #
  # See {Item} and {ItemCollection} for more information on creating
  # and managing items.  For more information on managing attributes,
  # see {AttributeCollection}.
  #
  # # Examples
  #
  #     # create a table (10 read and 5 write capacity units) with the
  #     # default schema (id string hash key)
  #     dynamo_db = AWS::DynamoDB.new
  #     table = dynamo_db.tables.create('my-table', 10, 5)
  #
  #     sleep 1 while table.status == :creating
  #     table.status #=> :active
  #
  #     # get an existing table by name and specify its hash key
  #     table = dynamo_db.tables['another-table']
  #     table.hash_key = [:id, :number]
  #
  #     # add an item
  #     item = table.items.create('id' => 12345, 'foo' => 'bar')
  #
  #     # add attributes to an item
  #     item.attributes.add 'category' => %w(demo), 'tags' => %w(sample item)
  #
  #     # update an item with mixed add, delete, update
  #     item.attributes.update do |u|
  #       u.add 'colors' => %w(red)
  #       u.set 'category' => 'demo-category'
  #       u.delete 'foo'
  #     end
  #
  #     # delete attributes
  #     item.attributes.delete 'colors', 'category'
  #
  #     # get attributes
  #     item.attributes.to_h
  #     #=> {"id"=>#<BigDecimal:10155f5d0,'0.12345E5',9(18)>, "tags"=>#<Set: {"item", "sample"}>}
  #
  #     # delete an item and all of its attributes
  #     item.delete
  #
  # @!attribute [r] client
  #   @return [Client] the low-level DynamoDB client object
  class DynamoDB

    autoload :AttributeCollection, 'aws/dynamo_db/attribute_collection'
    autoload :BatchGet, 'aws/dynamo_db/batch_get'
    autoload :BatchWrite, 'aws/dynamo_db/batch_write'
    autoload :Binary, 'aws/dynamo_db/binary'
    autoload :Client, 'aws/dynamo_db/client'
    autoload :ClientV2, 'aws/dynamo_db/client_v2'
    autoload :Errors, 'aws/dynamo_db/errors'
    autoload :Expectations, 'aws/dynamo_db/expectations'
    autoload :Item, 'aws/dynamo_db/item'
    autoload :ItemData, 'aws/dynamo_db/item_data'
    autoload :ItemCollection, 'aws/dynamo_db/item_collection'
    autoload :Keys, 'aws/dynamo_db/keys'
    autoload :PrimaryKeyElement, 'aws/dynamo_db/primary_key_element'
    autoload :Resource, 'aws/dynamo_db/resource'
    autoload :Table, 'aws/dynamo_db/table'
    autoload :TableCollection, 'aws/dynamo_db/table_collection'
    autoload :Types, 'aws/dynamo_db/types'

    include Core::ServiceInterface

    endpoint_prefix 'dynamodb'

    IGNORING_API_SPECIFIED_MSG = "WARNING: Ignoring DynamoDB API version specified because only '2011-12-05' is supported by this class.  To use another version of the API, invoke the lower level AWS::DynamoDB::Client explicitly."

    def initialize options = {}
      options = options.dup
      options[:dynamo_db] ||= {}
      warn(IGNORING_API_SPECIFIED_MSG) if options[:dynamo_db][:api_version]
      options[:dynamo_db][:api_version] = '2011-12-05'
      super(options)
    end

    # Returns a collection representing all the tables in your account.
    #
    # @return [TableCollection]
    def tables
      TableCollection.new(:config => config)
    end

    # Request attributes for items spanning multiple tables.  You configure
    # you batch get request using a block:
    #
    #     attributes = dynamo_db.batch_get do |batch|
    #       # call methods on batch specify tables, attributes and items
    #       # ...
    #     end
    #
    # The value returned by #batch_get is an enumerable object that yields
    # the table name (as a string) and a hash of attributes.  The
    # enumerable yields once per item received in the batch get.
    #
    # ## Configuring the batch
    #
    # You can call two methods on the yielded batch object:
    #
    #   * {#table}
    #   * {#items}
    #
    # For more information on these methods, see {BatchGet}.
    #
    # @yield [String, Hash] Yields the table name as a string and a hash
    #   of attributes for each item received in the bach get request.
    #
    # @return [Enumerable]
    #
    def batch_get &block
      batch = BatchGet.new(:config => config)
      yield(batch)
      batch.to_enum(:each)
    end

    # Yields a batch for writing (put and delete) items across multiple
    # tables.  You can put and delete items in the same batch.
    #
    # @example Putting items across tables
    #
    #   # shard data across two tables with batch write
    #   items = [
    #     { :id => '123', :color => 'red' },
    #     { :id => '456', :color => 'blue' },
    #     { :id => '789', :color => 'green' },
    #   ]
    #
    #   ddb.batch_write do |batch|
    #     batch.put('table1', items)
    #     batch.put('table2', items)
    #   end
    #
    # @example Mixing puts and deletes
    #
    #   ddb.batch_write do |batch|
    #     batch.write('table1', :put => [...], :delete => [...])
    #     batch.write('table2', :put => [...], :delete => [...])
    #   end
    #
    # @yield [BatchWrite]
    #
    # @return (see BatchWrite#process!)
    #
    # @see BatchWrite
    # @see BatchWrite#put
    # @see BatchWrite#delete
    # @see BatchWrite#write
    #
    def batch_write &block
      batch = BatchWrite.new(:config => config)
      yield(batch)
      batch.process!
    end

  end
end
