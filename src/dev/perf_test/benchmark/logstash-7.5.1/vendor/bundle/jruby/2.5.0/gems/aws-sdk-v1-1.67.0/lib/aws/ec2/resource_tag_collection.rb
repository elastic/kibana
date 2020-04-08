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
  class EC2

    # Represents the EC2 tags associated with a single resource.
    #
    # @example Manipulating the tags of an EC2 instance
    #   i = ec2.instances["i-123"]
    #   i.tags.to_h                  # => { "foo" => "bar", ... }
    #   i.tags.clear
    #   i.tags.stage = "production"
    #   i.tags.stage                 # => "production"
    class ResourceTagCollection

      include Core::Model
      include Enumerable

      # @api private
      def initialize(resource, opts = {})
        @resource = resource
        super(opts)
        @tags = TagCollection.new(:config => config).
          filter("resource-id", @resource.send(:__resource_id__)).
          filter("resource-type", @resource.tagging_resource_type)
      end

      # @return [String] The value of the tag with the given key, or
      #   nil if no such tag exists.
      #
      # @param [String or Symbol] key The key of the tag to return.
      def [](key)
        if cached = cached_tags
          return cached[key.to_s]
        end
        Tag.new(@resource, key, :config => config).value
      rescue Resource::NotFound => e
        nil
      end

      # @return [Boolean] True if the resource has no tags.
      def empty?
        if cached = cached_tags
          return cached.empty?
        end
        @tags.to_a.empty?
      end

      # @param [String or Symbol] key The key of the tag to check.
      # @return [Boolean] True if the resource has a tag for the given key.
      def has_key?(key)
        if cached = cached_tags
          return cached.has_key?(key.to_s)
        end
        !@tags.filter("key", key.to_s).to_a.empty?
      end
      alias_method :key?, :has_key?
      alias_method :include?, :has_key?
      alias_method :member?, :has_key?

      # @param [String or Symbol] value The value to check.
      # @return [Boolean] True if the resource has a tag with the given value.
      def has_value?(value)
        if cached = cached_tags
          return cached.values.include?(value)
        end
        !@tags.filter("value", value.to_s).to_a.empty?
      end
      alias_method :value?, :has_value?

      # Changes the value of a tag.
      # @param [String or Symbol] key The key of the tag to set.
      # @param [String] value The new value.  If this is nil, the tag will
      #   be deleted.
      def []=(key, value)
        if value
          @tags.create(@resource, key.to_s, :value => value)
        else
          delete(key)
        end
      end
      alias_method :store, :[]=

        # Adds a tag with a blank value.
        #
        # @param [String or Symbol] key The key of the new tag.
        def add(key)
          @tags.create(@resource, key.to_s)
        end
      alias_method :<<, :add

      # Sets multiple tags in a single request.
      #
      # @param [Hash] tags The tags to set.  The keys of the hash
      #   may be strings or symbols, and the values must be strings.
      #   Note that there is no way to both set and delete tags
      #   simultaneously.
      def set(tags)
        client.create_tags(:resources => [@resource.send(:__resource_id__)],
                           :tags => tags.map do |(key, value)|
                             { :key => key.to_s,
                               :value => value }
                           end)
      end
      alias_method :update, :set

      # Allows setting and getting individual tags through instance
      # methods.  For example:
      #
      #  tags.color = "red"
      #  tags.color         # => "red"
      def method_missing(m, *args)
        if m.to_s[-1,1] == "="
          self.send(:[]=, m.to_s[0...-1], *args)
        elsif args.empty?
          self[m]
        else
          super
        end
      end

      # Deletes the tags with the given keys (which may be strings
      # or symbols).
      def delete(*keys)
        return if keys.empty?
        client.delete_tags(:resources => [@resource.send(:__resource_id__)],
                           :tags => keys.map do |key|
                             { :key => key.to_s }
                           end)
      end

      # Removes all tags from the resource.
      def clear
        client.delete_tags(:resources => [@resource.send(:__resource_id__)])
      end

      # @yield [key, value] The key/value pairs of each tag
      #   associated with the resource.  If the block has an arity
      #   of 1, the key and value will be yielded in an aray.
      def each(&blk)
        if cached = cached_tags
          cached.each(&blk)
          return
        end
        @tags.filtered_request(:describe_tags).tag_set.each do |tag|
          if blk.arity == 2
            yield(tag.key, tag.value)
          else
            yield([tag.key, tag.value])
          end
        end
        nil
      end
      alias_method :each_pair, :each

      # @return [Array] An array of the tag values associated with
      #   the given keys.  An entry for a key that has no value
      #   (i.e. there is no such tag) will be nil.
      def values_at(*keys)
        if cached = cached_tags
          return cached.values_at(*keys.map { |k| k.to_s })
        end
        keys = keys.map { |k| k.to_s }
        tag_set = @tags.
          filter("key", *keys).
          filtered_request(:describe_tags).tag_set
        hash = tag_set.inject({}) do |hash, tag|
          hash[tag.key] = tag.value
          hash
        end
        keys.map do |key|
          hash[key]
        end
      end

      # @return [Hash] The current tags as a hash, where the keys
      #   are the tag keys as strings and the values are the tag
      #   values as strings.
      def to_h
        if cached = cached_tags
          return cached
        end
        @tags.filtered_request(:describe_tags).tag_set.inject({}) do |hash, tag|
          hash[tag.key] = tag.value
          hash
        end
      end

      private
      def cached_tags
        if @resource.respond_to?(:cached_tags) and
            cached = @resource.cached_tags
          cached
        end
      end

    end

  end
end
