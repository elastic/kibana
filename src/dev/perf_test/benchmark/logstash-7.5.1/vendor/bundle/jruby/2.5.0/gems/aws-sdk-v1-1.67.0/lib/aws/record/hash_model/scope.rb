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
    class HashModel

      # The primary interface for finding records with {AWS::Record::HashModel}.
      #
      # ## Getting a Scope Object
      #
      # You should normally never need to construct a Scope object directly.
      # Scope objects are returned from the AWS::Record::HashModel finder
      # methods # (e.g. `shard` and `limit`).
      #
      #     books = Book.limit(100)
      #     books.class #=> AWS::Record::HashModel::Scope
      #
      # Scopes are also returned from methods defined with the `scope` method.
      #
      #     class Book < AWS::Record::HashModel
      #        scope :sampling, limit(10)
      #     end
      #
      #     Book.sampling #=> returns a scope that limits to 10
      #
      # ## Chaining Scopes
      #
      # Scope objects represent a request, but do not actualy make a request
      # until required.  This allows you to chain requests
      #
      #     # no request made by the following 2 statements
      #     books = Book.shard('books-1') # what table to search
      #     books = books.limit(10) # how many records to fetch
      #
      #     books.each do |book|
      #       # yields up to 10 books from the table 'books-1'
      #     end
      #
      # The following methods returns a scope that can be chained.
      #
      # * {#shard}
      # * {#limit}
      #
      # ## Terminating Scopes
      #
      # To terminate a scope you can enumerate it or call #first.
      #
      #     # terminate a scope by enumerating
      #     Book.limit(10).each {|book| ... }
      #
      #     # terminate a scope by getting the first record
      #     Book.shard('books-1').first
      #
      class Scope < Record::Scope

        private
        def _each_object &block

          items = _item_collection

          items.select(:limit => @options[:limit]).each do |item_data|
            obj = base_class.new(:shard => _shard)
            obj.send(:hydrate, item_data.attributes['id'], item_data.attributes)
            yield(obj)
          end

        end

        private
        def _merge_scope scope
          merged = self
          scope.instance_variable_get('@options').each_pair do |opt_name,opt_value|
            unless [nil, []].include?(opt_value)
              merged = merged.send(opt_name, *opt_value)
            end
          end
          merged
        end

        private
        def _handle_options options
          scope = self
          options.each_pair do |method, args|
            scope = scope.send(method, *args)
          end
          scope
        end

        private
        def _item_collection
          base_class.dynamo_db_table(_shard).items
        end

      end
    end
  end
end
