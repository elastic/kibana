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

    # SimpleDB can report on the amount of data stored in a domain,
    # the number of items, etc.
    #
    # @example
    #
    #  sdb = SimpleDB.new
    #  sdb.domains['mydomain'].metadata.to_h
    #
    #  # the hash returned above might look like:
    #  {
    #    :timestamp => 1300841880,
    #    :attribute_names_size_bytes => 12,
    #    :item_count => 1,
    #    :attribute_value_count => 6,
    #    :attribute_values_size_bytes => 25,
    #    :item_names_size_bytes => 3,
    #    :attribute_name_count => 3
    #  }
    #
    class DomainMetadata

      include Core::Model

      # @api private
      ATTRIBUTES = [
        :item_count,
        :item_names_size_bytes,
        :attribute_name_count,
        :attribute_names_size_bytes,
        :attribute_value_count,
        :attribute_values_size_bytes,
        :timestamp,
      ]

      # @param [Domain] domain The domain to fetch metadata for.
      # @return [DomainMetadata]
      def initialize domain, options = {}
        @domain = domain
        super
      end

      # @return [Domain] The domain this metadata is describing.
      attr_reader :domain

      # @return [Integer] The number of all items in the {#domain}.
      def item_count
        self.to_h[:item_count]
      end

      # @return [Integer] The total size of all item names in the {#domain},
      #   in bytes.
      def item_names_size_bytes
        self.to_h[:item_names_size_bytes]
      end

      # @return [Integer] The number of unique attribute names in the
      #   {#domain}.
      def attribute_name_count
        self.to_h[:attribute_name_count]
      end

      # @return [Integer] The total size of all unique attribute names,
      #   in bytes.
      def attribute_names_size_bytes
        self.to_h[:attribute_names_size_bytes]
      end

      # @return [Integer] The number of all attribute name/value pairs in
      #   the {#domain}.
      def attribute_value_count
        self.to_h[:attribute_value_count]
      end

      # @return [Integer] The total size of all attribute values, in bytes.
      def attribute_values_size_bytes
        self.to_h[:attribute_values_size_bytes]
      end

      # @return [Integer] The data and time when metadata was calculated
      #   in Epoch (UNIX) time.
      def timestamp
        self.to_h[:timestamp]
      end

      # @return [Hash] A hash of all of the metadata attributes for
      #   this {#domain}.
      def to_h
        meta = client.domain_metadata(:domain_name => domain.name)
        ATTRIBUTES.inject({}) {|h,attr| h[attr] = meta.send(attr); h }
      end

    end
  end
end
