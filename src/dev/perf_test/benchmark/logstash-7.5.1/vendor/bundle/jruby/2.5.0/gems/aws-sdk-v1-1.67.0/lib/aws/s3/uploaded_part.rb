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

    # Represents a part of a multipart upload that has been uploaded
    # to S3.
    #
    # @example Get the total size of the uploaded parts
    #  upload.parts.inject(0) { |sum, part| sum + part.size }
    class UploadedPart

      include Core::Model

      # @return [MultipartUpload] The upload to which this belongs.
      attr_reader :upload

      # @return [Integer] The part number.
      attr_reader :part_number

      # @api private
      def initialize(upload, part_number, opts = {})
        @upload = upload
        @part_number = part_number
        @etag = opts[:etag]
        super
      end

      def ==(other)
        other.kind_of?(UploadedPart) and
          other.upload == upload and
          other.part_number == part_number
      end
      alias_method :eql?, :==

      # @return [Integer] The size of the part as it currently
      #   exists in S3.
      def size
        get_attribute(:size)
      end

      # @return [DateTime] The time at which the part was last
      #   modified.
      def last_modified
        get_attribute(:last_modified)
      end

      # @return [String] The ETag of the part.
      def etag
        @etag ||= get_attribute(:etag)
        @etag
      end

      # @api private
      private
      def get_attribute(name)
        (resp = client.list_parts(:bucket_name => upload.object.bucket.name,
                                  :key => upload.object.key,
                                  :upload_id => upload.id,
                                  :part_number_marker => part_number-1,
                                  :max_parts => 1) and
         part = resp.parts.first and
         part.part_number == part_number and
         part.send(name)) or
          raise "part #{part_number} of upload #{upload.id} does not exist"
      end

    end

  end
end
