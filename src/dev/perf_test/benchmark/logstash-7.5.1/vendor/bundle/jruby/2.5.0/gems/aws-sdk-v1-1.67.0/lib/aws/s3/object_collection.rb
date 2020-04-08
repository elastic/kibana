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
  class S3

    # Represents a collection of S3 objects.
    #
    # ## Getting an S3Object by Key
    #
    # If you know the key of the object you want, you can reference it this way:
    #
    #     # this will not make any requests against S3
    #     object = bucket.objects['foo.jpg']
    #     object.key #=> 'foo.jpg'
    #
    # ## Finding objects with a Prefix
    #
    # Given a bucket with the following keys:
    #
    #     photos/sunset.jpg
    #     photos/sunrise.jpg
    #     photos/winter.jpg
    #     videos/comedy.mpg
    #     videos/dancing.mpg
    #
    # You can list objects that share a prefix:
    #
    #     bucket.objects.with_prefix('videos').collect(&:key)
    #     #=> ['videos/comedy.mpg', 'videos/dancing.mpg']
    #
    # ## Exploring Objects with a Tree Interface
    #
    # Given a bucket with the following keys:
    #
    #     README.txt
    #     videos/wedding.mpg
    #     videos/family_reunion.mpg
    #     photos/2010/house.jpg
    #     photos/2011/fall/leaves.jpg
    #     photos/2011/summer/vacation.jpg
    #     photos/2011/summer/family.jpg
    #
    #     tree = bucket.objects.with_prefix('photos').as_tree
    #
    #     directories = tree.children.select(&:branch?).collect(&:prefix)
    #     #=> ['photos/2010', 'photos/2011']
    #
    class ObjectCollection

      include Core::Model
      include Enumerable
      include PrefixAndDelimiterCollection

      # @param [Bucket] bucket The S3 bucket this object collection belongs to.
      # @param [Hash] options
      def initialize(bucket, options = {})
        @bucket = bucket
        super
      end

      # @return [Bucket] The bucket this collection belongs to.
      attr_reader :bucket

      # Writes a new object to S3.
      #
      # The first param is the key you want to write this object to.
      # All other params/options are documented in {S3Object#write}.
      #
      # @see S3Object#write
      #
      # @param [String] key Where in S3 to write the object.
      # @return (see S3Object#write)
      def create key, *args, &block
        self[key].write(*args, &block)
      end

      # Returns an S3Object given its name.  For example:
      #
      # @example
      #
      #   object = bucket.objects['file.txt']
      #   object.class #=> S3Object
      #
      # @param [String] key The object key.
      # @return [S3Object]
      def [] key
        S3Object.new(bucket, key.to_s)
      end

      # (see PrefixedCollection#with_prefix)
      def with_prefix prefix, mode = :replace
        super(prefix, mode)
      end

      # Deletes the objects provided in as few requests as possible.
      #
      #     # delete 2 objects (by key) in a single request
      #     bucket.objects.delete('abc', 'xyz')
      #
      # You can delete objects also by passing their S3Object representation:
      #
      #     to_delete = []
      #     to_delete << buckets.objects['foo']
      #     to_delete << buckets.objects['bar']
      #
      #     bucket.objects.delete(to_delete)
      #
      # @overload delete(objects)
      #   @param [Mixed] objects One or more objects to delete.  Each object
      #     can be one of the following:
      #
      #       * An object key (string)
      #       * A hash with :key and :version_id (for versioned objects)
      #       * An {S3Object} instance
      #       * An {ObjectVersion} instance
      #
      # @overload delete(objects, options)
      #   Deletes multiple objects, with additional options. The array can
      #   contain any of the types of objects the first method invocation style
      #   accepts.
      #   @param [Array] objects One or more objects to delete.
      #   @param [Hash] options Optional headers to pass on.
      #
      # @raise [BatchDeleteError] If any of the objects failed to delete,
      #   a BatchDeleteError will be raised with a summary of the errors.
      #
      # @return [nil]
      #
      def delete *objects

        # Detect and retrieve options from the end of the splat.
        if
          objects.size == 2 and
          objects[0].is_a?(Array) and
          objects[1].is_a?(Hash)
        then
          client_opts = objects.pop
        else
          client_opts = {}
        end

        objects = objects.flatten.collect do |obj|
          case obj
          when String        then { :key => obj }
          when Hash          then obj
          when S3Object      then { :key => obj.key }
          when ObjectVersion then { :key => obj.key, :version_id => obj.version_id }
          else
            msg = "objects must be keys (strings or hashes with :key and " +
                  ":version_id), S3Objects or ObjectVersions, got " +
                  obj.class.name
            raise ArgumentError, msg
          end
        end

        batch_helper = BatchHelper.new(1000) do |batch|
          client_opts[:bucket_name] = bucket.name
          client_opts[:quiet] = true
          client_opts[:objects] = batch
          client.delete_objects(client_opts)
        end

        error_counts = {}
        batch_helper.after_batch do |response|
          response.errors.each do |error|
            error_counts[error.code] ||= 0
            error_counts[error.code] += 1
          end
        end

        objects.each do |object|
          batch_helper.add(object)
        end

        batch_helper.complete!

        raise Errors::BatchDeleteError.new(error_counts) unless
          error_counts.empty?

        nil

      end

      # Deletes each object in the collection that returns a true value
      # from block passed to this method.  Deletes are batched for efficiency.
      #
      #     # delete text files in the 2009 "folder"
      #     bucket.objects.with_prefix('2009/').delete_if {|o| o.key =~ /\.txt$/ }
      #
      # @yieldparam [S3Object] object
      #
      # @raise [BatchDeleteError] If any of the objects failed to delete,
      #   a BatchDeleteError will be raised with a summary of the errors.
      #
      def delete_if &block

        error_counts = {}

        batch_helper = BatchHelper.new(1000) do |objects|
          begin
            delete(objects)
          rescue Errors::BatchDeleteError => error
            error.error_counts.each_pair do |code,count|
              error_counts[code] ||= 0
              error_counts[code] += count
            end
          end
        end

        each do |object|
          batch_helper.add(object) if yield(object)
        end

        batch_helper.complete!

        raise Errors::BatchDeleteError.new(error_counts) unless
          error_counts.empty?

        nil

      end

      # Deletes all objects represented by this collection.
      #
      # @example Delete all objects from a bucket
      #
      #   bucket.objects.delete_all
      #
      # @example Delete objects with a given prefix
      #
      #   bucket.objects.with_prefix('2009/').delete_all
      #
      # @raise [BatchDeleteError] If any of the objects failed to delete,
      #   a BatchDeleteError will be raised with a summary of the errors.
      #
      # @return [Array] Returns an array of results
      #
      def delete_all

        error_counts = {}

        each_batch do |objects|
          begin
            delete(objects)
          rescue Errors::BatchDeleteError => error
            error.error_counts.each_pair do |code,count|
              error_counts[code] ||= 0
              error_counts[code] += count
            end
          end
        end

        raise Errors::BatchDeleteError.new(error_counts) unless
          error_counts.empty?

        nil

      end

      # Iterates the collection, yielding instances of S3Object.
      #
      # Use break or raise an exception to terminate the enumeration.
      #
      # @param [Hash] options
      # @option options [Integer] :limit (nil) The maximum number of
      #   objects to yield.
      # @option options [Integer] :batch_size (1000) The number of objects to
      #   fetch each request to S3.  Maximum is 1000 keys at time.
      # @return [nil]
      def each options = {}, &block
        super
      end

      private

      def each_member_in_page(page, &block)
        super
        page.contents.each do |content|
          content_length = content[:size].to_i if content[:size]
          etag = content[:etag]
          last_modified = content[:last_modified]
          yield(S3Object.new(bucket, content.key, { :content_length => content_length, :etag => etag, :last_modified => last_modified}))
        end
      end

      def list_request options
        client.list_objects(options)
      end

      def limit_param
        :max_keys
      end

      def next_markers page
        if page[:next_marker]
          marker = page[:next_marker]
        elsif page[:contents].size > 0
          marker = page[:contents].last[:key]
        else
          raise 'Unable to find marker in S3 list objects response'
        end

        { :marker => marker }
      end

      # processes items in batches of 1k items
      # @api private
      class BatchHelper

        def initialize batch_size, &block
          @batch_size = batch_size
          @block = block
          @batch = []
        end

        def after_batch &block
          @after_batch = block
        end

        def add item
          @batch << item
          if @batch.size == @batch_size
            process_batch
            @batch = []
          end
          item
        end

        def complete!
          process_batch unless @batch.empty?
        end

        private

        def process_batch
          response = @block.call(@batch)
          @after_batch.call(response) if @after_batch
        end

      end

    end

  end
end
