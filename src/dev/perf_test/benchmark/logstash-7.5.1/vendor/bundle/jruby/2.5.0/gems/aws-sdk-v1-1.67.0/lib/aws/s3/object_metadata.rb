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

    # Returns an object that represents the metadata for an S3 object.
    class ObjectMetadata

      include Core::Model

      # @param [S3Object] object
      # @param [Hash] options
      # @option options [String] :version_id A specific version of the object
      #   to get metadata for
      def initialize object, options = {}
        @object = object
        @version_id = options[:version_id]
        super
      end

      # @return [S3Object]
      attr_reader :object

      # Returns the value for the given name stored in the S3Object's
      # metadata:
      #
      #     bucket.objects['myobject'].metadata['purpose']
      #     # returns nil if the given metadata key has not been set
      #
      # @param [String,Symbol] name The name of the metadata field to
      #   get.
      #
      # @return [String,nil] Returns the metadata for the given name.
      def [] name
        to_h[name.to_s]
      end

      # Changes the value of the given name stored in the S3Object's
      # metadata:
      #
      #     object = bucket.object['myobject']
      #     object.metadata['purpose'] = 'research'
      #     object.metadata['purpose']               # => 'research'
      #
      # @deprecated In order to safely update an S3 object's metadata, you
      #   should use {S3Object#copy_from}. This operation does not preserve
      #   the ACL, storage class (standard vs. reduced redundancy) or server
      #   side encryption settings. Using this method on anything other than
      #   vanilla S3 objects risks clobbering other metadata values set on the
      #   object.
      #
      # @note The name and value of each metadata field must conform
      #   to US-ASCII.
      #
      # @param [String,Symbol] name The name of the metadata field to
      #   set.
      #
      # @param [String] value The new value of the metadata field.
      #
      # @return [String,nil] Returns the value that was set.
      def []= name, value
        raise "cannot change the metadata of an object version; "+
          "use S3Object#write to create a new version with different metadata" if
          @version_id
        metadata = to_h.dup
        metadata[name.to_s] = value
        object.copy_from(object.key,
                         :metadata => metadata)
        value
      end

      # Proxies the method to {#[]}.
      # @return (see #[])
      def method_missing name, *args, &blk
        return super if !args.empty? || blk
        self[name]
      end

      # @return [Hash] Returns the user-generated metadata stored with
      #   this S3 Object.
      def to_h
        options = {}
        options[:bucket_name] = object.bucket.name
        options[:key] = object.key
        options[:version_id] = @version_id if @version_id
        client.head_object(options).meta
      end

    end

  end
end
