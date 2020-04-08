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
  class SimpleDB

    # Represents a collection of items in a SimpleDB domain.
    class ItemCollection

      # Identifies quoted regions in the string, giving access to
      # the regions before and after each quoted region, for example:
      #  "? ? `foo?``bar?` ? 'foo?' ?".scan(OUTSIDE_QUOTES_REGEX)
      #  # => [["? ? ", "`foo?``bar?`", " ? "], ["", "'foo?'", " ?"]]
      # @api private
      OUTSIDE_QUOTES_REGEX = Regexp.compile(
        '([^\'"`]*)(`(?:[^`]*(?:``))*[^`]*`|' +
        '\'(?:[^\']*(?:\'\'))*[^\']*\'|'      +
        '"(?:[^"]*(?:""))*[^"]*")([^\'`"]*)'
      )

      include ConsistentReadOption

      include Core::Collection::WithLimitAndNextToken

      # @return [Domain] The domain the items belong to.
      attr_reader :domain

      # @api private
      attr_reader :output_list

      # @api private
      attr_reader :conditions

      # @api private
      attr_reader :sort_instructions

      # @param [Domain] domain The domain that you want an item collection for.
      # @return [ItemCollection]
      def initialize domain, options = {}
        @domain = domain
        @output_list = options[:output_list] || 'itemName()'
        @conditions = options[:conditions] || []
        @sort_instructions = options[:sort_instructions]
        @not_null_attribute = options[:not_null_attribute]
        @limit = options[:limit]
        super
      end

      # Creates a new item in SimpleDB with the given attributes:
      #
      # @example
      #
      #   domain.items.create('shirt', {
      #     'colors' => ['red', 'blue'],
      #     'category' => 'clearance'})
      #
      # @overload create(item_name, attributes)
      #   @param [String] item_name The name of the item as you want it stored
      #     in SimpleDB.
      #   @param [Hash] attributes A hash of attribute names and values
      #     you want to store in SimpleDB.
      #   @return [Item] Returns a reference to the object that was created.
      def create item_name, *args
        item = self[item_name]
        item.attributes.replace(*args)
        item
      end

      # Returns an item with the given name.
      #
      # @note This does not make a request to SimpleDB.
      #
      # You can ask for any item.  The named item may or may not actually
      # exist in SimpleDB.
      #
      # @example Get an item by symbol or string name
      #
      #   item = domain.items[:itemname]
      #   item = domain.items['itemname']
      #
      # @param [String, Symbol] item_name name of the item to get.
      # @return [Item] Returns an item with the given name.
      def [] item_name
        Item.new(domain, item_name.to_s)
      end

      # Yields to the block once for each item in the collection.
      # This method can yield two type of objects:
      #
      # * AWS::SimpleDB::Item objects (only the item name is populated)
      # * AWS::SimpleDB::ItemData objects (some or all attributes populated)
      #
      # The default mode of an ItemCollection is to yield Item objects with
      # no populated attributes.
      #
      #     # only receives item names from SimpleDB
      #     domain.items.each do |item|
      #       puts item.name
      #       puts item.class.name # => AWS::SimpleDB::Item
      #     end
      #
      # You can switch a collection into yielded {ItemData} objects by
      # specifying what attributes to request:
      #
      #     domain.items.select(:all).each do |item_data|
      #       puts item_data.class.name # => AWS::SimpleDB::ItemData
      #       puts item_data.attributes # => { 'attr-name' => 'attr-value', ... }
      #     end
      #
      # You can also pass the standard scope options to #each as well:
      #
      #     # output the item names of the 10 most expensive items
      #     domain.items.each(:order => [:price, :desc], :limit => 10).each do |item|
      #       puts item.name
      #     end
      #
      # @yield [item] Yields once for every item in the {#domain}.
      #
      # @yieldparam [Item,ItemData] item If the item collection has been
      #   scoped by chaining `#select` or by passing the `:select` option
      #   then {ItemData} objects (that contain a hash of attributes) are
      #   yielded.  If no list of attributes has been provided, then#
      #   {Item} objects (with no populated data) are yielded.
      #
      # @param options [Hash]
      #
      # @option options [Boolean] :consistent_read (false) Causes this
      #   method to yield the most current data in the domain.
      #
      # @option options [Mixed] :select If select is provided, then each
      #   will yield {ItemData} objects instead of empty {Item}.
      #   The `:select` option may be:
      #
      #   * `:all` - Specifies that all attributes should requested.
      #
      #   * A single or array of attribute names (as strings or symbols).
      #     This causes the named attribute(s) to be requested.
      #
      # @option options :where Restricts the item collection using
      #   {#where} before querying (see {#where}).
      #
      # @option options :order Changes the order in which the items
      #   will be yielded (see {#order}).
      #
      # @option options :limit [Integer] The maximum number of
      #   items to fetch from SimpleDB.
      #
      # @option options :batch_size Specifies a maximum number of records
      #   to fetch from SimpleDB in a single request.  SimpleDB may return
      #   fewer items than :batch_size per request, but never more.
      #   Generally you should not need to specify this option.
      #
      # @return [String,nil] Returns a next token that can be used with
      #   the exact same SimpleDB select expression to get more results.
      #   A next token is returned ONLY if there was a limit on the
      #   expression, otherwise all items will be enumerated and
      #   nil is returned.
      #
      def each options = {}, &block
        super
      end

      # @api private
      def each_batch options = {}, &block
        handle_query_options(options) do |collection, opts|
          return collection.each_batch(opts, &block)
        end
        super
      end

      # Counts the items in the collection.
      #
      #     domain.items.count
      #
      # You can specify what items to count with {#where}:
      #
      #     domain.items.where(:color => "red").count
      #
      # You can also limit the number of items to count:
      #
      #     # count up to 500 items and then stop
      #     domain.items.limit(500).count
      #
      # @param [Hash] options Options for counting items.
      #
      # @option options [Boolean] :consistent_read (false) Causes this
      #   method to yield the most current data in the domain when `true`.
      #
      # @option options :where Restricts the item collection using
      #   {#where} before querying.
      #
      # @option options :limit [Integer] The maximum number of
      #   items to count in SimpleDB.
      #
      # @return [Integer] The number of items counted.
      #
      def count options = {}, &block

        handle_query_options(options) do |collection, opts|
          return collection.count(opts, &block)
        end

        options = options.merge(:output_list => "count(*)")

        count = 0
        next_token = nil

        begin

          response = select_request(options, next_token)

          if
            domain_item = response.items.first and
            count_attribute = domain_item.attributes.first
          then
            count += count_attribute.value.to_i
          end

          break unless next_token = response[:next_token]

        end while limit.nil? || count < limit

        count

      end
      alias_method :size, :count

