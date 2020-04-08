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
    class HashModel

      require 'aws/record/hash_model/attributes'
      require 'aws/record/hash_model/finder_methods'
      require 'aws/record/hash_model/scope'

      extend AbstractBase

      def self.inherited(sub_class)
        sub_class.string_attr :id,
          :hash_key => true,
          :default_hash_key_attribute => true
      end

      # @return [String,nil]
      def hash_key
        self[self.class.hash_key]
      end

      class << self

        # Creates the DynamoDB table that is configured for this class.
        #
        #     class Product < AWS::Record::HashModel
        #     end
        #
        #     # create the table 'Product' with 10 read/write capacity units
        #     Product.create_table 10, 10
        #
        # If you shard you data across multiple tables, you can specify the
        # shard name:
        #
        #     # create two tables, with the given names
        #     Product.create_table 500, 10, :shard_name => 'products-1'
        #     Product.create_table 500, 10, :shard_name => 'products-2'
        #
        # If you share a single AWS account with multiple applications, you
        # can provide a table prefix to group tables and to avoid name
        # collisions:
        #
        #     AWS::Record.table_prefix = 'myapp-'
        #
        #     # creates the table 'myapp-Product'
        #     Product.create_table 250, 50
        #
        #     # creates the table 'myapp-products-1'
        #     Product.create_table 250, 50, :shard_name => 'products-1'
        #
        # @param [Integer] read_capacity_units
        #   See {DynamoDB::TableCollection#create} for more information.
        #
        # @param [Integer] write_capacity_units
        #   See {DynamoDB::TableCollection#create} for more information.
        #
        # @param [Hash] options
        #
        # @option options [String] :shard_name Defaults to the class name.  The
        #   shard name will be prefixed with {AWS::Record.table_prefix},
        #   and that becomes the table name.
        #
        # @return [DynamoDB::Table]
        #
        def create_table read_capacity_units, write_capacity_units, options = {}

          table_name = dynamo_db_table_name(options[:shard_name])

          create_opts = {}
          create_opts[:hash_key] = { hash_key => :string }

          dynamo_db.tables.create(
            table_name,
            read_capacity_units,
            write_capacity_units,
            create_opts)

        end

        # @return [DynamoDB::Table]
        # @api private
        def dynamo_db_table shard_name = nil
          table = dynamo_db.tables[dynamo_db_table_name(shard_name)]
          table.hash_key = [hash_key, :string]
          table
        end

        # @api private
        def hash_key
          hash_key_attribute.name
        end

        # @api private
        def hash_key_attribute
          @hash_key_attribute
        end

        private

        def set_hash_key_attribute(attribute)
          if
            hash_key_attribute and
            hash_key_attribute.options[:default_hash_key_attribute]
          then
            remove_attribute(hash_key_attribute)
          end
          @hash_key_attribute = attribute
        end

        def dynamo_db_table_name shard_name = nil
          "#{Record.table_prefix}#{self.shard_name(shard_name)}"
        end

        def dynamo_db
          AWS::DynamoDB.new
        end

        def add_attribute(attribute)
          set_hash_key_attribute(attribute) if attribute.options[:hash_key]
          super(attribute)
        end

      end

      private

      def populate_id
        hash_key = self.class.hash_key_attribute
        if hash_key.options[:default_hash_key_attribute]
          self[hash_key.name] = SecureRandom.uuid
        end
      end

      # @return [DynamoDB::Item] Returns a reference to the item as stored in
      #   simple db.
      # @api private
      private
      def dynamo_db_item
        dynamo_db_table.items[hash_key]
      end

      # @return [SimpleDB::Domain] Returns the domain this record is
      #   persisted to or will be persisted to.
      private
      def dynamo_db_table
        self.class.dynamo_db_table(shard)
      end

      private
      def create_storage
        dynamo_db_table.items.create(serialize_attributes, opt_lock_conditions)
      end

      private
      def update_storage
        # Only enumerating dirty (i.e. changed) attributes.  Empty
        # (nil and empty set) values are deleted, the others are replaced.
        dynamo_db_item.attributes.update(opt_lock_conditions) do |u|
          changed.each do |attr_name|
            attribute = self.class.attribute_for(attr_name)
            value = serialize_attribute(attribute, @_data[attr_name])
            if value.nil? or value == []
              u.delete(attr_name)
            else
              u.set(attr_name => value)
            end
          end
        end
      end

      private
      def delete_storage
        dynamo_db_item.delete(opt_lock_conditions)
      end

      private
      def deserialize_item_data data
        data.inject({}) do |hash,(attr_name,value)|
          if attribute = self.class.attributes[attr_name]
            hash[attr_name] = value.is_a?(Set) ?
              value.map{|v| attribute.deserialize(v) } :
              attribute.deserialize(value)
          end
          hash
        end
      end

    end

  end
end
