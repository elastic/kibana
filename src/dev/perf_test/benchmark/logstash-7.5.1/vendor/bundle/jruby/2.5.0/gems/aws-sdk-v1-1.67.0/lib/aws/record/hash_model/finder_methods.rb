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
      class << self

        # @param [String] id The id of the record to load.
        # @param [Hash] options
        # @option options [String] :shard Specifies what shard (i.e. table)
        #   should be searched.
        # @raise [RecordNotFound] Raises a record not found exception if there
        #   was no data found for the given id.
        # @return [Record::HashModel] Returns the record with the given id.
        def find_by_id id, options = {}

          table = dynamo_db_table(options[:shard])

          data = table.items[id].attributes.to_h

          raise RecordNotFound, "no data found for id: #{id}" if data.empty?

          obj = self.new(:shard => table)
          obj.send(:hydrate, id, data)
          obj

        end
        alias_method :[], :find_by_id

        # Finds records in Amazon DynamoDB and returns them as objects of
        # the current class.
        #
        # Finding `:all` returns an enumerable scope object
        #
        #     People.find(:all, :limit => 10).each do |person|
        #       puts person.name
        #     end
        #
        # Finding `:first` returns a single record (or nil)
        #
        #     boss = People.find(:first)
        #
        # Find accepts a hash of find modifiers (`:shard` and `:limit`).
        # You can also choose to omit these modifiers and
        # chain them on the scope object returned.  In the following
        # example only one request is made to SimpleDB (when #each is
        # called)
        #
        #     people = People.find(:all, :limit => 10)
        #
        #     people = people.limit(10).find(:all)
        #
        # @overload find(id)
        #   @param id The record to find, raises an exception if the record is
        #     not found.
        #
        # @overload find(mode, options = {})
        #   @param [:all,:first] mode (:all) When finding `:all` matching records
        #     and array is returned of records.  When finding `:first` then
        #     `nil` or a single record will be returned.
        #   @param [Hash] options
        #   @option options [Integer] :shard The shard name of the Amazon
        #     DynamoDB table to search.
        #   @option options [Integer] :limit The max number of records to fetch.
        def find *args
          new_scope.find(*args)
        end

        # Returns a chainable scope object that restricts further scopes to a
        # particular table.
        #
        #     Book.shard('books-2').each do |book|
        #       # ...
        #     end
        #
        # @param [String] shard_name
        # @return [Scope] Returns a scope for restricting the table searched.
        def shard shard_name
          new_scope.shard(shard_name)
        end
        alias_method :domain, :shard # backwards compat

        # Returns an enumerable scope object represents all records.
        #
        #     Book.all.each do |book|
        #       # ...
        #     end
        #
        # This method is equivalent to `find(:all)`, and therefore you can also
        # pass aditional options.
        #
        #     Book.all(:where => { :author' => 'me' }).each do |my_book|
        #       # ...
        #     end
        #
        # @return [Scope] Returns an enumerable scope object.
        #
        def all options = {}
          new_scope.find(:all, options)
        end

        # Yields once for each record.
        def each &block
          all.each(&block)
        end

        # Counts records Amazon DynamoDB.
        #
        #     class Product < AWS::Record::HashModel
        #     end
        #
        #     # returns the count of records in the 'Product' table
        #     Product.count
        #
        # You can specify the table via #shard
        #
        #     # returns the count of records in the 'products-1' table
        #     Product.shard('products-1').count
        #
        # You can also specify the shard as an option to #count.
        #
        #     Product.count(:shard => 'table-name')
        #
        # Chaining #count with #limit has no effect on the count.
        #
        #     Product.limit(10).count # same as Product.count, limit ignored
        #
        # @param [Hash] options
        #
        # @option [String] :shard Which shard to count records in.
        #
        # @return [Integer] The count of records in the table.
        #
        def count options = {}
          new_scope.count(options)
        end
        alias_method :size, :count

        # @return [Object,nil] Returns the first record found.  If there were
        #   no records found, nil is returned.
        def first options = {}
          new_scope.first(options)
        end

        # The maximum number of records to return.  By default, all records
        # matching the where conditions will be returned from a find.
        #
        #     People.limit(10).each {|person| ... }
        #
        # Limit can be chained with other scope modifiers:
        #
        #     People.where(:age => 40).limit(10).each {|person| ... }
        #
        def limit limit
          new_scope.limit(limit)
        end

      end
    end
  end
end