#       # @return [PageResult] Returns an array-based object with results.
#       #   Results are either {Item} or {ItemData} objects depending on
#       #   the selection mode (item names only or with attributes).
#       #
#       def page options = {}
#
#         handle_query_options(options) do |collection, opts|
#           return collection.page(opts)
#         end
#
#         super(options)
#
#       end

      # Specifies a list of attributes select from SimpleDB.
      #
      #     domain.items.select('size', 'color').each do |item_data|
      #       puts item_data.attributes # => { 'size' => ..., :color => ... }
      #     end
      #
      # You can select all attributes by passing `:all` or '*':
      #
      #     domain.items.select('*').each {|item_data| ... }
      #
      #     domain.items.select(:all).each {|item_data| ... }
      #
      # Calling #select causes #each to yield {ItemData} objects
      # with #attribute hashes, instead of {Item} objects with
      # an item name.
      #
      # @param [Symbol, String, or Array] attributes The attributes to
      #   retrieve.  This can be:
      #
      #   * `:all` or '*' to request all attributes for each item
      #
      #   * A list or array of attribute names as strings or symbols
      #
      #     Attribute names may contain any characters that are valid
      #     in a SimpleDB attribute name; this method will handle
      #     escaping them for inclusion in the query.  Note that you
      #     cannot use this method to select the number of items; use
      #     {#count} instead.
      #
      # @return [ItemCollection] Returns a new item collection with the
      #   specified list of attributes to select.
      #
      def select *attributes, &block

        # Before select was morphed into a chainable method, it accepted
        # a hash of options (e.g. :where, :order, :limit) that no longer
        # make sense, but to maintain backwards compatability we still
        # consume those.
        #
        # TODO : it would be a good idea to add a deprecation warning for
        #        passing options to #select
        #
        handle_query_options(*attributes) do |collection, *args|
          return collection.select(*args, &block)
        end

        options = attributes.last.is_a?(Hash) ? attributes.pop : {}

        output_list = case attributes.flatten
        when []     then '*'
        when ['*']  then '*'
        when [:all] then '*'
        else attributes.flatten.map{|attr| coerce_attribute(attr) }.join(', ')
        end

        collection = collection_with(:output_list => output_list)

        if block_given?
          # previously select accepted a block and it would enumerate items
          # this is for backwards compatability
          collection.each(options, &block)
          nil
        else
          collection
        end

      end

      # Returns an item collection defined by the given conditions
      # in addition to any conditions defined on this collection.
      # For example:
      #
      #     items = domain.items.where(:color => 'blue').
      #       where('engine_type is not null')
      #
      #     # does SELECT itemName() FROM `mydomain`
      #     #      WHERE color = "blue" AND engine_type is not null
      #     items.each { |i| ... }
      #
      # ## Hash Conditions
      #
      # When `conditions` is a hash, each entry produces a condition
      # on the attribute named in the hash key.  For example:
      #
      #     # produces "WHERE `foo` = 'bar'"
      #     domain.items.where(:foo => 'bar')
      #
      # You can pass an array value to use an "IN" operator instead
      # of "=":
      #
      #     # produces "WHERE `foo` IN ('bar', 'baz')"
      #     domain.items.where(:foo => ['bar', 'baz'])
      #
      # You can also pass a range value to use a "BETWEEN" operator:
      #
      #     # produces "WHERE `foo` BETWEEN 'bar' AND 'baz'
      #     domain.items.where(:foo => 'bar'..'baz')
      #
      #     # produces "WHERE (`foo` >= 'bar' AND `foo` < 'baz')"
      #     domain.items.where(:foo => 'bar'...'baz')
      #
      # ## Placeholders
      #
      # If `conditions` is a string and "?" appears outside of any
      # quoted part of the expression, `placeholers` is expected to
      # contain a value for each of the "?" characters in the
      # expression.  For example:
      #
      #     # produces "WHERE foo like 'fred''s % value'"
      #     domain.items.where("foo like ?", "fred's % value")
      #
      # Array values are surrounded with parentheses when they are
      # substituted for a placeholder:
      #
      #     # produces "WHERE foo in ('1', '2')"
      #     domain.items.where("foo in ?", [1, 2])
      #
      # Note that no substitutions are made within a quoted region
      # of the query:
      #
      #     # produces "WHERE `foo?` = 'red'"
      #     domain.items.where("`foo?` = ?", "red")
      #
      #     # produces "WHERE foo = 'fuzz?' AND bar = 'zap'"
      #     domain.items.where("foo = 'fuzz?' AND bar = ?", "zap")
      #
      # Also note that no attempt is made to correct for syntax:
      #
      #     # produces "WHERE 'foo' = 'bar'", which is invalid
      #     domain.items.where("? = 'bar'", "foo")
      #
      # @return [ItemCollection] Returns a new item collection with the
      #   additional conditions.
      #
      def where conditions, *substitutions
        case conditions
        when String
          conditions = [replace_placeholders(conditions, *substitutions)]
        when Hash
          conditions = conditions.map do |name, value|
            name = coerce_attribute(name)
            case value
            when Array
              "#{name} IN " + coerce_substitution(value)
            when Range
              if value.exclude_end?
                "(#{name} >= #{coerce_substitution(value.begin)} AND " +
                  "#{name} < #{coerce_substitution(value.end)})"
              else
                "#{name} BETWEEN #{coerce_substitution(value.begin)} AND " +
                  coerce_substitution(value.end)
              end
            else
              "#{name} = " + coerce_substitution(value)
            end
          end
        end

        collection_with(:conditions => self.conditions + conditions)
      end

      # Changes the order in which results are returned or yielded.
      # For example, to get item names in descending order of
      # popularity, you can do:
      #
      #     domain.items.order(:popularity, :desc).map(&:name)
      #
      # @param attribute [String or Symbol] The attribute name to
      #   order by.
      # @param order [String or Symbol] The desired order, which may be:
      #   * `asc` or `ascending` (the default)
      #   * `desc` or `descending`
      # @return [ItemCollection] Returns a new item collection with the
      #   given ordering logic.
      def order(attribute, order = nil)
        sort = coerce_attribute(attribute)
        sort += " DESC" if order.to_s =~ /^desc(ending)?$/
        sort += " ASC" if order.to_s =~ /^asc(ending)?$/
        collection_with(:sort_instructions => sort,
                        :not_null_attribute => attribute.to_s)
      end

      # Limits the number of items that are returned or yielded.
      # For example, to get the 100 most popular item names:
      #
      #     domain.items.
      #       order(:popularity, :desc).
      #       limit(100).
      #       map(&:name)
      #
      # @overload limit
      #   @return [Integer] Returns the current limit for the collection.
      #
      # @overload limit(value)
      #   @return [ItemCollection] Returns a collection with the given limit.
      #
      def limit *args
        return @limit if args.empty?
        collection_with(:limit => Integer(args.first))
      end
      alias_method :_limit, :limit # for Collection::WithLimitAndNextToken

      # Applies standard scope options (e.g. :where => 'foo') and removes them from
      # the options hash by calling their method (e.g. by calling #where('foo')).
      # Yields only if there were scope options to apply.
      # @api private
      protected
      def handle_query_options(*args)

        options = args.last.is_a?(Hash) ? args.pop : {}

        if
          query_options = options.keys & [:select, :where, :order, :limit] and
          !query_options.empty?
        then
          collection = self
          query_options.each do |query_option|
            option_args = options[query_option]
            option_args = [option_args] unless option_args.kind_of?(Array)
            options.delete(query_option)
            collection = collection.send(query_option, *option_args)
          end

          args << options

          yield(collection, *args)

        end
      end

      protected
      def _each_item next_token, max, options = {}, &block

        handle_query_options(options) do |collection, opts|
          return collection._each_item(next_token, max, opts, &block)
        end

        response = select_request(options, next_token, max)

        if output_list == 'itemName()'
          response.items.each do |item|
            yield(self[item.name])
          end
        else
          response.items.each do |item|
            yield(ItemData.new(:domain => domain, :response_object => item))
          end
        end

        response[:next_token]

      end

      protected
      def select_request(options, next_token = nil, limit = nil)

        opts = {}
        opts[:select_expression] = select_expression(options)
        opts[:consistent_read] = consistent_read(options)
        opts[:next_token] = next_token if next_token

        if limit
          unless opts[:select_expression].gsub!(/LIMIT \d+/, "LIMIT #{limit}")
            opts[:select_expression] << " LIMIT #{limit}"
          end
        end

        client.select(opts)

      end

      # @api private
      protected
      def select_expression options = {}
        expression = []
        expression << "SELECT #{options[:output_list] || self.output_list}"
        expression << "FROM `#{domain.name}`"
        expression << where_clause
        expression << order_by_clause
        expression << limit_clause
        expression.compact.join(' ')
      end

      # @api private
      protected
      def where_clause

        conditions = self.conditions.dup

        if @not_null_attribute
          conditions << coerce_attribute(@not_null_attribute) + " IS NOT NULL"
        end

        conditions.empty? ? nil : "WHERE #{conditions.join(" AND ")}"

      end

      # @api private
      protected
      def order_by_clause
        sort_instructions ? "ORDER BY #{sort_instructions}" : nil
      end

      # @api private
      protected
      def limit_clause
        limit ? "LIMIT #{limit}" : nil
      end

      # @api private
      protected
      def collection_with options
        ItemCollection.new(domain, {
          :output_list => output_list,
          :conditions => conditions,
          :sort_instructions => sort_instructions,
          :not_null_attribute => @not_null_attribute,
          :limit => limit,
        }.merge(options))
      end

      # @api private
      protected
      def replace_placeholders(str, *substitutions)
        named = {}
        named = substitutions.pop if substitutions.last.kind_of?(Hash)
        if str =~ /['"`]/
          count = 0
          str = str.scan(OUTSIDE_QUOTES_REGEX).
            map do |(before, quoted, after)|

            (before, after) = [before, after].map do |s|
              s, count =
                replace_placeholders_outside_quotes(s, count, substitutions, named)
              s
            end
            [before, quoted, after].join
          end.join
        else
          # no quotes
          str, count =
            replace_placeholders_outside_quotes(str, 0, substitutions, named)
        end
        raise ArgumentError.new("extra value(s): #{substitutions.inspect}") unless
          substitutions.empty?
        str
      end

      # @api private
      protected
      def replace_placeholders_outside_quotes(str, count, substitutions, named = {})
        orig_str = str.dup
        str, count = replace_positional_placeders(str, count, substitutions)
        str = replace_named_placeholders(orig_str, str, named)
        [str, count]
      end

      # @api private
      protected
      def replace_positional_placeders(str, count, substitutions)
        str = str.gsub("?") do |placeholder|
          count += 1
          raise ArgumentError.new("missing value for placeholder #{count}") if
            substitutions.empty?
          coerce_substitution(substitutions.shift)
        end
        [str, count]
      end

      # @api private
      protected
      def replace_named_placeholders(orig_str, str, named)
        named.each do |name, value|
          str = str.gsub(name.to_sym.inspect, coerce_substitution(value))
        end
        str.scan(/:\S+/) do |missing|
          if orig_str.include?(missing)
            raise ArgumentError.new("missing value for placeholder #{missing}")
          end
        end
        str
      end

      # @api private
      protected
      def coerce_substitution(subst)
        if subst.kind_of?(Array)
          "(" +
            subst.flatten.map { |s| coerce_substitution(s) }.join(", ") + ")"
        else
          "'" + subst.to_s.gsub("'", "''") + "'"
        end
      end

      # @api private
      protected
      def coerce_attribute(name)
        '`' + name.to_s.gsub('`', '``') + '`'
      end

    end
  end
end
