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
    class Model

      # The primary interface for finding records with {AWS::Record::Model}.
      #
      # ## Getting a Scope Object
      #
      # You should normally never need to construct a Scope object directly.
      # Scope objects are returned from the AWS::Record::Model finder methods
      # (e.g. `shard`, `where`, `order`, `limit`, etc).
      #
      #     books = Book.where(:author => 'John Doe')
      #     books.class #=> AWS::Record::Scope, not Array
      #
      # Scopes are also returned from methods defined with the `scope` method.
      #
      # ## Chaining Scopes
      #
      # Scope objects represent a request, but do not actualy make a request
      # until required.  This allows you to chain requests
      #
      #     # no request made by the following 2 statements
      #     books = Book.where(:author => 'John Doe')
      #     books = books.limit(10)
      #
      #     books.each do |book|
      #       # yields up to 10 books
      #     end
      #
      # Each of the following methods returns a scope that can be chained.
      #
      # * {#shard}
      # * {#where}
      # * {#order}
      # * {#limit}
      #
      # ## Terminating Scopes
      #
      # To terminate a scope you can enumerate it or call #first.
      #
      #     # terminate a scope by enumerating
      #     Book.limit(10).each {|book| ... }
      #
      #     # terminate a scope by getting the first value
      #     Book.where('author' => 'John Doe').first
      #
      class Scope < Record::Scope

        # @api private
        def initialize base_class, options = {}
          super
          @options[:where] ||= []
        end

        def new attributes = {}

          attributes = attributes.dup

          @options[:where].each do |conditions|
            if conditions.size == 1 and conditions.first.is_a?(Hash)
              attributes.merge!(conditions.first)
            end
          end

          super(attributes)

        end

        # Applies conditions to the scope that limit which records are returned.
        # Only those matching all given conditions will be returned.
        #
        # @overload where(conditions_hash)
        #   Specify a hash of conditions to query with.  Multiple conditions
        #   are joined together with AND.
        #
        #       Book.where(:author => 'John Doe', :softcover => true)
        #       # where `author` = `John Doe` AND `softcover` = `1`
        #
        #   @param [Hash] conditions
        #
        # @overload where(conditions_string, *values)
        #   A sql-like query fragment with optional placeholders and values.
        #   Placeholders are replaced with properly quoted values.
        #
        #       Book.where('author = ?', 'John Doe')
        #
        #   @param [String] conditions_string A sql-like where string with
        #     question mark placeholders.  For each placeholder there should
        #     be a value that will be quoted into that position.
        #   @param [String] *values A value that should be quoted into the
        #     corresponding (by position) placeholder.
        #
        # @return [Scope] Returns a new scope with the passed conditions applied.
        def where *conditions
          if conditions.empty?
            raise ArgumentError, 'missing required condition'
          end
          _with(:where => @options[:where] + [conditions])
        end

        # Specifies how to sort records returned.
        #
        #     # enumerate books, starting with the most recently published ones
        #     Book.order(:published_at, :desc).each do |book|
        #       # ...
        #     end
        #
        # Only one order may be applied.  If order is specified more than
        # once the last one in the chain takes precedence:
        #
        #     # books returned by this scope will be ordered by :published_at
        #     # and not :author.
        #     Book.where(:read => false).order(:author).order(:published_at)
        #
        # @param [String,Symbol] attribute_name The attribute to sort by.
        # @param [:asc, :desc] order (:asc) The direct to sort.
        def order attribute_name, order = :asc
          _with(:order => [attribute_name, order])
        end

        # @api private
        private
        def _each_object &block

          items = _item_collection

          items.select.each do |item_data|
            obj = base_class.new(:shard => _shard)
            obj.send(:hydrate, item_data.name, item_data.attributes)
            yield(obj)
          end

        end

        # Merges another scope with this scope.  Conditions are added together
        # and the limit and order parts replace those in this scope (if set).
        # @param [Scope] scope A scope to merge with this one.
        # @return [Scope] Returns a new scope with merged conditions and
        #   overriden order and limit.
        # @api private
        private
        def _merge_scope scope
          merged = self
          scope.instance_variable_get('@options').each_pair do |opt_name,opt_value|
            unless [nil, []].include?(opt_value)
              if opt_name == :where
                opt_value.each do |condition|
                  merged = merged.where(*condition)
                end
              else
                merged = merged.send(opt_name, *opt_value)
              end
            end
          end
          merged
        end

        # Consumes a hash of options (e.g. `:where`, `:order` and `:limit`) and
        # builds them onto the current scope, returning a new one.
        # @param [Hash] options
        # @option options :where
        # @option options :order
        # @option options [Integer] :limit
        # @return [Scope] Returns a new scope with the hash of scope
        #   options applied.
        # @api private
        private
        def _handle_options options
          scope = self
          options.each_pair do |method, args|
            if method == :where and args.is_a?(Hash)
              # splatting a hash turns it into an array, bad juju
              scope = scope.send(method, args)
            else
              scope = scope.send(method, *args)
            end
          end
          scope
        end

        # Converts this scope object into an AWS::SimpleDB::ItemCollection
        # @return [SimpleDB::ItemCollection]
        # @api private
        private
        def _item_collection
          items = base_class.sdb_domain(_shard).items
          items = items.order(*@options[:order]) if @options[:order]
          items = items.limit(*@options[:limit]) if @options[:limit]
          @options[:where].each do |where_condition|
            items = items.where(*where_condition)
          end
          items
        end

      end
    end
  end
end
