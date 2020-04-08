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

require 'thread'

module AWS
  class S3

    # Represents a multipart upload to an S3 object.  See
    # {S3Object#multipart_upload} for a convenient way to initiate a
    # multipart upload.
    #
    # Note: After you initiate multipart upload and upload one or more
    # parts, you must either complete or abort multipart upload in order
    # to stop getting charged for storage of the uploaded parts. Only
    # after you either complete or abort multipart upload, Amazon S3
    # frees up the parts storage and stops charging you for the parts
    # storage.
    class MultipartUpload

      include Core::Model

      class EmptyUploadError < StandardError; end

      # @api private
      def initialize(object, id, options = {})
        @id = id
        @object = object

        super

        @completed_parts = {}
        @increment_mutex = Mutex.new
        @completed_mutex = Mutex.new
        @last_part = 0
      end

      def bucket
        object.bucket
      end

      def inspect
        "<#{self.class}:#{object.bucket.name}/#{object.key}:#{id}>"
      end
      # @return [String] Returns the upload id.
      attr_reader :id

      alias_method :upload_id, :id

      # @return [S3Object] Returns the object this upload is intended for.
      attr_reader :object

      # @return [Boolean] Returns true if both multipart uploads
      #   represent the same object and upload.
      def ==(other)
        other.kind_of?(MultipartUpload) and
          other.object == object and
          other.id == id
      end

      alias_method :eql?, :==

      # @return [Boolean] True if the upload exists.
      def exists?
        client.list_parts(base_opts)
      rescue Errors::NoSuchUpload => e
        false
      else
        true
      end

      # @return The upload initiator.  This object will have `:id`
      #   and `:display_name` methods; if the initiator is an IAM
      #   user, the `:id` method will return the ARN of the user, and
      #   if the initiator is an AWS account, this method will return
      #   the same data as {#owner}.
      def initiator
        client.list_parts(base_opts).initiator
      end

      # @return The upload owner.  This object will have `:id`
      #   and `:display_name` methods.
      def owner
        client.list_parts(base_opts).owner
      end

      # @return [Symbol] The class of storage used to store the
      #   uploaded object.  Possible values:
      #
      #   * `:standard`
      #   * `:reduced_redundancy?`
      def storage_class
        client.list_parts(base_opts).storage_class.downcase.to_sym
      end

      # @return [Boolean] True if the uploaded object will be stored
      #   with reduced redundancy.
      def reduced_redundancy?
        storage_class == :reduced_redundancy
      end

      # Aborts the upload.  After a multipart upload is aborted, no
      # additional parts can be uploaded using that upload ID. The
      # storage consumed by any previously uploaded parts will be
      # freed. However, if any part uploads are currently in
      # progress, those part uploads might or might not succeed. As
      # a result, it might be necessary to abort a given multipart
      # upload multiple times in order to completely free all
      # storage consumed by all parts.
      # @return [nil]
      def abort
        unless aborted?
          client.abort_multipart_upload(base_opts)
          @aborted = true
        end
        nil
      end
      alias_method :delete, :abort
      alias_method :cancel, :abort

      # @return [Boolean] True if the upload has been aborted.
      # @see #abort
      def aborted?
        @aborted
      end

      # Uploads a part.
      #
      # @overload add_part(data, options = {})
      #
      #   @param data The data to upload.
      #     Valid values include:
      #
      #       * A string
      #       * A Pathname object
      #       * Any object responding to `read` and `eof?`; the object
      #         must support the following access methods:
      #
      #             read                     # all at once
      #             read(length) until eof?  # in chunks
      #
      #         If you specify data this way, you must also include
      #         the `:content_length` option.
      #
      #   @param [Hash] options Additional options for the upload.
      #
      #   @option options [Integer] :content_length If provided,
      #     this option must match the total number of bytes written
      #     to S3 during the operation.  This option is required if
      #     `:data` is an IO-like object without a `size` method.
      #
      # @overload add_part(options)
      #
      #   @param [Hash] options Options for the upload.  Either
      #     `:data` or `:file` is required.
      #
      #   @option options :data The data to upload.  Valid values
      #     include:
      #
      #       * A string
      #       * A Pathname object
      #       * Any object responding to `read` and `eof?`; the object
      #         must support the following access methods:
      #
      #              read                     # all at once
      #              read(length) until eof?  # in chunks
      #
      #         If you specify data this way, you must also include
      #         the `:content_length` option.
      #
      #   @option options [String] :file Can be specified instead of
      #     `:data`; its value specifies the path of a file to
      #     upload.
      #
      #   @option options [Integer] :content_length If provided,
      #     this option must match the total number of bytes written
      #     to S3 during the operation.  This option is required if
      #     `:data` is an IO-like object without a `size` method.
      #
      #   @option options [Integer] :part_number The part number.
      def add_part(data_or_options, options = {})
        if data_or_options.kind_of?(Hash)
          part_options = base_opts.merge(data_or_options)
        else
          part_options = base_opts.merge(:data => data_or_options)
        end
        part_options.merge!(options)

        unless part_options[:part_number]
          @increment_mutex.synchronize do
            part_options[:part_number] = (@last_part += 1)
          end
        end
        part_number = part_options[:part_number]

        resp = client.upload_part(part_options)
        @completed_mutex.synchronize do
          @completed_parts[part_number] = {
            :part_number => part_number,
            :etag => resp[:etag]
          }
        end
        UploadedPart.new(self, part_number, :etag => resp[:etag])
      end

      # Copies a part.
      #
      #   @param [string] copy_source Full S3 name of source, ie bucket/key
      #
      #   @param [Hash] options Additional options for the copy.
      #
      #   @option options [Integer] :part_number The part number.
      #
      #   @option options [Integer] :copy_source_range Range of bytes to copy, ie bytes=0-45687
      def copy_part(copy_source, options = {})
        part_options = base_opts.merge(options)
        part_options.merge!(:copy_source => copy_source)

        unless part_options[:part_number]
          @increment_mutex.synchronize do
            part_options[:part_number] = (@last_part += 1)
          end
        end
        part_number = part_options[:part_number]

        resp = client.copy_part(part_options)
        @completed_mutex.synchronize do
          @completed_parts[part_number] = {
            :part_number => part_number,
            :etag => resp[:etag]
          }
        end
        UploadedPart.new(self, part_number, :etag => resp[:etag])
      end

      # Completes the upload by assembling previously uploaded
      # parts.
      #
      # @return [S3Object, ObjectVersion] If the bucket has versioning
      #   enabled, returns the {ObjectVersion} representing the
      #   version that was uploaded.  If versioning is disabled,
      #   returns the object.
      def complete(*parts)
        parts = parts.flatten
        case parts.first
        when :remote_parts
          complete_opts = get_complete_opts
        when :local_parts, nil
          complete_opts = base_opts.merge(:parts => completed_parts)
        else
          part_numbers = parts.map do |part|
            case part
            when Integer
              part
            when UploadedPart
              raise ArgumentError.new("cannot complete an upload with parts "+
                                      "from a different upload") unless
                part.upload == self

              part.part_number
            else
              raise ArgumentError.new("expected number or UploadedPart")
            end
          end
          complete_opts = get_complete_opts(part_numbers)
        end

        raise EmptyUploadError.new("Unable to complete an empty upload.") if complete_opts[:parts].empty?

        resp = client.complete_multipart_upload(complete_opts)
        if resp.data[:version_id]
          ObjectVersion.new(object, resp.data[:version_id])
        else
          object
        end
      end

      # Completes the upload or aborts it if no parts have been
      # uploaded yet.  Does nothing if the upload has already been
      # aborted.
      #
      # @return [S3Object, ObjectVersion] If the bucket has versioning
      #   enabled, returns the {ObjectVersion} representing the
      #   version that was uploaded.  If versioning is disabled,
      #   returns the object.  If no upload was attempted (e.g. if it
      #   was aborted or if no parts were uploaded), returns `nil`.
      def close
        if aborted?
          nil
        elsif completed_parts.empty?
          abort
        else
          complete
        end
      end

      # @return [UploadedPartCollection] A collection representing
      #   the parts that have been uploaded to S3 for this upload.
      def parts
        UploadedPartCollection.new(self)
      end

      # @api private
      def completed_parts
        @completed_parts.values.
          sort { |a, b| a[:part_number] <=> b[:part_number] }
      end

      # @api private
      def inspect
        "<#{self.class}:#{object.bucket.name}/#{object.key}:#{id}>"
      end

      private

      def get_complete_opts(part_numbers = nil)
        parts = []
        self.parts.each do |part|
          parts << { :part_number => part.part_number, :etag => part.etag }
        end

        if part_numbers
          parts.reject! do |part|
            !part_numbers.include?(part[:part_number])
          end
        end

        base_opts.merge(:parts => parts)
      end

      def base_opts
        opts = {
          :bucket_name => object.bucket.name,
          :key => object.key
        }
        opts[:upload_id] = upload_id if upload_id
        opts
      end

    end

  end
end
