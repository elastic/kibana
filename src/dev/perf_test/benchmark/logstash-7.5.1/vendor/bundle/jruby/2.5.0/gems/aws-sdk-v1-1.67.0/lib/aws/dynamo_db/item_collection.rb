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

    # Represents a collection of DynamoDB items.
    #
    # You can use an item collection to:
    #
    # * Create an {Item}
    # * Get an {Item}
    # * Enumerate {Item} or {ItemData} objects
    #
    # ## Creating an Item
    #
    # To create an item, just call {#create} with a hash of attributes.
    #
    #     table = dynamo_db.tables['my-table']
    #     table.hash_key = [:id, :string]
    #
    #     table.items.create('id' => 'abc', 'count' => 5, 'colors' => %w(red blue))
    #
    # Attribute names can be symbols/strings and values can be strings or
    # numbers or arrays/sets of strings/numbers.  The attributes must contain
    # the hash key name/value for the item and the value must be of the
    # correct type (e.g. string or number).
    #
    # ## Getting an Item
    #
    # To get an item, you provide the hash key
    #
    #     # gets a reference to the item, no request is made
    #     item = table.items['hash-key-value']
    #
    # You call methods against the item returned to get, add, update or delete
    # attributes.  See {Item} for more information.
    #
    # ## Enumerating Items
    #
    # You can enumerate items 2 ways:
    #
    # * Enuemrate {Item} objects
    # * Enumerate {ItemData} objects
    #
    # {Item} objects do not have any attribute data populated.  Think of
    # them as just references to the item in Amazon DynamoDB.  They only
    # konw the objects hash key (and optional range key).
    #
    # {ItemData} objects are wrappers around the actual item attributes.
    #
    # To enumerate {Item} objects just call each on the item collection.
    #
    #     table.items.each do |item|
    #       puts item.hash_value
    #     end
    #
    # To enumerate {ItemData} objects you need to specify what attributes
    # you are interested in.  This will cause #each to yield {ItemData}
    # objects.  Call {ItemData#attributes} to get the hash of attribute
    # names/values.
    #
    #     table.items.select('id', 'category').each do |item_data|
    #       item_data.attributes #=> { 'id' => 'abc', 'category' => 'foo' }
    #     end
    #
    # If you want item data objects with all attributes just call select
    # without a list of attributes (#select still accepts options).
    #
    #     # request a maximum of 10 items from Amazon DynamoDB
    #     table.items.select(:limit => 10).each do |item_data|
    #       item_data.attributes #=> { 'id' => 'abc', 'category' => 'foo', ... }
    #     end
    #
    # Please note that enumerating objects is done via the scan operation.
    # Refer to the Amazon DynamoDB documentation for more information
    # about scanning.
    #
    class ItemCollection

      include Core::Collection::WithLimitAndNextToken
      include Types
      include Expectations

      # @api private
      def initialize(table, opts = {})
        @table = table
        @scan_filters = opts[:scan_filters] || {}
        super
      end

      # @return [Table] The table to which the items in the collection
      #   belong.
      attr_reader :table

      # @api private
      attr_reader :scan_filters

      # Creates a new item, or replaces an old item with a new item
      # (including all the attributes). If an item already exists in
      # the specified table with the same primary key, the new item
      # completely replaces the existing item. You can perform a
      # conditional put (insert a new item if one with the specified
      # primary key doesn't exist), or replace an existing item if it
      # has certain attribute values.
      #
      #     items.put(:id => "abc123", :colors => ["red", "white"])
      #
      # @param [Hash] attributes The attributes to store with the
      #   item.  These must include the primary key attributes for the
      #   table (see {Table#hash_key} and {Table#range_key}.
      #   Attribute names may be symbols or UTF-8 strings, and
      #   attribute values may be any of these types:
      #
      #     * String
      #     * Array<String> or Set<String>
      #     * Numeric
      #     * Array<Numeric> or Set<Numeric>
      #
      #   Empty sets, arrays, and strings are invalid.
      #
      # @param [Hash] options (<code>{}</code>) Additional options for
      #   storing the item.
      #
      # @option options [Hash] :if Designates a conditional put.  The
      #   operation will fail unless the item exists and has the
      #   attributes in the value for this option.  For example:
      #
      #       # throws DynamoDB::Errors::ConditionalCheckFailedException
      #       # unless the item has "color" set to "red"
      #       items.put(
      #         { :foo => "Bar" },
      #         :if => { :color => "red" }
      #       )
      #
      # @option options [String, Symbol, Array] :unless_exists A name
      #   or collection of attribute names; if the item already exists
      #   and has a value for any of these attributes, this method
      #   will raise
      #   `DynamoDB::Errors::ConditionalCheckFailedException`.  For example:
      #
      #       items.put({ :id => "abc123" }, :unless_exists => "id")
      #
      # @option options [Symbol] :return If set to `:all_old`, this
      #   method will return a hash containing the previous values of
      #   all attributes for the item that was overwritten.  If this
      #   option is set to `:none`, or if it is set to `:all_old` and
      #   no item currently exists with the same primary key values,
      #   the method will return `nil`.
      #
      # @return [Item] An object representing the item that was
      #   stored.  Note that the SDK retains only the item's primary
      #   key values in memory; if you access the attributes of the
      #   item using the returned object, the SDK will contact the
      #   service to retrieve those attributes.  The `:return` option
      #   may be used to change the return value of this method.
      def create attributes, options = {}
        table.assert_schema!

        attributes = attributes.inject({}) do |hash, (key, value)|
          context = "value for attribute #{key}"
          hash.update(key.to_s => format_attribute_value(value, context))
        end

        client_opts = {
          :table_name => table.name,
          :item => attributes
        }

        expected = expect_conditions(options)
        client_opts[:expected] = expected unless expected.empty?

        client_opts[:return_values] = options[:return].to_s.upcase if
          options[:return]

        resp = client.put_item(client_opts)

        item = Item.new_from(:put_item, attributes, table)

        if options[:return]
          values_from_response_hash(resp.data["Attributes"])
        else
          item
        end
      end
      alias_method :put, :create

      # Returns an object representing an item in the table,
      # identified by its hash key value.  This method will raise an
      # exception unless the table has a schema loaded or configured,
      # or if the table has a composite primary key.
      #
      #     table.hash_key = [:id, :string]
      #     item = table.items["abc123"]
      #
      # @param [String, Numeric] hash_value The hash key value for the
      #   item.  The type of this parameter must match the type in the
      #   table's schema, but currently the SDK makes no attempt to
      #   validate the key.
      #
      # @return [Item]
      def [] hash_value
        table.assert_schema!
        raise(ArgumentError,
              "table has a range key; use #at instead of #[]") unless
          table.simple_key?
        Item.new(table, hash_value)
      end

      # Returns an object representing an item in the table,
      # identified by its hash key value and conditionally its range
      # key value.  This method will raise an exception unless the
      # table has a schema loaded or configured.  The type of each
      # parameter must match the type in the table's schema, but
      # currently the SDK makes no attempt to validate the key
      # elements.
      #
      #     table.hash_key = [:id, :string]
      #     table.range_key = [:range, :number]
      #     item = table.items.at("abc123", 12)
      #
      # @param [String, Numeric] hash_value The hash key value for the
      #   item.
      #
      # @param [String, Numeric] range_value The range key value for
      #   the item.  This parameter is required when the table has a
      #   composite primary key, and it may not be specified when the
      #   table has a simple primary key.
      #
      # @return [Item]
      def at hash_value, range_value = nil
        table.assert_schema!
        if table.composite_key? and !range_value
          raise ArgumentError, "a range key value is required for this table"
        end
        Item.new(table, hash_value, range_value)
      end
      alias_method :[], :at

      # Provides a convenient syntax for expressing scan filters.
      #
      #     table.items.where(:path).begins_with("users/")
      #
      class FilterBuilder

        include Types

        attr_reader :items

        attr_reader :attribute

        # @api private
        def initialize(items, attribute)
          @items = items
          @attribute = attribute
        end

        # Filters the collection to include only those items where the
        # value of this attribute is equal to the argument.
        #
        # @param [String, Numeric] value The value to compare against.
        #
        # @return [ItemCollection] A new item collection filtered by
        #   this condition.
        def equals value
          @items.with_filter(attribute, "EQ", value)
        end

        # Filters the collection to include only those items where the
        # value of this attribute is not equal to the argument.
        #
        # @param [String, Numeric] value The value to compare against.
        #
        # @return [ItemCollection] A new item collection filtered by
        #   this condition.
        def not_equal_to value
          @items.with_filter(attribute, "NE", value)
        end

        # Filters the collection to include only those items where the
        # value of this attribute is less than the argument.
        #
        # @param [String, Numeric] value The value to compare against.
        #
        # @return [ItemCollection] A new item collection filtered by
        #   this condition.
        def less_than value
          @items.with_filter(attribute, "LT", value)
        end

        # Filters the collection to include only those items where the
        # value of this attribute is greater than the argument.
        #
        # @param [String, Numeric] value The value to compare against.
        #
        # @return [ItemCollection] A new item collection filtered by
        #   this condition.
        def greater_than value
          @items.with_filter(attribute, "GT", value)
        end

        # Filters the collection to include only those items where the
        # value of this attribute is less than or equal to the
        # argument.
        #
        # @param [String, Numeric] value The value to compare against.
        #
        # @return [ItemCollection] A new item collection filtered by
        #   this condition.
        def lte value
          @items.with_filter(attribute, "LE", value)
        end

        # Filters the collection to include only those items where the
        # value of this attribute is greater than or equal to the
        # argument.
        #
        # @param [String, Numeric] value The value to compare against.
        #
        # @return [ItemCollection] A new item collection filtered by
        #   this condition.
        def gte value
          @items.with_filter(attribute, "GE", value)
        end

        # Filters the collection to include only those items where
        # this attribute does not exist.
        #
        # @return [ItemCollection] A new item collection filtered by
        #   this condition.
        def is_null
          @items.with_filter(attribute, "NULL")
        end

        # Filters the collection to include only those items where
        # this attribute exists.
        #
        # @return [ItemCollection] A new item collection filtered by
        #   this condition.
        def not_null
          @items.with_filter(attribute, "NOT_NULL")
        end

        # Filters the collection to include only those items where
        # this attribute contains the argument.  If the attribute
        # value is a set, this filter matches items where the argument
        # is one of the values in the set.  If the attribute value is
        # a string, this filter matches items where the argument
        # (which must be a string) is a substring of the attribute
        # value.
        #
        # @param [String, Numeric] value The value to compare against.
        #
        # @return [ItemCollection] A new item collection filtered by
        #   this condition.
        def contains value
          @items.with_filter(attribute, "CONTAINS", value)
        end

        # Filters the collection to include only those items where
        # this attribute does not contain the argument.  If the
        # attribute value is a set, this filter matches items where
        # the argument is not present in the set.  If the attribute
        # value is a string, this filter matches items where the
        # argument (which must be a string) is not a substring of the
        # attribute value.
        #
        # @param [String, Numeric] value The value to compare against.
        #
        # @return [ItemCollection] A new item collection filtered by
        #   this condition.
        def does_not_contain value
          @items.with_filter(attribute, "NOT_CONTAINS", value)
        end

        # Filters the collection to include only those items where
        # this attribute begins with the argument.
        #
        # @param [String] value The value to compare against.
        #
        # @return [ItemCollection] A new item collection filtered by
        #   this condition.
        def begins_with value
          @items.with_filter(attribute, "BEGINS_WITH", value)
        end

        # Filters the collection to include only those items where
        # this attribute equals one of the arguments.
        #
        # @param [Array<String, Numeric>] values The values to compare
        #   against.
        #
        # @return [ItemCollection] A new item collection filtered by
        #   this condition.
        def in *values
          @items.with_filter(attribute, "IN", *values)
        end

        # Filters the collection to include only those items where
        # this attribute is between the two arguments.
        #
        # @param [String, Numeric] min The minimum value.
        #
        # @param [String, Numeric] max The maximum value.
        #
        # @return [ItemCollection] A new item collection filtered by
        #   this condition.
        def between min, max
          @items.with_filter(attribute, "BETWEEN", min, max)
        end

      end

      # @overload where(attributes)
      #
      #       table.items.where(:name => "Fred")
      #
      #   @param [Hash] attributes The returned collection will be
      #     filtered such that each item contains the attributes and
      #     values in this map.
      #
      #   @return [ItemCollection] A collection where all the items
      #     have the provided attributes and values.
      #
      # @overload where(attribute_name)
      #
      #       table.items.where(:name).equals("Fred")
      #
      #   @return [FilterBuilder] An object that allows you to specify
      #     a filter on the provided attribute name.
      def where(filter)
        case filter
        when Hash
          filter.inject(self) do |items, (name, value)|
            case value
            when nil
              items.with_filter(name.to_s, "NULL")
            when Range
              items.with_filter(name.to_s, "BETWEEN", value.begin, value.end)
            else
              items.with_filter(name.to_s, "EQ", value)
            end
          end
        when String, Symbol
          FilterBuilder.new(self, filter.to_s)
        end
      end
      alias_method :and, :where

      # Iterates over all the items in the collection using a scan
      # operation.  A scan operation scans the entire table. You can
      # specify filters to apply to the results to refine the values
      # returned to you, after the complete scan. Amazon DynamoDB puts
      # a 1MB limit on the scan (the limit applies before the results
      # are filtered). A scan can result in no table data meeting the
      # filter criteria.
      #
      # For more information about filtering the collection
      # see the {#where} method.
      #
      # @param [Hash] options Options for iterating the collection.
      #
      # @yieldparam [Item] item Each item in the collection.
      #
      # @option options [Integer] :limit The maximum number of items to yield.
      #
      # @option options [Integer] :batch_size The maximum number of items
      #   to retrieve with each service request.
      def each(options = {}, &block)

        if conditions = options.delete(:where)
          return where(conditions).each(options, &block)
        end

        table.assert_schema!

        options = options.merge(:table_name => table.name)
        options[:scan_filter] = scan_filters unless scan_filters.empty?

        unless options[:count] or options[:item_data]
          options[:attributes_to_get] = [table.hash_key.name]
          options[:attributes_to_get] << table.range_key.name if
            table.composite_key?
        end

        super(options, &block)
      end

      def first(options = {})
        each(options) do |item|
          return item
        end
      end

      # Retrieves data about the items in the collection.  This method
      # works like {#each}, except that it returns or yields
      # {ItemData} instances instead of {Item} instances.  This is
      # useful if you want to use the attributes of the item in a loop
      # or retain them in memory.  Also, unlike {#each} which always
      # requests only the primary key attributes of the items, this
      # method allows you to specify which attributes to retrieve from
      # DynamoDB.
      #
      #     # fetch all attributes for a collection of items
      #     items.select { |data| p data.attributes }
      #
      #     # fetch only the "color" attribute of each item
      #     items.select(:color) { |data| p data.attributes["color"] }
      #
      #     # use client-side filtering to delete a subset of the items
      #     items.select do |data|
      #       data.item.delete if data.attributes.size % 2 == 0
      #     end
      #
      # @overload select(*attributes, options = {})
      #
      #   @param [Array<String, Symbol>] attributes Specifies which
      #     attributes to retrieve from the service.  By default all
      #     attributes are retrieved.  If the last argument is a hash,
      #     it may contain options for iterating the items in the
      #     collection.  See the {#each} method for more information
      #     about these options.
      #
      #   @param [Hash] options
      #
      #   @option options [Integer] :limit The maximum number of records to
      #     select (scan).  If more records are requested than can
      #     be returned in a single response, multiple requests
      #     will be made.
      #
      #   @yieldparam [ItemData] data The data for each item in the
      #     collection.  The attributes of each item will be populated
      #     in the ItemData object; however, {ItemData#item} will not be
      #     populated unless the requested attributes include all
      #     elements of the table's primary key.  For example, if a
      #     table has a composite primary key, this method will only
      #     populate {ItemData#item} if the list of requested attributes
      #     includes both the hash key and range key attributes.
      #
      #   @return [Enumerator, nil] If a block is given, this method
      #     returns nil.  Otherwise, it returns an enumerator for the
      #     values that would have been yielded to the block.
      #
      def select *attributes, &block

        options = {}
        options = attributes.pop if attributes.last.kind_of?(Hash)
        options = options.merge(:item_data => true)
        options[:attributes_to_get] =
          attributes.map { |att| att.to_s } unless
          attributes.empty?

        if block_given?
          each(options, &block)
        else
          enumerator(options)
        end

      end

      # Counts the items in the collection using a table scan.  The
      # count applies to the items that match all the filters on the
      # collection.  For example:
      #
      #     # count the blue items
      #     items.where(:color => "blue").count
      #
      # @param [Hash] options Options for counting the items.
      #
      # @option options [Integer] :max_requests The maximum number of
      #   requests to make.
      #
      # @option options [Integer] :limit The maximum count; the return
      #   value will be less than or equal to the value of this
      #   option.
      #
      # @option options [Integer] :batch_size DynamoDB will scan up to
      #   1MB of data on each request; you can use this option to
      #   further limit the number of items scanned on each request.
      #
      # @return [Integer]
      def count options = {}
        options = options.merge(:count => true)

        # since each with :count yields the per-page counts, each with
        # :limit and :count effectively limits the number of requests,
        # not the number of items
        limit = options.delete(:limit)
        options[:limit] = options.delete(:max_requests) if
          options.key?(:max_requests)

        # it usually doesn't make sense to ask for more items than you
        # care about counting
        options[:batch_size] ||= limit if limit

        enumerator(options).inject(0) do |sum, n|
          return limit if limit && sum + n >= limit
          sum + n
        end
      end

      RANGE_KEY_OPTIONS = {
        :range_less_than => "LT",
        :range_greater_than => "GT",
        :range_lte => "LE",
        :range_gte => "GE",
        :range_begins_with => "BEGINS_WITH"
      }

      # Queries the items in the table by primary key values.  This
      # operation is generally more efficient than the scan operation,
      # which always scans the whole table.  A Query operation
      # searches for a specific range of keys satisfying a given set
      # of key conditions and does not have the added step of
      # filtering out results.
      #
      #     # find all items with a given hash key value
      #     items.query(:hash_value => "abc123")
      #
      #     # get only the colors attribute of each item
      #     items.query(
      #       :hash_value => "abc123",
      #       :select => [:colors])
      #
      #     # find only the items where the range key is between two values
      #     items.query(
      #       :hash_value => "abc123",
      #       :range_value => 1..100
      #     )
      #
      # @note This method is only valid for tables with a composite
      #   primary key.
      #
      # @param [Hash] options Options for the query.  `:hash_value` is
      #   required.  Only one of the following options may be set:
      #
      #     * `:range_value`
      #     * `:range_greater_than`
      #     * `:range_less_than`
      #     * `:range_gte`
      #     * `:range_lte`
      #     * `:range_begins_with`
      #
      # @option [Boolean] :scan_index_forward (true) Specifies which
      #   order records will be returned.  Defaults to returning them
      #   in ascending range key order.  Pass false to reverse this.
      #
      # @option :select (nil) By default {#query} yields {Item}
      #   objects without any attribute data.  If you want to select
      #   specific attributes, pass a list of them to :select.
      #
      #       :select => [:id, :category, :size]
      #
      #   If you want to select ALL attributes, pass the symbol `:all`
      #
      #       :select => :all
      #
      # @option options [String, Numeric] :hash_value Attribute value
      #   of the hash component of the composite primary key.
      #
      # @option options [Array<String, Symbol>, String, Symbol] :select
      #   Attribute name or names to retrieve.  When this option is
      #   set, the returned or yielded items will be instances of
      #   {ItemData} instead of {Item}.  The special value `:all`
      #   indicates that all attributes should be retrieved and
      #   returned in ItemData instances.
      #
      # @option options [String, Numeric, Range] :range_value
      #   Specifies which range key values to find in the table.  If
      #   this is a Range, the query will return items with range key
      #   values between the beginning and end of the range
      #   (inclusive).  If it is a string or number, the query will
      #   return only the item with that range key value.
      #
      # @option options [String, Numeric] :range_greater_than Matches
      #   items where the range key value is greater than this value.
      #
      # @option options [String, Numeric] :range_less_than Matches
      #   items where the range key value is less than this value.
      #
      # @option options [String, Numeric] :range_gte Matches items
      #   where the range key value is greater than or equal to this
      #   value.
      #
      # @option options [String, Numeric] :range_lte Matches items
      #   where the range key value is less than or equal to this
      #   value.
      #
      # @option options [String, Numeric] :range_begins_with Matches
      #   items where the range key value begins with this value.
      #   This option is only valid if the range key is a string.
      #
      def query(options = {}, &block)

        options = options.merge(:query => true)

        raise ArgumentError, "a hash key value is required" unless
          options[:hash_value]

        options[:hash_key_value] =
          format_attribute_value(options.delete(:hash_value))

        range = options.delete(:range_value)
        range_op = nil
        value_list = []
        if range and range.kind_of?(Range)
          value_list = [format_attribute_value(range.begin),
                        format_attribute_value(range.end)]
          range_op = "BETWEEN"
        elsif range
          value_list = [format_attribute_value(range)]
          range_op = "EQ"
        end

        RANGE_KEY_OPTIONS.each do |name, op|
          if value = options.delete(name)
            raise(ArgumentError,
                  "only one range key condition is supported") if range_op
            range_op = op
            value_list = [format_attribute_value(value)]
          end
        end

        options[:range_key_condition] = {
          :attribute_value_list => value_list,
          :comparison_operator => range_op
        } if range_op

        if select = options.delete(:select) || options.delete(:attributes_to_get)
          options[:item_data] = true
          options[:attributes_to_get] = select.map(&:to_s) unless select == :all
        end

        if block
          each(options, &block)
        else
          enumerator(options)
        end
      end

      # @api private
      def with_filter attribute, op, *values

        values = values.map {|value| format_attribute_value(value) }

        filter = {
          :attribute_value_list => values,
          :comparison_operator => op
        }

        if scan_filters.key?(attribute)
          raise(ArgumentError, "conflicting filters for attribute #{attribute}")
        end

        refine(:scan_filters => scan_filters.merge(attribute => filter))

      end

      # @api private
      def refine(opts)
        opts = {
          :scan_filters => scan_filters
        }.merge(opts)
        self.class.new(table, opts)
      end

      protected
      def _each_item next_token, limit, options = {}, &block

        options[:exclusive_start_key] = next_token if next_token

        options[:limit] = limit if limit

        method = options.delete(:query) ? :query : :scan

        mode = case
        when options.delete(:item_data) then :item_data
        when options[:count] then :count
        else :item
        end

        response = client.send(method, options)

        _yield_items(mode, response, &block)

        response.data["LastEvaluatedKey"]

      end

      protected
      def _yield_items mode, response, &block

        case mode

        # yield the count of items matching
        when :count
          yield(response.data["Count"])

        # yeild item data objects
        when :item_data

          table.assert_schema!

          #construct_items =
          #  (true if request_includes_key?(response.request_options))

          construct_items = request_includes_key?(response.request_options)

          response.data["Items"].each do |i|
            attributes = values_from_response_hash(i)

            item = nil
            item = Item.new_from(:put_item, i, table) if construct_items

            item_data = ItemData.new(:item => item, :attributes => attributes)

            yield(item_data)

          end

        # yield item objects
        when :item
          response.data["Items"].each do |i|
            item = Item.new_from(:put_item, i, table)
            yield(item)
          end

        end

      end

      protected
      def request_includes_key?(options)
        requested_atts = options[:attributes_to_get]
        requested_atts.nil? or
          (table.simple_key? &&
           requested_atts.include?(table.hash_key.name)) or
          (table.composite_key? &&
           requested_atts.include?(table.hash_key.name) &&
           requested_atts.include?(table.range_key.name))
      end

    end

  end
end
