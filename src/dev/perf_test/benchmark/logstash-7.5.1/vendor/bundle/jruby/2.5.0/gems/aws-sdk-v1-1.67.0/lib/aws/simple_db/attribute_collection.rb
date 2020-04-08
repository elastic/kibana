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
    class AttributeCollection

      include Core::Model
      include Enumerable
      include ConsistentReadOption
      include PutAttributes
      include DeleteAttributes

      # @param [Item] item The item to create an attribute collection for.
      # @return [AttributeCollection]
      def initialize item, options = {}
        @item = item
        super
      end

      # @return [Item] The item this collection belongs to.
      attr_reader :item

      # Returns an Attribute with the given name.
      #
      # @note This does not make a request to SimpleDB.
      #
      # You can ask for any attribute by name.  The attribute may or may not
      # actually exist in SimpleDB.
      #
      # @example Get an attribute by symbol or string name
      #
      #   colors = item.attributes[:colors]
      #   colors = item.attributes['colors']
      #
      # @param [String, Symbol] attribute_name name of the attribute to get.
      # @return [Item] An item with the given name.
      def [] attribute_name
        Attribute.new(item, attribute_name.to_s)
      end

      # Sets the values for a given attribute.
      #
      # @example Replace all of the values for the named attribute.
      #
      #   item.attributes[:color] = 'red', 'blue'
      #
      # @return This method returns the values passed to it.
      def []= attribute_name, *values
        self[attribute_name].set(*values)
      end

      # Yields all attribute values with their names.
      #
      # @example Getting all values for an item
      #
      #   item.attributes.each_value do |name, value|
      #     puts "#{name}: #{value}"
      #   end
      #
      # @yield [attribute_name, attribute_value] Yields once for every
      #   attribute value on the item.
      # @yieldparam [String] attribute_name
      # @yieldparam [String] attribute_value
      # @param [Hash] options
      # @option options [Boolean] :consistent_read (false) Causes this
      #   method to yield the most current attributes for this item.
      # @return [nil]
      def each_value options = {}, &block

        list = client.get_attributes(
          :domain_name => item.domain.name,
          :item_name => item.name,
          :consistent_read => consistent_read(options))

        list.attributes.each do |attribute|
          attribute_name = attribute.name
          attribute_value = attribute.value
          yield(attribute_name, attribute_value)
        end

        nil

      end

      # Yields all attribute for this item.
      #
      # @example Getting all attributes for an item
      #
      #   item.attributes.each do |attribute|
      #     puts attribute.name
      #   end
      #
      # @yield [attribute] Yields once for every attribute
      #   on the item.  Yields each attribute only one time, even it
      #   has multiple values.
      # @yieldparam [Attribute] attribute
      # @param [Hash] options
      # @option options [Boolean] :consistent_read (false) Causes this
      #   method to yield the most current attributes for this item.
      # @return [nil]
      def each options = {}, &block
        yielded = {}
        each_value(options) do |attribute_name, attribute_value|
          unless yielded[attribute_name]
            attribute = self[attribute_name]
            yield(attribute)
            yielded[attribute_name] = true
          end
        end
        nil
      end

      # Replaces attributes for the {#item}.
      #
      # The `attributes_hash` should have attribute names as keys.  The
      # hash values should be either strings or arrays of strings.
      #
      # Attributes not named in this hash are left alone.  Attributes named
      # in this hash are replaced.
      #
      # @example
      #
      #   item.attributes.set(
      #     'colors' => ['red', 'blue'],
      #     'category' => 'clearance')
      #
      # @param [Hash] attributes
      # @return [nil]
      def replace attributes
        do_put(attribute_hashes(attributes, true), attributes)
      end
      alias_method :set, :replace

      # Adds values to attributes on the {#item}.
      #
      # The `attributes_hash` should have attribute names as keys.  The
      # hash values should be either strings or arrays of strings.
      #
      # @example
      #
      #   item.attributes.add(
      #     'colors' => ['red', 'blue'],
      #     'category' => 'clearance')
      #
      # @param[Hash] attribute_hash
      # @return [nil]
      def add attributes
        do_put(attribute_hashes(attributes, false), attributes)
      end

      # Perform a mixed update of added and replace attributes.
      #
      # @example
      #
      #   item.attributes.put(
      #     :add => { 'colors' => %w(green blue), 'tags' => 'cool' }
      #     :replace => { 'quantity' => 5 }
      #   )
      #
      # @param [Hash] options
      # @option options [Hash] :add A hash of attribute names and values to
      #   append to this item.
      # @option options [Hash] :replace A hash of attribute names and values to
      #   add to this item.  If there are currently attributes of the same
      #   name they will be replaced (not appended to).
      # @option options [Hash] :replace
      # @return [nil]
      def put options = {}
        add = options[:add] || {}
        replace = options[:replace] || {}
        attributes = attribute_hashes(add, false)
        attributes += attribute_hashes(replace, true)
        do_put(attributes, options)
      end

      # Returns a hash of all attributes (names and values).
      # The attribute names are strings and the values are
      # arrays of strings.
      #
      # @example
      #
      #   item.attributes.to_h
      #   #=> { 'colors' => ['red','blue'], 'size' => ['large'] }
      #
      # @param [Hash] options
      # @option options [Boolean] :consistent_read (false) Causes this
      #   method to return the most current attributes values.
      # @return [Hash]
      def to_h options = {}
        hash = {}
        each_value(options) do |attribute_name,attribute_value|
          hash[attribute_name] ||= []
          hash[attribute_name] << attribute_value
        end
        hash
      end

      # Delete one or more attributes from {#item}.
      #
      # @example Delete a list of attributes by name (accepts a list or array)
      #
      #   item.attributes.delete 'size', 'color'
      #   item.attributes.delete %w(size color)
      #
      # @example Delete a specific list of attribute values
      #
      #   item.attributes.delete(:color => 'red', :tags => %w(special limited))
      #
      # @overload delete(attributes)
      #   @param [Hash] attributes A hash of attribute names and values to
      #     delete.
      #   @return [nil]
      #
      # @overload delete(*attribute_names)
      #   @param [String] A list of attribute names to delete.
      #   @return [nil]
      #
      def delete *args
        if args.size == 1 and args.first.kind_of?(Hash)
          delete_attribute_values(args.first)
        else
          delete_named_attributes(*args)
        end
        nil
      end

    end
  end
end
