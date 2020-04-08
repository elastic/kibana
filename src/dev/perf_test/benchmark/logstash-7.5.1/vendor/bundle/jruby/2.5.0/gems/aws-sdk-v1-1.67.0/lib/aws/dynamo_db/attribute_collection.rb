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

    # Represents the attributes of a DynamoDB item.  An attribute is a
    # name-value pair. The name must be a string, but the value can be
    # a string, number, string set, or number set.  Attribute values
    # cannot be null or empty.
    #
    # @note The SDK always returns numbers as BigDecimal objects and
    #   sets as Set objects; however, on input it accepts any numeric
    #   type for number attributes and either Arrays or Sets for set
    #   attributes.
    #
    # @example Retrieving specific attributes of an item
    #   (title, description) =
    #     item.attributes.values_at(:title, :description)
    #
    # @example Retrieving all attributes in hash form
    #   item.attributes.to_hash
    #
    # @example Replacing the value of an attribute
    #   item.attributes[:title] = "Automobiles"
    #
    # @example Doing a mixed update of item attributes in a single operation
    #   item.attributes.update do |u|
    #
    #     # add 12 to the (numeric) value of "views"
    #     u.add(:views => 12)
    #
    #     # delete attributes
    #     u.delete(:foo, :bar)
    #
    #     # delete values out of a set attribute
    #     u.delete(:colors => ["red", "blue"])
    #
    #     # replace values
    #     u.set(:title => "More Automobiles")
    #   end
    #
    # @example Returning overwritten values
    #   item.attributes.to_hash      # => { "foo" => "bar",
    #                                    "name" => "fred" }
    #   item.attributes.set(
    #     { "foo" => "baz" },
    #     :return => :updated_old
    #   )                         # => { "foo" => "bar" }
    #
    # @example Performing a conditional update
    #   item.set({ :version => 3 }, :if => { :version => 2 })
    class AttributeCollection

      include Core::Model
      include Enumerable
      include Types
      include Keys
      include Expectations

      # @return [Item] The item to which these attributes belong.
      attr_reader :item

      # @api private
      def initialize(item, opts = {})
        @item = item
        super
      end

      # Behaves like Hash#each; yields each attribute as a name/value
      # pair.
      #
      #     attributes.each { |(name, value)| puts "#{name} = #{value}" }
      #
      #     attributes.each { |name, value| puts "#{name} = #{value}" }
      #
      # @param (see #to_hash)
      #
      # @option options (see #to_hash)
      def each(options = {}, &block)
        to_hash(options).each(&block)
      end

      # @yieldparam [String] name Each attribute name.
      def each_key(options = {})
        each(options) { |k, v| yield(k) if block_given? }
      end

      # @yieldparam value Each attribute value belonging to the item.
      #   Values will be of type String, BigDecimal, Set<String> or
      #   Set<BigDecimal>.
      def each_value(options = {})
        each(options) { |k, v| yield(v) if block_given? }
      end

      # Retrieves the value of a single attribute.
      #
      # @param [String, Symbol] attribute The name of the attribute to
      #   get.
      #
      # @return The value of the specified attribute, which may be a
      #   String, BigDecimal, Set<String> or Set<BigDecimal>.
      def [] attribute
        attribute = attribute.to_s
        response_attributes = get_item(:attributes_to_get => [attribute])
        value_from_response(response_attributes[attribute])
      end

      # Replaces the value of a single attribute.
      #
      # @param [String, Symbol] attribute The name of the attribute to
      #   replace.
      #
      # @param value The new value to set.  This may be a String,
      #   Numeric, Set or Array of String objects, or Set or Array of
      #   Numeric objects.  Mixed types are not allowed in sets, and
      #   neither String values nor set values may be empty.  Setting
      #   an attribute to nil is the same as deleting the attribute.
      #
      # @return The new value of the attribute.
      def []= attribute, value
        set(attribute => value)
        value
      end

      # Replaces the values of one or more attributes.
      #
      # @param [Hash] attributes The attributes to replace.  The keys
      #   of the hash may be strings or symbols.  The values may be of
      #   type String, Numeric, Set or Array of String objects, or Set
      #   or Array of Numeric objects.  Mixed types are not allowed in
      #   sets, and neither String values nor set values may be empty.
      #   Setting an attribute to nil is the same as deleting the
      #   attribute.
      #
      # @param [Hash] options Options for updating the item.
      #
      # @option options (see #update)
      def set attributes, options = {}
        update(options) { |u| u.set(attributes) }
      end
      alias_method :merge!, :set
      alias_method :put, :set

      # Adds to the values of one or more attributes.  Each attribute
      # must be a set or number in the original item, and each input
      # value must have the same type as the value in the original
      # item.  For example, it is invalid to add a single number to a
      # set of numbers, but it is valid to add a set containing a
      # single number to another set of numbers.
      #
      # When the original attribute is a set, the values provided to
      # this method are added to that set.  When the original
      # attribute is a number, the original value is incremented by
      # the numeric value provided to this method.  For example:
      #
      #     item = table.items.put(
      #       :id => "abc123",
      #       :colors => ["red", "white"],
      #       :age => 3
      #     )
      #     item.attributes.add(
      #       { :colors => ["muave"],
      #         :age => 1 },
      #       :return => :updated_new
      #     ) # => { "colors" => Set["red", "white", "mauve"], "age" => 4 }
      #
      # @param [Hash] attributes The attribute values to add.  The
      #   keys of the hash may be strings or symbols.  The values may
      #   be of type Numeric, Set or Array of String objects, or Set
      #   or Array of Numeric objects.  Mixed types are not allowed in
      #   sets, and neither String values nor set values may be empty.
      #   Single string values are not allowed for this method, since
      #   DynamoDB does not currently support adding a string to
      #   another string.
      #
      # @param [Hash] options Options for updating the item.
      #
      # @option options (see #update)
      def add attributes, options = {}
        update(options) { |u| u.add(attributes) }
      end

      # @overload delete *attributes
      #
      #   Deletes attributes from the item.  Each argument must be a
      #   string or symbol specifying the name of the attribute to
      #   delete.  The last argument may be a hash containing options
      #   for the update.  See {#update} for more information about
      #   what options are accepted.
      #
      # @overload delete attributes, options = {}
      #
      #   Deletes specific values from one or more attributes, whose
      #   original values must be sets.
      #
      #   @param [Hash] attributes The attribute values to delete.
      #     The keys of the hash may be strings or symbols.  The
      #     values must be arrays or Sets of numbers or strings.
      #     Mixed types are not allowed in sets.  The type of each
      #     member in a set must match the type of the members in the
      #     original attribute value.
      #
      #   @param [Hash] options Options for updating the item.
      #
      #   @option options (see #update)
      def delete *args
        if args.first.kind_of?(Hash)
          delete_args = [args.shift]
        else
          delete_args = args
        end
        options = args.pop if args.last.kind_of?(Hash)
        update(options || {}) { |u| u.delete(*delete_args) }
      end

      # Used to build a batch of updates to an item's attributes.  See
      # {AttributeCollection#update} for more information.
      class UpdateBuilder

        # @api private
        attr_reader :updates

        include Types

        # @api private
        def initialize
          @updates = {}
        end

        # Replaces the values of one or more attributes.  See
        # {AttributeCollection#set} for more information.
        def set attributes
          to_delete = []
          attributes = attributes.inject({}) do |attributes, (name, value)|
            if value == nil
              to_delete << name
            else
              attributes[name] = value
            end
            attributes
          end
          attribute_updates("PUT", attributes)
          delete(*to_delete)
        end
        alias_method :put, :set
        alias_method :merge!, :set

        # Adds to the values of one or more attributes.  See
        # {AttributeCollection#add} for more information.
        def add attributes
          attribute_updates("ADD", attributes)
        end


        # Deletes one or more attributes or attribute values.  See
        # {AttributeCollection#delete} for more information.
        def delete *args
          if args.first.kind_of?(Hash)
            attribute_updates("DELETE",
                              args.shift,
                              :setify => true)
          else
            add_updates(args.inject({}) do |u, name|
                          u.update(name.to_s => {
                                     :action => "DELETE"
                                   })
                        end)
          end
        end

        private
        def attribute_updates(action, attributes, our_opts = {})
          new_updates = attributes.inject({}) do |new_updates, (name, value)|
            name = name.to_s
            context = "in value for attribute #{name}"
            value = [value].flatten if our_opts[:setify]
            new_updates.update(name => {
                                 :action => action,
                                 :value =>
                                 format_attribute_value(value, context)
                               })
          end
          add_updates(new_updates)
        end

        private
        def add_updates(new_updates)
          updates.merge!(new_updates) do |name, old, new|
            raise ArgumentError, "conflicting updates for attribute #{name}"
          end
        end

      end

      # Updates multiple attributes in a single operation.  This is
      # more efficient than performing each type of update in
      # sequence, and it also allows you to group different kinds of
      # updates into an atomic operation.
      #
      #     item.attributes.update do |u|
      #
      #       # add 12 to the (numeric) value of "views"
      #       u.add(:views => 12)
      #
      #       # delete attributes
      #       u.delete(:foo, :bar)
      #
      #       # delete values out of a set attribute
      #       u.delete(:colors => ["red", "blue"])
      #
      #       # replace values
      #       u.set(:title => "More Automobiles")
      #     end
      #
      # @param [Hash] options Options for updating the item.
      #
      # @option options [Hash] :if Designates a conditional update.
      #   The operation will fail unless the item exists and has the
      #   attributes in the value for this option.  For example:
      #
      #       # throws DynamoDB::Errors::ConditionalCheckFailedException
      #       # unless the item has "color" set to "red"
      #       item.attributes.update(:if => { :color => "red" }) do |u|
      #         # ...
      #       end
      #
      # @option options [String, Symbol, Array] :unless_exists A name
      #   or collection of attribute names; if the item already exists
      #   and has a value for any of these attributes, this method
      #   will raise
      #   `DynamoDB::Errors::ConditionalCheckFailedException`.  For example:
      #
      #       item.attributes.update(:unless_exists => :color) do |u|
      #         # ...
      #       end
      #
      # @option options [Symbol] :return (`:none`) Changes the return
      #   value of the method.  Valid values:
      #
      #     * `:none` - Return `nil`
      #     * `:all_old` - Returns a hash containing all of the original
      #       values of the attributes before the update, or
      #       `nil` if the item did not exist at the time of
      #       the update.
      #     * `:updated_old` - Returns a hash containing the original
      #       values of the attributes that were modified
      #       as part of this operation.  This includes
      #       attributes that were deleted, and
      #       set-valued attributes whose member values
      #       were deleted.
      #     * `:updated_new` - Returns a hash containing the new values of
      #       the attributes that were modified as part
      #       of this operation.  This includes
      #       set-valued attributes whose member values
      #       were deleted.
      #     * `:all_new` - Returns a hash containing the new values of all
      #       of the attributes.
      #
      # @yieldparam [UpdateBuilder] builder A handle for describing
      #   the update.
      #
      # @note DnamoDB allows only one update per attribute in a
      #   single operation.  This method will raise an ArgumentError
      #   if multiple updates are described for a single attribute.
      #
      # @return [nil] See the documentation for the `:return` option
      #   above.
      def update(options = {})
        builder = UpdateBuilder.new
        yield(builder)
        do_updates({ :attribute_updates => builder.updates },
                   options)
      end

      # Retrieves the values of the specified attributes.
      #
      # @param [Array<String, Symbol>] attributes The names of the
      #   attributes to retrieve.  The last argument may be a hash of
      #   options for retrieving attributes from the item.  Currently
      #   the only supported option is `:consistent_read`; If set to
      #   true, then a consistent read is issued, otherwise an
      #   eventually consistent read is used.
      #
      # @return [Array] An array in which each member contains the
      #   value of the attribute at that index in the argument list.
      #   Values may be Strings, BigDecimals, Sets of Strings or Sets
      #   or BigDecimals.  If a requested attribute does not exist,
      #   the corresponding member of the output array will be `nil`.
      def values_at(*attributes)
        options = {}
        options = attributes.pop if attributes.last.kind_of?(Hash)

        return [] if attributes.empty?

        attributes.map! { |a| a.to_s }
        response_attributes =
          get_item(options, :attributes_to_get => attributes)

        values_from_response_hash(response_attributes).
          values_at(*attributes)
      end

      # @param [Hash] options Options for retrieving attributes from
      #   the item.
      #
      # @option options [Boolean] :consistent_read If set to true,
      #   then a consistent read is issued, otherwise an eventually
      #   consistent read is used.
      def to_hash options = {}
        values_from_response_hash(get_item(options))
      end
      alias_method :to_h, :to_hash

      private
      def item_key_options(options = {})
        super(item, options)
      end

      private
      def get_item(their_options, our_options = {})
        options = their_options.merge(our_options)
        resp = client.get_item(item_key_options(options))
        resp.data['Item'] || {}
      end

      private
      def do_updates(client_opts, options)
        return nil if client_opts[:attribute_updates].empty?

        client_opts[:return_values] = options[:return].to_s.upcase if
          options[:return]

        expected = expect_conditions(options)
        client_opts[:expected] = expected unless expected.empty?

        resp = client.update_item(item_key_options(client_opts))

        values_from_response_hash(resp.data["Attributes"]) if
          options[:return] and resp.data["Attributes"]
      end

    end

  end
end
