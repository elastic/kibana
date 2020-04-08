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

    # Holds the data for a SimpleDB item.  While {Item} only proxies
    # requests to return data, this class actually stores data
    # returned by a query.  For example, you can use this to get the
    # list of items whose titles are palindromes using only a single
    # request to SimpleDB (not counting pagination):
    #
    #     items.enum_for(:select).
    #       select { |data| data.title == data.title.to_s.reverse }.
    #       map { |data| data.item }
    #
    # The {ItemCollection#select} call yields instances of ItemData,
    # and the `map` call in the example above gets the list of
    # corresponding {Item} instances.
    class ItemData

      # @api private
      def initialize(opts = {})
        @name = opts[:name]
        @attributes = opts[:attributes]
        @domain = opts[:domain]

        if obj = opts[:response_object]
          @name ||= obj[:name]
          if obj[:attributes]
            @attributes ||= begin
              attributes = {}
              obj[:attributes].each do |attr|
                attributes[attr[:name]] ||= []
                attributes[attr[:name]] << attr[:value]
              end
              attributes
            end
          end
        end
      end

      # @return [String] The item name.
      attr_reader :name

      # @return [Hash] A hash of attribute names to arrays of values.
      attr_reader :attributes

      # @return [Domain] The domain from which the item data was retrieved.
      attr_reader :domain

      # Returns the {Item} corresponding to this ItemData; you can
      # use this to perform further operations on the item, or to
      # fetch its most recent data.
      # @return [Item] The item this data belongs to.
      def item
        domain.items[name]
      end

    end

  end
end
