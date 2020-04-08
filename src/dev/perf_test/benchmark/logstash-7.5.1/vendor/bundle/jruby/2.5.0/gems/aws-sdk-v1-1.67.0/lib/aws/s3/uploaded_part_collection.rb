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

    # Represents the collection of parts that have been uploaded for
    # a given multipart upload.  You can get an instance of this
    # class by calling {MultipartUpload#parts}.
    #
    # @example Get the total size of the uploaded parts
    #  upload.parts.inject(0) { |sum, part| sum + part.size }
    class UploadedPartCollection

      include Enumerable
      include Core::Model
      include PaginatedCollection

      # @return [MultipartUpload] The upload to which the parts belong.
      attr_reader :upload

      # @api private
      def initialize(upload, opts = {})
        @upload = upload
        super
      end

      # @return [UploadedPart] An object representing the part with
      #   the given part number.
      #
      # @param [Integer] number The part number.
      def [](number)
        UploadedPart.new(upload, number)
      end

      # @api private
      protected
      def each_member_in_page(page, &block)
        page.parts.each do |part_info|
          part = UploadedPart.new(upload, part_info.part_number, :etag => part_info.etag)
          yield(part)
        end
      end

      # @api private
      protected
      def list_options(options)
        opts = super
        opts.merge!(:bucket_name => upload.object.bucket.name,
                    :key => upload.object.key,
                    :upload_id => upload.id)
        opts
      end

      # @api private
      protected
      def limit_param; :max_parts; end

      # @api private
      protected
      def list_request(options)
        client.list_parts(options)
      end

      # @api private
      protected
      def pagination_markers
        [:part_number_marker]
      end

    end

  end
end
