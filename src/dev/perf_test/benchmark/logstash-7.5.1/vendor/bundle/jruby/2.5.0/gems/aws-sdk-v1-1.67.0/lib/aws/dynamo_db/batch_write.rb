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
    class BatchWrite

      include Types
      include Core::Model

      def initialize options = {}
        super(options)
        @request_items = {}
      end

      # Adds one or more items to the batch write operation.
      #
      #     # adding one item at a time to the batch
      #     batch = AWS::DynamoDB::BatchWrite.new
      #     batch.put('table-name', :id => 'id1', :color => 'red')
      #     batch.put('table-name', :id => 'id2', :color => 'blue')
      #     batch.process!
      #
      #     # adding multiple items to a batch
      #     batch = AWS::DynamoDB::BatchWrite.new
      #     batch.put('table-name', [
      #       { :id => 'id1', :color => 'red' },
      #       { :id => 'id2', :color => 'blue' },
      #       { :id => 'id3', :color => 'green' },
      #     ])
      #     batch.process!
      #
      # @param [Table,String] table A {Table} object or table name string.
      #
      # @param [Array<Hash>] items A list of item attributes to put.
      #   The hash must contain the table hash key element and range key
      #   element (if one is defined).
      #
      # @return [nil]
      #
      def put table, items
        write(table, :put => items.flatten)
        nil
      end

      # Adds one or more items to the batch to delete.
      #
      #     # for a table w/out a range key
      #     batch = AWS::DynamoDB::BatchWrite.new
      #     batch.delete('table-name', %w(hk1 hk2))
      #     batch.process!
      #
      #     # for a table with a range key
      #     batch = AWS::DynamoDB::BatchWrite.new
      #     batch.delete('table-name', [['hk1', 'rk2'], ['hk1', 'rk2']]])
      #     batch.process!
      #
      # @param [Table,String] table A {Table} object or table name string.
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
      # @return [nil]
      #
      def delete table, items
        write(table, :delete => items)
        nil
      end

      # Add items to the batch.  Accepts both item to put and and items
      # to delete.
      #
      # @param [Table,String] table A {Table} object or table name string.
      #
      # @param [Hash] options
      #
      # @option options [Array<Hash>] :put An array of items to put.  Each item
      #   should be an array of attribute hashes.
      #
      #       # add 3 items to the batch
      #       batch.write(table, :put => [
      #         { :id => 'abc', :color => 'red', :count => 2 },
      #         { :id => 'mno', :color => 'blue', :count => 3 },
      #         { :id => 'xyz', :color => 'green', :count => 5 },
      #       ])
      #
      # @option options [Array<String>,Array<Array>] :delete A list of item keys
      #   to delete.  For tables without a range key, items should be an array
      #   of hash key strings.
      #
      #       batch.write('table-name', :delete => ['hk1', 'hk2', 'hk3'])
      #
      #   For tables with a range key, items should be an array of
      #   hash key and range key pairs.
      #
      #       batch.write('table-name', :delete => [['hk1', 'rk1'], ['hk1', 'rk2']])
      #
      def write table, options = {}

        items = table_items(table)

        if put = options[:put]
          put.each do |attributes|
            items << { :put_request => { :item => format_put(attributes) }}
          end
        end

        if del = options[:delete]
          del.each do |keys|
            items << { :delete_request => { :key => format_delete(keys) }}
          end
        end

      end

      # Proccesses pending request items.
      # @return [nil]
      def process!

        return if @request_items.empty?

        opts = { :request_items => @request_items }

        begin

          response = client.batch_write_item(opts)

          unprocessed = response.data['UnprocessedItems']

          opts[:request_items] = convert_unprocessed_items(unprocessed)

        end while opts[:request_items]

        @request_items = {}
        nil

      end

      protected

      def table_name table
        table.is_a?(Table) ? table.name : table.to_s
      end

      def table_items table
        @request_items[table_name(table)] ||= []
      end

      def format_put attributes
        attributes.inject({}) do |hash, (key, value)|
          context = "value for attribute #{key}"
          hash.merge(key.to_s => format_attribute_value(value, context))
        end
      end

      def format_delete keys

        keys = [keys] unless keys.is_a?(Array)

        item = {}
        item[:hash_key_element] = format_attribute_value(keys.first)
        item[:range_key_element] = format_attribute_value(keys.last) if
          keys.count > 1

        item

      end

      def convert_unprocessed_items items

        return nil if items.empty?

        request_items = {}

        items.each_pair do |table,requests|

          request_items[table] ||= []

          requests.each do |request|

            item = request.values.first

            request_items[table] <<
              case request.keys.first
              when 'PutRequest'    then convert_put_item(item['Item'])
              when 'DeleteRequest' then convert_delete_item(item['Key'])
              end

          end

        end

        request_items

      end

      def convert_put_item item

        attributes = {}
        item.each_pair do |name,value|
          attributes[name] = str2sym(value)
        end

        { :put_request => { :item => attributes }}

      end

      def convert_delete_item item

        key = {}
        key[:hash_key_element] = str2sym(item['HashKeyElement'])
        key[:range_key_element] = str2sym(item['RangeKeyElement']) if
          item['RangeKeyElement']

        { :delete_request => { :key => key}}

      end

      def str2sym key_desc
        type = key_desc.keys.first
        value = key_desc[type]
        case type
        when "S"  then { :s  => value }
        when "N"  then { :n  => value }
        when "B"  then { :b  => value }
        when "SS" then { :ss => value }
        when "NS" then { :ns => value }
        when "BS" then { :bs => value }
        else
          raise "unhandled key type: #{type.inspect}"
        end
      end

    end
  end
end
