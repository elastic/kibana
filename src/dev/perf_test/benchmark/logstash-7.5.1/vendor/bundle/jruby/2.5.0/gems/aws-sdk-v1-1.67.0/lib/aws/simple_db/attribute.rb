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

    # Represents a single named item attribute in SimpleDB.
    class Attribute

      include Core::Model
      include Enumerable
      include ConsistentReadOption
      include PutAttributes
      include DeleteAttributes

      # @api private
      def initialize item, name, options = {}
        @item = item
        @name = name
        super
      end

      # @return [Item] The item this attribute belongs to.
      attr_reader :item

      # @return [String] The name of this attribute.
      attr_reader :name

      # Sets all values for this attribute, replacing current values.
      #
      # @example Setting a list of values
      #
      #   attributes['colors'].set 'red', 'blue', 'green'
      #
      # @example Setting an array of values
      #
      #   attributes['colors'].set ['red', 'blue']
      #
      # @param [String] values A list of attribute values to set.
      # @return [nil]
      def set *values
        put(values, true)
        nil
      end

      # Appends values to this attribute.  Duplicate values are ignored
      # by SimpleDB.
      #
      # @example Adding a list of values
      #
      #   attributes['colors'].add 'red', 'blue', 'green'
      #
      # @example Adding an array of values
      #
      #   attributes['colors'].add ['red', 'blue']
      #
      # @param [String] values A list of attribute values to add.
      # @return [nil]
      def add *values
        put(values, false)
        nil
      end
      alias_method :<<, :add

      # Deletes this attribute or specific values from this attribute.
      #
      # @example Delete the attribute and all of its values
      #
      #   item.attributes['color'].delete
      #
      # @example Delete specific attribute values
      #
      #   item.attributes['color'].delete('red', 'blue')
      #
      # @param values One ore more values to remove from this attribute.
      #   If values is empty, then all attribute values are deleted
      #   (which deletes this attribute).
      # @return [nil]
      def delete *values
        expect_opts = values.pop if values.last.kind_of?(Hash)

        if values.empty?
          delete_named_attributes(name, expect_opts || {})
        else
          delete_attribute_values(Hash[[[name, values]]].
                                  merge(expect_opts || {}))
        end
        nil
      end

      # Yields once for each value on this attribute.
      #
      # @yield [attribute_value] Yields once for each domain in the account.
      # @yieldparam [String] attribute_value
      # @param [Hash] options
      # @option options [Boolean] :consistent_read (false) A consistent read
      #   returns values that reflects all writes that received a successful
      #   response prior to the read.
      # @return [nil]
      def each options = {}, &block

        resp = client.get_attributes(
          :domain_name => item.domain.name,
          :item_name => item.name,
          :attribute_names => [name],
          :consistent_read => consistent_read(options))

        resp.attributes.each do |attribute|
          yield(attribute.value)
        end

        nil

      end

      # Returns all values for this attribute as an array of strings.
      #
      # @example
      #   item.attributes['ratings'].values
      #   #=> ['5', '3', '4']
      #
      # @param [Hash] options
      # @option options [Boolean] :consistent_read (false) A consistent read
      #   returns values that reflects all writes that received a successful
      #   response prior to the read.
      # @return [Array<String>] An array of attribute values
      def values options = {}
        values = []
        self.each(options) do |value|
          values << value
        end
        values
      end

      # @api private
      protected
      def put values, replace
        expect_opts = values.pop if values.last.kind_of?(Hash)
        do_put(attribute_hashes(Hash[[[name, values]]],
                                replace),
               expect_opts || {})
      end

    end
  end
end
