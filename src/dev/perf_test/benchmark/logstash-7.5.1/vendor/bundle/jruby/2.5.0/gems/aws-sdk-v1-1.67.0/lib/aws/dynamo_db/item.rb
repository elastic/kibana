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

    # Represents a DynamoDB item.  An item is identified by simple or
    # complex primary key (according to the table schema) and consists
    # of a collection of attributes.  Attributes are name/value pairs
    # where the value may be a string, number, string set, or number
    # set.
    #
    # Getting an item by hash key value:
    #
    #     item = table.items['hash-key-value']
    #
    # Getting an item from a table with both hash and range keys:
    #
    #     item = table.items['hash-key','range-key']
    #
    class Item < Core::Resource

      extend Types
      include Keys
      include Expectations

      # @return [Table] The table in which the item is stored.
      attr_reader :table

      # @return [String, Numeric] The hash key value of the item.
      attr_reader :hash_value

      # @return [String, Numeric, nil] The range key value of the
      #   item, or `nil` if the table has a simple primary key.
      attr_reader :range_value

      # @api private
      def initialize(table, *args)
        opts = args.pop if args.last.kind_of?(Hash)
        (@hash_value, @range_value) = args
        @table = table
        super(table, opts)
      end

      # Deletes the item.
      #
      # @param [Hash] options Options for deleting the item.
      #
      # @option options [Hash] :if Designates a conditional delete.
      #   The operation will fail unless the item exists and has the
      #   attributes in the value for this option.  For example:
      #
      #       # throws DynamoDB::Errors::ConditionalCheckFailedException
      #       # unless the item has "color" set to "red"
      #       item.delete(:if => { :color => "red" })
      #
      # @option options [String, Symbol, Array] :unless_exists A name
      #   or collection of attribute names; if the item has a value
      #   for any of these attributes, this method will raise
      #   `DynamoDB::Errors::ConditionalCheckFailedException`.  For
      #   example:
      #
      #       item.delete(:unless_exists => "version")
      def delete(options = {})
        client_opts = item_key_options(self)

        expected = expect_conditions(options)
        client_opts[:expected] = expected unless expected.empty?

        client_opts[:return_values] = options[:return].to_s.upcase if
          options[:return]

        resp = client.delete_item(client_opts)

        values_from_response_hash(resp.data["Attributes"]) if
          options[:return] and resp.data["Attributes"]
      end

      # @return [Boolean] True if the item exists.
      def exists?(options = {})
        client_opts = item_key_options(self, options)
        client_opts[:attributes_to_get] = [table.hash_key.name]
        resp = client.get_item(client_opts)
        resp.data.key?("Item")
      end

      # @return [AttributeCollection] An object representing the
      #   attributes of the item.
      def attributes
        AttributeCollection.new(self)
      end

      # @api private
      def self.new_from(op, response_object, table, *args)

        config = args.last.is_a?(Hash) ? args.last : AWS.config

        table.assert_schema!
        hash_value =
          value_from_response(response_object[table.hash_key.name])
        range_value =
          value_from_response(response_object[table.range_key.name]) if
          table.range_key

        raise "missing hash key value in put_item response" unless hash_value
        raise "missing range key value in put_item response" unless
          range_value || !table.range_key

        super(op, response_object,
              table, hash_value, range_value, *args)
      end

      protected
      def resource_identifiers
        [[:table_name, table.name],
         [:hash_value, hash_value],
         [:range_value, range_value]]
      end

    end

  end
end
