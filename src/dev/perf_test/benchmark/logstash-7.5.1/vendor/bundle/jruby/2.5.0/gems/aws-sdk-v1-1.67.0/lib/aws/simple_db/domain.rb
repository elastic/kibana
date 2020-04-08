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

    # Represents a domain in SimpleDB.
    #
    # Domains, like database tables, must exist before you can write to one.
    #
    # @example Creating a domain
    #
    #   domain = SimpleDB.new.domains.create('mydomain')
    #
    # @example Getting a domain
    #
    #   domain = SimpleDB.new.domains['mydomain']
    #
    # @see DomainCollection
    #
    class Domain

      # @api private
      class NonEmptyDeleteError < StandardError; end

      include Core::Model

      # @param [String] name The name of a SimpleDB domain to reference.
      def initialize(name, options = {})
        super(options)
        @name = name
      end

      # Returns the name for this domain.
      #
      # @return [String] The name of this domain.
      attr_reader :name

      # Returns true if the domain has no items, false otherwise.
      #
      # @return [Boolean] Returns true if the domain has no items.
      def empty?
        metadata.item_count == 0
      end

      # Deletes the (empty) domain.
      #
      # @note If you need to delete a domain with items, call {#delete!}
      # @raise [NonEmptyDeleteError] Raises if the domain is not empty.
      # @return [nil]
      def delete
        unless empty?
          raise NonEmptyDeleteError, "delete called without :force " +
           "on a non-empty domain"
        end
        client.delete_domain(:domain_name => name)
        nil
      end

      # Deletes the domain and all of its items.
      #
      # @return [nil]
      def delete!
        client.delete_domain(:domain_name => name)
        nil
      end

      # Returns true if this domain exists, false otherwise.
      #
      # @return [Boolean] Returns true if the domain exists.
      def exists?
        begin
          client.domain_metadata(:domain_name => name)
          true
        rescue Errors::NoSuchDomain
          false
        end
      end

      # Returns a metadata object that can provide information about
      # this domain.
      #
      # @return [DomainMetadata]
      def metadata
        DomainMetadata.new(self)
      end

      # Returns a collection that represents all of the items in this domain.
      #
      # @return [ItemCollection]
      def items
        ItemCollection.new(self)
      end

      # @return [Boolean] Returns true if the domains are the same.
      def == other
        other.is_a?(Domain) and
        other.name == name and
        other.config.simple_db_endpoint == config.simple_db_endpoint
      end
      alias_method :eql?, :==

      # An irb-friendly string representation of this object.
      #
      # @return [String]
      # @api private
      def inspect
        "#<#{self.class}:#{name}>"
      end

    end
  end
end
