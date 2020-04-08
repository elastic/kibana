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

    # A utility class for configuring a list of tables, attributes and
    # items to request information for.
    #
    # @see DynamoDB#batch_get
    # @see Table#batch_get
    #
    class BatchGet

      include Keys
      include Enumerable
      include Core::Model

      def initialize options = {}
        super(options)
        @request_items = {}
      end

      # Add a list of items to fetch in this batch.
      #
      # @param [Table,String] table The name of the table to fetch attributes
      #   from.
      #
      # @param [Symbol, String, Array<String>] attributes The list of attributes
      #   to fetch.  If you want to load *ALL* attributes for the named items,
      #   then pass the symbol `:all`.
      #
      #       # get all attributes
      #       batch_get.table('mytable', :all, items)
      #
      #       # get one attribute for each item
      #       batch_get.table('mytable', ['name'], items)
      #
      #       # get a list of attributes for each item
      #       batch_get.table('mytable', ['name', 'size'], items)
      #
      # @param [Array<Item,Array>] items One or more items to fetch attributes
      #   for.  Each attribute should be one of the following:
      #
      #     * an {Item} object
      #     * a hash key value
      #     * a hash key value and a range key value
      #
      #   You must provide both the hash key and range key values if the table
      #   schema has both.
      #
      #       batch_get.table('mytable', :all, [%w(hk1 rk1), %w(hk1 rk2), ...])
      #
      # @param [Hash] options
      #
      # @option options [Boolean] :consistent_read (false) When `true`, items
      #   are read from this table with consistent reads.  When `false`, reads
      #   are eventually consistent.
      #
      # @return [nil]
      #
      def table table, attributes, items, options = {}

        table = table.is_a?(Table) ? table.name : table.to_s

        attributes = attributes == :all ? nil : [attributes].flatten

        keys = items.collect do |item|
          case item
          when Item then item_key_hash(item)
          when Array
            {
              :hash_key_element => format_attribute_value(item[0]),
              :range_key_element => format_attribute_value(item[1]),
            }
          else
            { :hash_key_element => format_attribute_value(item) }
          end
        end

        # ensure we don't receive 2 different lists of attributes for
        # the same table

        if
          @request_items.has_key?(table) and
          @request_items[table][:attributes_to_get] != attributes
        then
          msg = "When batch getting attributes, you may only provide " +
            "1 list of attributes per table, but the `#{table}` table " +
            "has received reqeusts for 2 different sets of attributes"
          raise ArgumentError, msg
        end

        # merge attributes and items with the request items

        @request_items[table] ||= { :keys => [] }
        @request_items[table][:attributes_to_get] = attributes if attributes
        @request_items[table][:keys] += keys
        @request_items[table].merge!(options)

        nil

      end

      # Specify a list of {Item} objects to batch fetch attributes for.
      # The table name is retrieved from the items objects, this means
      # the items do not need to belong to the same table.
      #
      # @param [Symbol, String, Array<String>] attributes The list of attributes
      #   to fetch.  If you want to load *ALL* attributes for the named items,
      #   then pass the symbol `:all`.
      #
      #       # get all attributes
      #       batch_get.table('mytable', :all, items)
      #
      #       # get one attribute for each item
      #       batch_get.table('mytable', ['name'], items)
      #
      #       # get a list of attributes for each item
      #       batch_get.table('mytable', ['name', 'size'], items)
      #
      # @param [Item] items One or more {Item} objects to fetch attributes
      #   for.  These items may come from any number of different tables.
      #
      def items attributes, *items
        [items].flatten.each do |item|
          self.table(item.table, attributes, [item])
        end
      end

      # @return [nil]
      def each &block

        options = { :request_items => @request_items }

        begin

          response = client.batch_get_item(options)

          response.data['Responses'].each_pair do |table_name,details|
            details['Items'].each do |hash_data|
              attributes = values_from_response_hash(hash_data)
              yield(table_name, attributes)
            end
          end

          options[:request_items] = convert_unprocessed_keys(response)

        end while options[:request_items]

        nil

      end

      # Yields only attribute hashes.  This removes the outer hash that
      # normally provides the :table_name and :attributes keys. This is
      # useful when your batch get requested items from a single table.
      def each_attributes
        each do |table_name, attributes|
          yield(attributes)
        end
      end

      protected
      def convert_unprocessed_keys response

        return nil if response.data['UnprocessedKeys'].empty?

        # convert the json response keys into symbolized keys
        str2sym = lambda do |key_desc|
          type, value = key_desc.to_a.flatten
          case type
          when "S" then { :s => value }
          when "N" then { :n => value }
          else
            raise "unhandled key type: #{type}"
          end
        end

        request_items = {}
        response.data['UnprocessedKeys'].each_pair do |table,keys|

          request_items[table] = {}

          request_items[table][:attributes_to_get] = keys['AttributesToGet'] if
            keys['AttributesToGet']

          request_items[table][:keys] = keys['Keys'].collect do |desc|
            key = {}
            key[:hash_key_element] = str2sym.call(desc['HashKeyElement'])
            key[:range_key_element] = str2sym.call(desc['RangeKeyElement']) if
              desc['RangeKeyElement']
            key
          end

        end
        request_items

      end

    end
  end
end
