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

    # Represents a DynamoDB table.
    #
    # ## Working with Tables
    #
    # Dynamo DB allows you to organize data into tables.  Tables have a
    # unique name and a key schema.  A key schema is comprised of a
    # hash key and an optional range key.
    #
    # Dynamo DB automatically partitions the data contained in a table
    # across multiple nodes so that the data throughput is not constrained
    # by the scale of a single box. You can reserve the required throughput
    # by specifying a number of reads and writes per second to support.
    #
    # ## Creating a Table
    #
    # To get started you can create a table by supplying a name
    # and the read/write capacity.  A default schema with a hash_key
    # of :id => :string will be provided.
    #
    #     dynamo_db = AWS::DynamoDB.new
    #     dynamo_db.tables.create('mytable', 10, 5)
    #
    # You can provide your own hash key and optional range key.
    #
    #     dynamo_db.tables.create('comments', 10, 5,
    #       :hash_key => { :blog_post_id => :number },
    #       :range_key => { :comment_id => :number }
    #     )
    #
    # ## Provisioning Throughput
    #
    # You must specify the desired read and write capacity when
    # creating a table.  After a table is created you can see what has
    # been provisioned.
    #
    #     table.read_capacity_units #=> 10
    #     table.write_capacity_units #=> 5
    #
    # To change these values, call {#provision_throughput}:
    #
    #     table.provision_throughput :read_capacity_units => 100, :write_capacity_units => 100
    #
    # ## Table Status
    #
    # When you create or update a table the changes can take some time to
    # apply.  You can query the status of your table at any time:
    #
    #     # creating a table can be a *very* slow operation
    #     table = dynamo_db.tables.create('mytable')
    #     sleep 1 while table.status == :creating
    #     table.status #=> :active
    #
    # @attr_reader [Time] created_at When the table was first creatd.
    #
    # @attr_reader [Symbol] status
    #
    # @attr [Integer] read_capacity_units
    #
    # @attr [Integer] write_capacity_units
    #
    # @attr [Time] throughput_last_increased_at
    #
    # @attr [Time] throughput_last_decreased_at
    #
    # @attr [Integer] size_bytes
    #
    # @attr [Integer] item_count
    #
    # @attr [PrimaryKeyElement] hash_key Returns the hash key element
    #   for this table.
    #
    # @attr [PrimaryKeyElement,nil] range_key Returns the range key
    #   element for this table, or nil if the table does not have a range
    #   key.
    #
    class Table < Resource

      # @api private
      def initialize name, options = {}
        @name = name
        super
      end

      # @return [String] The name of this table.
      attr_reader :name

      attribute :creation_date_time, :static => true

      alias_method :created_at, :creation_date_time

      attribute :status, :from => 'TableStatus', :to_sym => true

      attribute :throughput_last_increased_at, :from => 'LastIncreaseDateTime'

      attribute :throughput_last_decreased_at, :from => 'LastDecreaseDateTime'

      attribute :read_capacity_units

      attribute :write_capacity_units

      attribute :item_count

      attribute :size_bytes, :from => 'TableSizeBytes'

      attribute :hash_key, :from => "HashKeyElement", :static => true do
        translates_output {|v| PrimaryKeyElement.new(v) }
      end

      attribute :range_key, :from => "RangeKeyElement", :static => true do
        translates_output {|v| PrimaryKeyElement.new(v) }
      end
      alias_method :range_key_without_schema_override, :range_key

      populates_from :describe_table do |resp|
        desc = resp.data['Table']
        if desc['TableName'] == name
          desc.
            merge(desc['ProvisionedThroughput']).
            merge(desc['KeySchema'] || {})
        end
      end

      populates_from :create_table, :delete_table do |resp|
        desc = resp.data['TableDescription']
        if desc['TableName'] == name
          desc.
            merge(desc['ProvisionedThroughput']).
            merge(desc['KeySchema'] || {})
        end
      end

      # @return [PrimaryKeyElement]
      def range_key
        if schema_loaded?
          static_attributes[:range_key]
        else
          range_key_without_schema_override
        end
      end

      # Updates the provisioned throughput for this table.
      # @param [Hash] options
      # @option options [Integer] :read_capacity_units The desired read capacity units.
      # @option options [Integer] :write_capacity_units The desired write capacity units.
      # @return [Hash] Returns the given `options` hash.
      def provision_throughput options = {}

        options[:read_capacity_units] ||= read_capacity_units
        options[:write_capacity_units] ||= write_capacity_units

        client_opts = {}
        client_opts[:table_name] = name
        client_opts[:provisioned_throughput] = options
        client.update_table(client_opts)

        options

      end

      # @param [Integer] read_capacity_units
      def read_capacity_units= read_capacity_units
        provision_throughput(:read_capacity_units => read_capacity_units)
      end

      # @param [Integer] write_capacity_units
      def write_capacity_units= write_capacity_units
        provision_throughput(:write_capacity_units => write_capacity_units)
      end

      # @return [Boolean] Returns true if the table has a hash key and no
      #   range key.
      def simple_key?
        range_key.nil?
      end

      # @return [Boolean] Returns true if the table has both a hash key and
      #   a range key.
      def composite_key?
        !simple_key?
      end
      alias_method :has_range_key?, :composite_key?

      # @return [Boolean] True if the table's schema information is
      #   loaded into memory.
      #
      # @note You must load the the table schema using {#load_schema},
      #   {#hash_key} or {#range_key} or configure it using
      #   {#hash_key=} and optionally {#range_key=} in order to work
      #   with DynamoDB items.
      #
      def schema_loaded?
        static_attributes.include?(:hash_key)
      end

      # Raises an exception unless the table schema is loaded.
      #
      # @return [nil]
      #
      def assert_schema!
        raise "table schema not loaded" unless schema_loaded?
      end

      # Loads the table's schema information into memory.  This method
      # should not be used in a high-volume code path, and is intended
      # only as a convenience for exploring the API.  In general you
      # should configure a schema with {#hash_key=} and {#range_key=}
      # before using the table.
      #
      # @note You must load the the table schema using {#load_schema},
      #   {#hash_key} or {#range_key} or configure it using
      #   {#hash_key=} and optionally {#range_key=} in order to work
      #   with DynamoDB items.
      #
      # @return self
      def load_schema
        hash_key
        self
      end

      # Configures the hash key element of the table's key schema.
      # This is the preferred way to load the table schema so that it
      # can be used to work with DynamoDB items.
      #
      #     # these are equivalent:
      #     table.hash_key = [:id, :string]
      #     table.hash_key = { :id => :string }
      #
      # @note For tables with composite primary keys, you must call
      #   this method first followed by {#range_key=} to configure the
      #   table schema.
      #
      # @param description A description of the hash key element.  If
      #   this is a hash, it may contain a single mapping; the key is
      #   the name of the hash key attribute and the value is the type
      #   (`:string`, `:number` or `:binary`).  If it is an array, the first
      #   element is the name and the second element is the type.
      #
      def hash_key= description
        static_attributes[:hash_key] =
          PrimaryKeyElement.from_description(description)
      end

      # Configures the range key element of the table's key schema.
      # This is the preferred way to load the table schema so that it
      # can be used to work with DynamoDB items.  This method is only
      # valid if the table has a composite key schema, and it may only
      # be called after {#hash_key=} has been used to configure the
      # hash key element.
      #
      #     # these are equivalent:
      #     table.range_key = [:id, :string]
      #     table.range_key = { :id => :string }
      #
      # @param description A description of the range key element.  If
      #   this is a hash, it may contain a single mapping; the key is
      #   the name of the hash key attribute and the value is the type
      #   (`:string`, `:number` or `:binary`).  If it is an array, the first
      #   element is the name and the second element is the type.
      #
      def range_key= description
        raise "attempted to set a range key without configuring a hash key first" unless
          schema_loaded?

        static_attributes[:range_key] =
          PrimaryKeyElement.from_description(description)

      end

      # Deletes a table and all of its items.  The table must be in an
      # `:active` state (see {#status}).
      #
      # @return [nil]
      #
      def delete
        client.delete_table(:table_name => name)
        nil
      end

      # @return [ItemCollection] Returns an object representing all the
      #   items in the table.
      def items
        ItemCollection.new(self)
      end

      # @return [Boolean] Returns true if the table exists.  Note that a table
      #   exists even when it is in a `:deleting` state; this method
      #   only returns false when DynamoDB no longer returns any
      #   information about the table.
      def exists?
        get_resource
        true
      rescue Errors::ResourceNotFoundException
        false
      end

      # Requets a list of attributes for a list of items in the same table.
      #
      # If you want to request a list of attributes for items that span
      # multiple tables, see {DynamoDB#batch_get}.
      #
      # You can call this method in two forms:
      #
      #     # block form
      #     table.batch_get(:all, items) do |attributes|
      #       # yeilds one hash of attribute names/values for each item
      #       puts attributes.to_yaml
      #     end
      #
      #     # enumerable return value
      #     attribute_hashes = table.batch_get(:all, items)
      #     attribute_hashes.each do |attributes|
      #       # ...
      #     end
      #
      # @note This method does not require the table schema to be loaded.
      #
      # ## Attributes
      #
      # You can specify the list of attributes to request in 3 ways:
      #
      # * The symbol `:all` (to recieve all attributes)
      # * A single attribute name (e.g. 'size')
      # * An array of attribute names (e.g. ['size', 'color'])
      #
      # A few exmaples:
      #
      #     # get all attributes
      #     table.batch_get(:all, items)
      #
      #     # only get the 'color' attribute
      #     table.batch_get('color', items)
      #
      #     # get 'color' and 'size' attributes
      #     table.batch_get(['color', size'], items)
      #
      # ## Items
      #
      # You must specify an array of items to fetch attributes for.
      # The `items` param should always be an array with:
      #
      # * String hash key values
      # * Arrays of string hash key and range key values
      # * Item objects
      #
      # Here are a few examples:
      #
      #     # items as a list of hash key values
      #     items = %w(hashkey1 hashkey2 hashkey3)
      #     table.batch_get(:all, items)
      #
      #     # items as a list of hash and range key values
      #     items = [['hashkey1', 'rangekey2'], ['hashkey1', 'rangekey2']]
      #     table.batch_get(:all, items)
      #
      #     # items as a list of Item objects
      #     items = []
      #     items << Item.new(table, 'hashkey1')
      #     items << Item.new(table, 'hashkey2')
      #     table.batch_get(:all, items)
      #
      # Please note that you must provide both hash and range keys for tables
      # that include a range key in the schema.
      #
      # @param [:all, String, Array<String>] attributes The list of
      #   attributes you want to fetch for each item.  `attributes` may be:
      #
      #     * the symbol `:all`
      #     * a single attribute name string
      #     * an array of attribute name strings
      #
      # @param [Mixed] items A list of 2 or more items to fetch attributes
      #   for.  You may provide `items` as:
      #
      #     * an array of hash key value strings
      #     * an array of hash and range key value pairs (nested arrays)
      #     * an array of {Item} objects
      #
      # @param [Hash] options
      #
      # @option options [Boolean] :consistent_read (false) When `true`, items
      #   are read from this table with consistent reads.  When `false`, reads
      #   are eventually consistent.
      #
      # @yield [Hash] Yields a hash of attributes for each item.
      #
      # @return [Enumerable] Returns an enumerable object that yields
      #   hashes of attributes.
      #
      def batch_get attributes, items, options = {}, &block
        batch = BatchGet.new(:config => config)
        batch.table(name, attributes, items, options)
        enum = batch.to_enum(:each_attributes)
        block_given? ? enum.each(&block) : enum
      end

      # Batch puts up to 25 items to this table.
      #
      #     table.batch_put([
      #       { :id => 'id1', :color => 'red' },
      #       { :id => 'id2', :color => 'blue' },
      #       { :id => 'id3', :color => 'green' },
      #     ])
      #
      # @param [Array<Hash>] items A list of item attributes to put.
      #   The hash must contain the table hash key element and range key
      #   element (if one is defined).
      #
      # @return (see BatchWrite#process!)
      #
      def batch_put items
        batch = BatchWrite.new(:config => config)
        batch.put(self, items)
        batch.process!
      end

      # Batch writes up to 25 items to this table.  A batch may contain
      # a mix of items to put and items to delete.
      #
      #     table.batch_write(
      #       :put => [
      #         { :id => 'id1', :color => 'red' },
      #         { :id => 'id2', :color => 'blue' },
      #         { :id => 'id3', :color => 'green' },
      #       ],
      #       :delete => ['id4', 'id5']
      #     )
      #
      # @param [Hash] options
      #
      # @option options (BatchWrite#write)
      #
      # @return (see BatchWrite#process!)
      #
      def batch_write options = {}
        batch = BatchWrite.new(:config => config)
        batch.write(self, options)
        batch.process!
      end

      # Delete up to 25 items in a single batch.
      #
      #     table.batch_delete(%w(id1 id2 id3 id4 id5))
      #
      # @param [Array<String>,Array<Array>] items A list of item keys to
      #   delete.  For tables without a range key, items should be an array
      #   of hash key strings.
      #
      #       batch.delete('table-name', ['hk1', 'hk2', 'hk3'])
      #
      #   For tables with a range key, items should be an array of
      #   hash key and range key pairs.
      #
      #       batch.delete('table-name', [['hk1', 'rk1'], ['hk1', 'rk2']])
      #
      # @return (see BatchWrite#process!)
      #
      def batch_delete items
        batch = BatchWrite.new(:config => config)
        batch.delete(self, items)
        batch.process!
      end

      protected
      def get_resource attribute_name = nil
        client.describe_table(resource_options)
      end

      protected
      def resource_identifiers
        [[:table_name, name]]
      end

    end

  end
end
