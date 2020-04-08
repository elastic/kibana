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

    # Represents a single item in a SimpleDB domain.  You can use
    # this class to delete the item or get its data.  You can also
    # use it to access the {AttributeCollection} for the item in
    # order to add, remove, or read the item's attributes.
    #
    #     item = AWS::SimpleDB.new.domains['mydomain'].items['item-id']
    #
    class Item

      include Core::Model
      include ExpectConditionOption
      include ConsistentReadOption

      # @param [Domain] domain The domain the item belongs to
      # @param [String] name The name of the item in SimpleDB.
      # @param [Hash] options
      def initialize domain, name, options = {}
        @domain = domain
        @name = name
        super
      end

      # @return [Domain] The domain this item belongs to.
      attr_reader :domain

      # @return [String] The item name.
      attr_reader :name

      # @return [AttributeCollection] A collection representing all attributes
      #   for this item.
      def attributes
        AttributeCollection.new(self)
      end

      # Deletes the item and all of its attributes from SimpleDB.
      # @param [Hash] options
      # @option options [Hash] :if Pass a hash with a single key (attribute
      #   name) and a single value (the attribute value).  This causes the
      #   delete to become conditional.
      # @option options [String,Symbol] :unless Pass an attribute name.  This
      #   causes the delete to become conditional on that attribute not
      #   existing.
      # @return [nil]
      def delete options = {}
        delete_opts = {}
        delete_opts[:domain_name] = domain.name
        delete_opts[:item_name] = name
        delete_opts[:expected] = expect_condition_opts(options)
        delete_opts.delete(:expected) if delete_opts[:expected].empty?
        client.delete_attributes(delete_opts)
        nil
      end

      # Returns all of the item's attributes in an {ItemData} instance.
      # @return [ItemData] An object with all of the loaded attribute names
      #   and values for this item.
      def data options = {}
        get_opts = {}
        get_opts[:domain_name] = domain.name
        get_opts[:item_name] = name
        get_opts[:consistent_read] = consistent_read(options)
        r = client.get_attributes(get_opts)
        ItemData.new(:name => name, :domain => domain, :response_object => r.data)
      end

      def == other
        other.is_a?(Item) and
        other.domain == domain and
        other.name == name
      end

      alias_method :eql?, :==

    end

  end
end
