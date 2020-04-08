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
  module Record

    # Base class for {AWS::Record::Model::Scope} and
    # {AWS::Record::HashModel::Scope}.
    class Scope

      include Enumerable

      # @param base_class A class that extends {AWS::Record::AbstractBase}.
      # @param [Hash] options
      # @option options :
      # @api private
      def initialize base_class, options = {}

        @base_class = base_class

        @options = options.dup

        # backwards compat
        @options[:shard] = @options.delete(:domain) if @options[:domain]

      end

      # @return [Class] Returns the AWS::Record::Model extending class that
      #   this scope will find records for.
      attr_reader :base_class

      def new attributes = {}

        attributes = attributes.dup
        attributes[:shard] ||= attributes.delete(:shard)
        attributes[:shard] ||= attributes.delete('shard')
        # for backwards compatability, domain is accepted
        attributes[:shard] ||= attributes.delete('domain')
        attributes[:shard] ||= attributes.delete(:domain)
        attributes[:shard] ||= _shard

        base_class.new(attributes)

      end
      alias_method :build, :new

      # @param [String] shard_name
      # @return [Scope] Returns a scope that specifies which shard
      #   (i.e. SimpleDB domain) should be used.
      def shard shard_name
        _with(:shard => shard_name)
      end
      alias_method :domain, :shard

      # @overload find(id)
      #   Finds and returns a single record by id.  If no record is found
      #   with the given `id`, then a RecordNotFound error will be raised.
      #   @param [String] id ID of the record to find.
      #   @return Returns the record.
      #
      # @overload find(:first, options = {})
      #   Returns the first record found.  If no records were matched then
      #   nil will be returned (raises no exceptions).
      #   @param [Symbol] mode (:first)
      #   @return [Object,nil] Returns the first record or nil if no
      #     records matched the conditions.
      #
      # @overload find(:all, options = {})
      #   Returns an enumerable Scope object that represents all matching
      #   records.  No request is made to AWS until the scope is enumerated.
      #
      #       Book.find(:all, :limit => 100).each do |book|
      #         # ...
      #       end
      #
      #   @param [Symbol] mode (:all)
      #   @return [Scope] Returns an enumerable scope object.
      #
      def find id_or_mode, options = {}

        scope = _handle_options(options)

        case
        when id_or_mode == :all   then scope
        when id_or_mode == :first then scope.limit(1).to_a.first
        else
          base_class.find_by_id(id_or_mode, :shard => scope._shard)
        end

      end

      # @return [Integer] Returns the number of records that match the
      #   current scoped finder.
      def count options = {}
        if scope = _handle_options(options) and scope != self
          scope.count
        else
          _item_collection.count
        end
      end
      alias_method :size, :count

      # @return Returns the first record found, returns
      #   nil if the domain/table is empty.
      def first options = {}
        _handle_options(options).find(:first)
      end

      # Limits the maximum number of total records to return when finding
      # or counting.  Returns a scope, does not make a request.
      #
      # @example
      #
      #   books = Book.limit(100)
      #
      # @param [Integer] limit The maximum number of records to return.
      # @return [Scope] Returns a new scope that has the applied limit.
      def limit limit
        _with(:limit => limit)
      end

      # Yields once for each record matching the request made by this scope.
      #
      # @example
      #
      #   books = Book.where(:author => 'me').order(:price, :asc).limit(10)
      #
      #   books.each do |book|
      #     puts book.attributes.to_yaml
      #   end
      #
      # @yieldparam [Object] record
      def each &block
        if block_given?
          _each_object(&block)
        else
          to_enum(:"_each_object")
        end
      end

      protected
      def _shard
        @options[:shard] || base_class.shard_name
      end
      alias_method :domain, :shard

      # @api private
      private
      def _each_object &block
        raise NotImplementedError
      end

      # @api private
      private
      def _with options
        self.class.new(base_class, @options.merge(options))
      end

      # @api private
      private
      def method_missing scope_name, *args
        # @todo only proxy named scope methods
        _merge_scope(base_class.send(scope_name, *args))
      end

      # Merges the one scope with the current scope, returning a 3rd.
      # @param [Scope] scope
      # @return [Scope]
      # @api private
      private
      def _merge_scope scope
        raise NotImplementedError
      end

      # Consumes a hash of options (e.g. `:shard`, +:limit) and returns
      # a new scope with those applied.
      # @return [Scope]
      # @api private
      private
      def _handle_options options
        raise NotImplementedError
      end

      # @api private
      private
      def _item_collection
        raise NotImplementedError
      end

    end

  end
end
