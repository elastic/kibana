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

    # Represents a single version of an S3Object.
    #
    # When you enable versioning on a S3 bucket, writing to an object
    # will create an object version instead of replacing the existing
    # object.
    class ObjectVersion

      include Core::Model

      # @param [S3Object] object The object this is a version of.
      # @param [String] version_id The unique id for this version.
      # @param [Hash] options
      # @option options [Boolean] :delete_marker Is this version a
      #   delete marker?
      # @option options [DateTime] :last_modified Date and time the
      #   object was last modified.
      def initialize(object, version_id, options = {})
        @object = object
        @version_id = version_id
        @delete_marker = options[:delete_marker]
        @last_modified = options[:last_modified]
        super
      end

      # @return [S3Object] the object this is a version of.
      attr_reader :object

      # @return [DateTime] timestamp of this version
      attr_reader :last_modified

      def bucket
        object.bucket
      end

      # @return [String] The unique version identifier.
      attr_reader :version_id

      # @return (see S3Object#key)
      def key
        object.key
      end

      # (see S3Object#url_for)
      def url_for method, options = {}
        object.url_for(method, options.merge(:version_id => version_id))
      end

      # @see S3Object#head
      # @return (see S3Object#head)
      def head
        object.head(:version_id => @version_id)
      end

      # @see S3Object#etag
      # @return (see S3Object#etag)
      def etag
        head.etag
      end

      # @return (see S3Object#content_length)
      def content_length
        head.content_length
      end

      # @note (see S3Object#content_type)
      # @see S3Object#content_type
      # @return (see S3Object#content_type)
      def content_type
        head.content_type
      end

      # @see S3Object#metadata
      # @return (see S3Object#metadata)
      def metadata
        object.metadata(:version_id => @version_id)
      end

      # Reads the data from this object version.
      # @see S3Object#read
      # @options (see S3Object#read)
      # @return (see S3Object#read)
      def read options = {}, &block
        object.read(options.merge(:version_id => @version_id), &block)
      end

      # Deletes this object version from S3.
      # @option options [String] :mfa The serial number and current token code of
      #   the Multi-Factor Authentication (MFA) device for the user. Format
      #   is "SERIAL TOKEN" - with a space between the serial and token.
      # @return (see S3Object#delete)
      def delete(options = {})
        object.delete(:version_id => @version_id,
                      :mfa        => options[:mfa]
                     )
      end

      # @return [Boolean] Returns this if this is the latest version of
      #   the object, false if the object has been written to since
      #   this version was created.
      def latest?
        object.versions.latest.version_id == self.version_id
      end

      # If you delete an object in a versioned bucket, a delete marker
      # is created.
      # @return [Boolean] Returns true if this version is a delete marker.
      def delete_marker?
        if @delete_marker.nil?
          begin
            # S3 responds with a 405 (method not allowed) when you try
            # to HEAD an s3 object version that is a delete marker
            metadata['foo']
            @delete_marker = false
          rescue Errors::MethodNotAllowed => error
            @delete_marker = true
          end
        end
        @delete_marker
      end

      # @return [Boolean] Returns true if the other object version has
      #   the same s3 object key and version id.
      def ==(other)
        other.kind_of?(ObjectVersion) and
          other.object == object and
          other.version_id == version_id
      end

      alias_method :eql?, :==

      # @api private
      def inspect
        "<#{self.class}:#{object.bucket.name}:#{object.key}:#{version_id}>"
      end

    end
  end
end
