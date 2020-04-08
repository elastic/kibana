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

    # Represents the tables in your account.  Each table is
    # represented by an instance of the {Table} class.
    #
    # ## Schemas
    #
    # Before you can operate on items in a table you must specify the schema.
    # You do this by calling #hash_key= (and optionally #range_key=) on
    # a table.
    #
    #     table = dynamo_db.tables['mytable']
    #     table.hash_key = [:id, :string]
    #
    # @example Creating a Table
    #   table = dynamo_db.tables.create('mytable', 10, 10, :hash_key => { :id => :string })
    #
    # @example Enumerating Tables
    #   dynamo_db.tables.each {|table| puts table.name }
    #
    # @example Getting a Table by Name
    #   table = dynamo_db.tables['mytable']
    #
    class TableCollection

      include Core::Collection::WithLimitAndNextToken

      # Creates a new table.
      #
      #     table = dynamo_db.tables.create('mytable', 25, 25,
      #       :hash_key => { :id => :string })
      #
      # @note Creating a table is an eventualy consistent operation.  You
      #   can not interact with the table until its status
      #   ({Table#status}) is `:active`.
      #
      # @param [String] name The name of the table.
      #
      # @param [Integer] read_capacity_units Sets the minimum
      #   number of reads supported before read requests are throttled.
      #
      # @param [Integer] write_capacity_units Sets the minimum
      #   number of writes supported before writes requests are throttled.
      #
      # @param [Hash] options
      #
      # @option options [Hash] :hash_key A hash key is a combination
      #   of an attribute name and type.  If you want to have the
      #   hash key on the string attribute username you would call #create
      #   with:
      #
      #       :hash_key => { :username => :string }
      #
      #   The other supported types are `:number` and `:binary`.  If you
      #   wanted to set the hash key on a numeric (integer) attribute then you
      #   could call #create with:
      #
      #       :hash_key => { :id => :number }
      #
      #   All tables require a hash key.  If `:hash_key` is not provided
      #   then a default hash key will be provided.  The default hash
      #   key is:
      #
      #       :hash_key => { :id => :string }
      #
      # @option options [String] :range_key You can setup a table to use
      #   composite keys by providing a `:range_key`.  Range keys are
      #   configured the same way as hash keys.  They are useful
      #   for ordering items that share the same hash key.
      #
      # @return [Table] The newly created table.
      #
      def create name, read_capacity_units, write_capacity_units, options = {}

        client_opts = {
          :table_name => name.to_s,
          :key_schema => key_schema(options),
          :provisioned_throughput => {
            :read_capacity_units => read_capacity_units,
            :write_capacity_units => write_capacity_units,
          },
        }

        response = client.create_table(client_opts)

        Table.new(name, :config => config)

      end

      # References a table by name.
      #
      #     dynamo_db.tables["MyTable"]
      #
      # @param [String] name
      # @return [Table] Returns the table with the given name.
      def [] name
        Table.new(name, :config => config)
      end

      # @api private
      protected
      def _each_item next_token, limit, options = {}, &block

        options[:limit] = limit if limit
        options[:exclusive_start_table_name] = next_token if next_token

        response = client.list_tables(options)
        response.data['TableNames'].each do |name|
          yield Table.new(name, :config => config)
        end

        response.data['LastEvaluatedTableName']

      end

      private
      def key_schema options

        hash_key, range_key = options.values_at(:hash_key, :range_key)

        # default options for :hash_key
        hash_key ||= { :id => :string }

        schema = {}
        schema[:hash_key_element] = schema_element(hash_key, "hash")
        if range_key
          schema[:range_key_element] = schema_element(range_key, "range")
        end
        schema

      end

      private
      def schema_element desc, key_type

        (name, type) = desc.to_a.first

        unless [:string, :number, :binary].include?(type)
          msg = "invalid #{key_type} key type, expected :string, :number or :binary"
          raise ArgumentError, msg
        end

        { :attribute_name => name.to_s,
          :attribute_type => type.to_s[0,1].upcase }

      end

    end

  end
end
