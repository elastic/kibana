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

    # Manages tags for a single S3 {Bucket}.
    #
    # @example Setting a tag.
    #
    #   bucket.tags['key'] = 'value'
    #
    # @example Getting a tag.
    #
    #   bucket.tags['key']
    #   #=> 'value'
    #
    # @example Getting all tags
    #
    #   bucket.tags.to_h
    #   #=> { 'key' => 'value', ... }
    #
    # @example Removing all tags
    #
    #   bucket.tags.clear
    #
    class BucketTagCollection

      include Core::Model

      # @param [Bucket] bucket
      # @param [Hash] options
      def initialize bucket, options = {}
        @bucket = bucket
        super
      end

      # @return [Bucket]
      attr_reader :bucket

      # @param [String] key
      # @return [String,nil] Returns the tag for the given key.  If there
      #    Returns `nil` if the key does not exist.
      def [] key
        self.to_h[key]
      end

      # @param [String] key
      # @param [String] value
      def []= key, value
        self.set(self.to_h.merge(key => value))
      end

      # @param [Hash<String,String>] tags A hash of tag keys and values.
      # @return [nil]
      def set tags
        if tags.nil? or tags.empty?
          self.clear
        else
          client.put_bucket_tagging(:bucket_name => bucket.name, :tags => tags)
        end
        nil
      end

      # Removes all tags from the bucket.
      #
      # @example
      #
      #   bucket.tags.clear
      #   bucket.tags.to_h #=> {}
      #
      # @return [nil]
      def clear
        client.delete_bucket_tagging(:bucket_name => bucket.name)
        nil
      end

      # @return [Hash]
      def to_h
        client.get_bucket_tagging(:bucket_name => bucket.name).data[:tags]
      rescue AWS::S3::Errors::NoSuchTagSet
        {}
      end
      alias_method :to_hash, :to_h

      # @param [Hash] other
      # @return [Boolean] Returns `true` if the tags for this bucket match
      #   the passed hash.
      def eql? other
        self.to_h == other
      end
      alias_method :==, :eql?

      # @api private
      def inspect
        self.to_h.inspect
      end

    end
  end
end
