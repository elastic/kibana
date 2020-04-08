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

    # Represents uploads in progress for a single object.
    #
    # @example Cancel all uploads for an object
    #  object.multipart_uploads.each(&:abort)
    #
    # @example Get an upload by ID
    #  object.multipart_uploads[id]
    class ObjectUploadCollection

      include Enumerable
      include Core::Model

      # @return [S3Object] The object to which the uploads belong.
      attr_reader :object

      # @api private
      def initialize(object, opts = {})
        @all_uploads =
          MultipartUploadCollection.new(object.bucket).
          with_prefix(object.key)
        @object = object
        super
      end

      # Creates a new multipart upload.  It is usually more
      # convenient to use {S3Object#multipart_upload}.
      def create(options = {})
        options[:storage_class] = :reduced_redundancy if
          options.delete(:reduced_redundancy)
        initiate_opts = {
          :bucket_name => object.bucket.name,
          :key => object.key
        }.merge(options)
        id = client.initiate_multipart_upload(initiate_opts).upload_id
        MultipartUpload.new(object, id)
      end

      # Iterates the uploads in the collection.
      #
      # @yieldparam [MultipartUpload] upload An upload in the
      #   collection.
      # @return [nil]
      def each(options = {}, &block)
        @all_uploads.each(options) do |upload|
          yield(upload) if upload.object.key == @object.key
        end
        nil
      end

      # @return [MultipartUpload] An object representing the upload
      #   with the given ID.
      #
      # @param [String] id The ID of an upload to get.
      def [] id
        MultipartUpload.new(object, id)
      end

    end

  end
end
