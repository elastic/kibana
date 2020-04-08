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

require 'uri'
require 'base64'

module AWS
  class S3

    # Represents an object in S3.  Objects live in a bucket and have
    # unique keys.
    #
    # # Getting Objects
    #
    # You can get an object by its key.
    #
    #     s3 = AWS::S3.new
    #     obj = s3.buckets['my-bucket'].objects['key'] # no request made
    #
    # You can also get objects by enumerating a objects in a bucket.
    #
    #     bucket.objects.each do |obj|
    #       puts obj.key
    #     end
    #
    # See {ObjectCollection} for more information on finding objects.
    #
    # # Creating Objects
    #
    # You create an object by writing to it.  The following two
    # expressions are equivalent.
    #
    #     obj = bucket.objects.create('key', 'data')
    #     obj = bucket.objects['key'].write('data')
    #
    # # Writing Objects
    #
    # To upload data to S3, you simply need to call {#write} on an object.
    #
    #     obj.write('Hello World!')
    #     obj.read
    #     #=> 'Hello World!'
    #
    # ## Uploading Files
    #
    # You can upload a file to S3 in a variety of ways.  Given a path
    # to a file (as a string) you can do any of the following:
    #
    #     # specify the data as a path to a file
    #     obj.write(Pathname.new(path_to_file))
    #
    #     # also works this way
    #     obj.write(:file => path_to_file)
    #
    #     # Also accepts an open file object
    #     file = File.open(path_to_file, 'rb')
    #     obj.write(file)
    #
    # All three examples above produce the same result.  The file
    # will be streamed to S3 in chunks.  It will not be loaded
    # entirely into memory.
    #
    # ## Streaming Uploads
    #
    # When you call {#write} with an IO-like object, it will be streamed
    # to S3 in chunks.
    #
    # While it is possible to determine the size of many IO objects, you may
    # have to specify the :content_length of your IO object.
    # If the exact size can not be known, you may provide an
    # `:estimated_content_length`.  Depending on the size (actual or
    # estimated) of your data, it will be uploaded in a single request or
    # in multiple requests via {#multipart_upload}.
    #
    # You may also stream uploads to S3 using a block:
    #
    #     obj.write do |buffer, bytes|
    #       # writing fewer than the requested number of bytes to the buffer
    #       # will cause write to stop yielding to the block
    #     end
    #
    # # Reading Objects
    #
    # You can read an object directly using {#read}.  Be warned, this will
    # load the entire object into memory and is not recommended for large
    # objects.
    #
    #     obj.write('abc')
    #     puts obj.read
    #     #=> abc
    #
    # ## Streaming Downloads
    #
    # If you want to stream an object from S3, you can pass a block
    # to {#read}.
    #
    #     File.open('output', 'wb') do |file|
    #       large_object.read do |chunk|
    #         file.write(chunk)
    #       end
    #     end
    #
    # # Encryption
    #
    # Amazon S3 can encrypt objects for you service-side.  You can also
    # use client-side encryption.
    #
    # ## Server Side Encryption
    #
    # You can specify to use server side encryption when writing an object.
    #
    #     obj.write('data', :server_side_encryption => :aes256)
    #
    # You can also make this the default behavior.
    #
    #     AWS.config(:s3_server_side_encryption => :aes256)
    #
    #     s3 = AWS::S3.new
    #     s3.buckets['name'].objects['key'].write('abc') # will be encrypted
    #
    # ## Client Side Encryption
    #
    # Client side encryption utilizes envelope encryption, so that your keys are
    # never sent to S3.  You can use a symetric key or an asymmetric
    # key pair.
    #
    # ### Symmetric Key Encryption
    #
    # An AES key is used for symmetric encryption.  The key can be 128, 192,
    # and 256 bit sizes. Start by generating key or read a previously
    # generated key.
    #
    #     # generate a new random key
    #     my_key = OpenSSL::Cipher.new("AES-256-ECB").random_key
    #
    #     # read an existing key from disk
    #     my_key = File.read("my_key.der")
    #
    # Now you can encrypt locally and upload the encrypted data to S3.
    # To do this, you need to provide your key.
    #
    #     obj = bucket.objects["my-text-object"]
    #
    #     # encrypt then upload data
    #     obj.write("MY TEXT", :encryption_key => my_key)
    #
    #     # try read the object without decrypting, oops
    #     obj.read
    #     #=> '.....'
    #
    # Lastly, you can download and decrypt by providing the same key.
    #
    #     obj.read(:encryption_key => my_key)
    #     #=> "MY TEXT"
    #
    # ### Asymmetric Key Pair
    #
    # A RSA key pair is used for asymmetric encryption.  The public key is used
    # for encryption and the private key is used for decryption.  Start
    # by generating a key.
    #
    #     my_key = OpenSSL::PKey::RSA.new(1024)
    #
    # Provide your key to #write and the data will be encrypted before it
    # is uploaded. Pass the same key to #read to decrypt the data
    # when you download it.
    #
    #     obj = bucket.objects["my-text-object"]
    #
    #     # encrypt and upload the data
    #     obj.write("MY TEXT", :encryption_key => my_key)
    #
    #     # download and decrypt the data
    #     obj.read(:encryption_key => my_key)
    #     #=> "MY TEXT"
    #
    # ### Configuring storage locations
    #
    # By default, encryption materials are stored in the object metadata.
    # If you prefer, you can store the encryption materials in a separate
    # object in S3.  This object will have the same key + '.instruction'.
    #
    #     # new object, does not exist yet
    #     obj = bucket.objects["my-text-object"]
    #
    #     # no instruction file present
    #     bucket.objects['my-text-object.instruction'].exists?
    #     #=> false
    #
    #     # store the encryption materials in the instruction file
    #     # instead of obj#metadata
    #     obj.write("MY TEXT",
    #       :encryption_key => MY_KEY,
    #       :encryption_materials_location => :instruction_file)
    #
    #     bucket.objects['my-text-object.instruction'].exists?
    #     #=> true
    #
    # If you store the encryption materials in an instruction file, you
    # must tell #read this or it will fail to find your encryption materials.
    #
    #     # reading an encrypted file whos materials are stored in an
    #     # instruction file, and not metadata
    #     obj.read(:encryption_key => MY_KEY,
    #       :encryption_materials_location => :instruction_file)
    #
    # ### Configuring default behaviors
    #
    # You can configure the default key such that it will automatically
    # encrypt and decrypt for you.  You can do this globally or for a
    # single S3 interface
    #
    #     # all objects uploaded/downloaded with this s3 object will be
    #     # encrypted/decrypted
    #     s3 = AWS::S3.new(:s3_encryption_key => "MY_KEY")
    #
    #     # set the key to always encrypt/decrypt
    #     AWS.config(:s3_encryption_key => "MY_KEY")
    #
    # You can also configure the default storage location for the encryption
    # materials.
    #
    #     AWS.config(:s3_encryption_materials_location => :instruction_file)
    #
    class S3Object

      include Core::Model
      include DataOptions
      include ACLOptions
      include AWS::S3::EncryptionUtils

      # @param [Bucket] bucket The bucket this object belongs to.
      # @param [String] key The object's key.
      def initialize(bucket, key, opts = {})
        @content_length = opts.delete(:content_length)
        @etag = opts.delete(:etag)
        @last_modified = opts.delete(:last_modified)
        super
        @key = key
        @bucket = bucket
      end

      # @return [String] The objects unique key
      attr_reader :key

      # @return [Bucket] The bucket this object is in.
      attr_reader :bucket

      # @api private
      def inspect
        "<#{self.class}:#{bucket.name}/#{key}>"
      end

      # @return [Boolean] Returns true if the other object belongs to the
      #   same bucket and has the same key.
      def == other
        other.kind_of?(S3Object) and other.bucket == bucket and other.key == key
      end
      alias_method :eql?, :==

      # @return [Boolean] Returns `true` if the object exists in S3.
      def exists?
        head
      rescue Errors::NoSuchKey => e
        false
      else
        true
      end

      # Performs a HEAD request against this object and returns an object
      # with useful information about the object, including:
      #
      # * metadata (hash of user-supplied key-value pairs)
      # * content_length (integer, number of bytes)
      # * content_type (as sent to S3 when uploading the object)
      # * etag (typically the object's MD5)
      # * server_side_encryption (the algorithm used to encrypt the
      #   object on the server side, e.g. `:aes256`)
      #
      # @param [Hash] options
      # @option options [String] :version_id Which version of this object
      #   to make a HEAD request against.
      # @return A head object response with metadata,
      #   content_length, content_type, etag and server_side_encryption.
      def head options = {}
        client.head_object(options.merge(
          :bucket_name => bucket.name, :key => key))
      end

      # Returns the object's ETag.
      #
      # Generally the ETAG is the MD5 of the object.  If the object was
      # uploaded using multipart upload then this is the MD5 all of the
      # upload-part-md5s.
      #
      # @return [String] Returns the object's ETag
      def etag
        @etag = config.s3_cache_object_attributes && @etag || head[:etag]
      end

      # Returns the object's last modified time.
      #
      # @return [Time] Returns the object's last modified time.
      def last_modified
        @last_modified = config.s3_cache_object_attributes && @last_modified || head[:last_modified]
      end

      # @return [Integer] Size of the object in bytes.
      def content_length
        @content_length = config.s3_cache_object_attributes && @content_length || head[:content_length]
      end

      # @note S3 does not compute content-type.  It reports the content-type
      #   as was reported during the file upload.
      # @return [String] Returns the content type as reported by S3,
      #   defaults to an empty string when not provided during upload.
      def content_type
        head[:content_type]
      end

      # @return [DateTime,nil]
      def expiration_date
        head[:expiration_date]
      end

      # @return [String,nil]
      def expiration_rule_id
        head[:expiration_rule_id]
      end

      # @return [Symbol, nil] Returns the algorithm used to encrypt
      #   the object on the server side, or `nil` if SSE was not used
      #   when storing the object.
      def server_side_encryption
        head[:server_side_encryption]
      end

      # @return [true, false] Returns true if the object was stored
      #   using server side encryption.
      def server_side_encryption?
        !server_side_encryption.nil?
      end

      # @return [Boolean] whether a {#restore} operation on the
      #   object is currently being performed on the object.
      # @see #restore_expiration_date
      # @since 1.7.2
      def restore_in_progress?
        head[:restore_in_progress]
      end

      # @return [DateTime] the time when the temporarily restored object
      #   will be removed from S3. Note that the original object will remain
      #   available in Glacier.
      # @return [nil] if the object was not restored from an archived
      #   copy
      # @since 1.7.2
      def restore_expiration_date
        head[:restore_expiration_date]
      end

      # @return [Boolean] whether the object is a temporary copy of an
      #   archived object in the Glacier storage class.
      # @since 1.7.2
      def restored_object?
        !!head[:restore_expiration_date]
      end

      # Deletes the object from its S3 bucket.
      #
      # @param [Hash] options
      #
      # @option [String] :version_id (nil) If present the specified version
      #   of this object will be deleted.  Only works for buckets that have
      #   had versioning enabled.
      #
      # @option [Boolean] :delete_instruction_file (false) Set this to `true`
      #   if you use client-side encryption and the encryption materials
      #   were stored in a separate object in S3 (key.instruction).
      #
      # @option [String] :mfa The serial number and current token code of
      #   the Multi-Factor Authentication (MFA) device for the user. Format
      #   is "SERIAL TOKEN" - with a space between the serial and token.
      #
      # @return [nil]
      def delete options = {}
        client.delete_object(options.merge(
          :bucket_name => bucket.name,
          :key => key))

        if options[:delete_instruction_file]
          client.delete_object(
            :bucket_name => bucket.name,
            :key => key + '.instruction')
        end

        nil

      end

      # Restores a temporary copy of an archived object from the
      # Glacier storage tier. After the specified `days`, Amazon
      # S3 deletes the temporary copy. Note that the object
      # remains archived; Amazon S3 deletes only the restored copy.
      #
      # Restoring an object does not occur immediately. Use
      # {#restore_in_progress?} to check the status of the operation.
      #
      # @option [Integer] :days (1) the number of days to keep the object
      # @return [Boolean] `true` if a restore can be initiated.
      # @since 1.7.2
      def restore options = {}
        options[:days] ||= 1
        client.restore_object(options.merge({
          :bucket_name => bucket.name,
          :key => key,
        }))
        true
      end

      # @option [String] :version_id (nil) If present the metadata object
      #   will be for the specified version.
      # @return [ObjectMetadata] Returns an instance of ObjectMetadata
      #   representing the metadata for this object.
      def metadata options = {}
        options[:config] = config
        ObjectMetadata.new(self, options)
      end

      # Returns a collection representing all the object versions
      # for this object.
      #
      # @example
      #
      #   bucket.versioning_enabled? # => true
      #   version = bucket.objects["mykey"].versions.latest
      #
      # @return [ObjectVersionCollection]
      def versions
        ObjectVersionCollection.new(self)
      end

      # Uploads data to the object in S3.
      #
      #     obj = s3.buckets['bucket-name'].objects['key']
      #
      #     # strings
      #     obj.write("HELLO")
      #
      #     # files (by path)
      #     obj.write(Pathname.new('path/to/file.txt'))
      #
      #     # file objects
      #     obj.write(File.open('path/to/file.txt', 'rb'))
      #
      #     # IO objects (must respond to #read and #eof?)
      #     obj.write(io)
      #
      # ### Multipart Uploads vs Single Uploads
      #
      # This method will intelligently choose between uploading the
      # file in a signal request and using {#multipart_upload}.
      # You can control this behavior by configuring the thresholds
      # and you can disable the multipart feature as well.
      #
      #     # always send the file in a single request
      #     obj.write(file, :single_request => true)
      #
      #     # upload the file in parts if the total file size exceeds 100MB
      #     obj.write(file, :multipart_threshold => 100 * 1024 * 1024)
      #
      # @overload write(data, options = {})
      #
      #   @param [String,Pathname,File,IO] data The data to upload.
      #     This may be a:
      #     * String
      #     * Pathname
      #     * File
      #     * IO
      #     * Any object that responds to `#read` and `#eof?`.
      #
      #   @param options [Hash] Additional upload options.
      #
      #   @option options [Integer] :content_length If provided, this
      #     option must match the total number of bytes written to S3.
      #     This options is *required* when it is not possible to
      #     automatically determine the size of `data`.
      #
      #   @option options [Integer] :estimated_content_length When uploading
      #     data of unknown content length, you may specify this option to
      #     hint what mode of upload should take place.  When
      #     `:estimated_content_length` exceeds the `:multipart_threshold`,
      #     then the data will be uploaded in parts, otherwise it will
      #     be read into memory and uploaded via {Client#put_object}.
      #
      #   @option options [Boolean] :single_request (false) When `true`,
      #     this method will always upload the data in a single request
      #     (via {Client#put_object}).  When `false`, this method will
      #     choose between {Client#put_object} and {#multipart_upload}.
      #
      #   @option options [Integer] :multipart_threshold (16777216) Specifies
      #     the maximum size (in bytes) of a single-request upload.  If the
      #     data exceeds this threshold, it will be uploaded via
      #     {#multipart_upload}.  The default threshold is 16MB and can
      #     be configured via AWS.config(:s3_multipart_threshold => ...).
      #
      #   @option options [Integer] :multipart_min_part_size (5242880) The
      #     minimum size of a part to upload to S3 when using
      #     {#multipart_upload}.  S3 will reject parts smaller than 5MB
      #     (except the final part).  The default is 5MB and can be
      #     configured via AWS.config(:s3_multipart_min_part_size => ...).
      #
      #   @option options [Hash] :metadata A hash of metadata to be
      #     included with the object.  These will be sent to S3 as
      #     headers prefixed with `x-amz-meta`.  Each name, value pair
      #     must conform to US-ASCII.
      #
      #   @option options [Symbol,String] :acl (:private) A canned access
      #     control policy.  Valid values are:
      #
      #     * `:private`
      #     * `:public_read`
      #     * `:public_read_write`
      #     * `:authenticated_read`
      #     * `:bucket_owner_read`
      #     * `:bucket_owner_full_control`
      #
      #   @option options [String] :grant_read
      #
      #   @option options [String] :grant_write
      #
      #   @option options [String] :grant_read_acp
      #
      #   @option options [String] :grant_write_acp
      #
      #   @option options [String] :grant_full_control
      #
      #   @option options [Boolean] :reduced_redundancy (false) When `true`,
      #     this object will be stored with Reduced Redundancy Storage.
      #
      #   @option options :cache_control [String] Can be used to specify
      #     caching behavior.  See
      #     http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.9
      #
      #   @option options :content_disposition [String] Specifies
      #     presentational information for the object.  See
      #     http://www.w3.org/Protocols/rfc2616/rfc2616-sec19.html#sec19.5.1
      #
      #   @option options :content_encoding [String] Specifies what
      #     content encodings have been applied to the object and thus
      #     what decoding mechanisms must be applied to obtain the
      #     media-type referenced by the `Content-Type` header field.
      #     See
      #     http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.11
      #
      #   @option options [String] :content_md5
      #     The base64 encoded content md5 of the data.
      #
      #   @option options :content_type A standard MIME type
      #     describing the format of the object data.
      #
      #   @option options [Symbol] :server_side_encryption (nil) If this
      #     option is set, the object will be stored using server side
      #     encryption.  The only valid value is `:aes256`, which
      #     specifies that the object should be stored using the AES
      #     encryption algorithm with 256 bit keys.  By default, this
      #     option uses the value of the `:s3_server_side_encryption`
      #     option in the current configuration; for more information,
      #     see {AWS.config}.
      #
      #   @option options [OpenSSL::PKey::RSA, String] :encryption_key
      #     Set this to encrypt the data client-side using envelope
      #     encryption.  The key must be an OpenSSL asymmetric key
      #     or a symmetric key string (16, 24 or 32 bytes in length).
      #
      #   @option options [Symbol] :encryption_materials_location (:metadata)
      #     Set this to `:instruction_file` if you prefer to store the
      #     client-side encryption materials in a separate object in S3
      #     instead of in the object metadata.
      #
      #   @option options [String] :expires The date and time at which the
      #     object is no longer cacheable.
      #
      #   @option options [String] :website_redirect_location
      #
      # @return [S3Object, ObjectVersion] If the bucket has versioning
      #   enabled, this methods returns an {ObjectVersion}, otherwise
      #   this method returns `self`.
      #
      def write *args, &block

        options = compute_write_options(*args, &block)

        add_storage_class_option(options)
        add_sse_options(options)
        add_cse_options(options)

        if use_multipart?(options)
          write_with_multipart(options)
        else
          write_with_put_object(options)
        end

      end

      # Performs a multipart upload.  Use this if you have specific
      # needs for how the upload is split into parts, or if you want
      # to have more control over how the failure of an individual
      # part upload is handled.  Otherwise, {#write} is much simpler
      # to use.
      #
      # Note: After you initiate multipart upload and upload one or
      # more parts, you must either complete or abort multipart
      # upload in order to stop getting charged for storage of the
      # uploaded parts. Only after you either complete or abort
      # multipart upload, Amazon S3 frees up the parts storage and
      # stops charging you for the parts storage.
      #
      # @example Uploading an object in two parts
      #
      #   bucket.objects.myobject.multipart_upload do |upload|
      #     upload.add_part("a" * 5242880)
      #     upload.add_part("b" * 2097152)
      #   end
      #
      # @example Uploading parts out of order
      #
      #   bucket.objects.myobject.multipart_upload do |upload|
      #     upload.add_part("b" * 2097152, :part_number => 2)
      #     upload.add_part("a" * 5242880, :part_number => 1)
      #   end
      #
      # @example Aborting an upload after parts have been added
      #
      #   bucket.objects.myobject.multipart_upload do |upload|
      #     upload.add_part("b" * 2097152, :part_number => 2)
      #     upload.abort
      #   end
      #
      # @example Starting an upload and completing it later by ID
      #
      #   upload = bucket.objects.myobject.multipart_upload
      #   upload.add_part("a" * 5242880)
      #   upload.add_part("b" * 2097152)
      #   id = upload.id
      #
      #   # later or in a different process
      #   upload = bucket.objects.myobject.multipart_uploads[id]
      #   upload.complete(:remote_parts)
      #
      # @yieldparam [MultipartUpload] upload A handle to the upload.
      #   {MultipartUpload#close} is called in an `ensure` clause so
      #   that the upload will always be either completed or
      #   aborted.
      #
      # @param [Hash] options Options for the upload.
      #
      # @option options [Hash] :metadata A hash of metadata to be
      #   included with the object.  These will be sent to S3 as
      #   headers prefixed with `x-amz-meta`.  Each name, value pair
      #   must conform to US-ASCII.
      #
      # @option options [Symbol] :acl (private) A canned access
      #   control policy.  Valid values are:
      #
      #   * `:private`
      #   * `:public_read`
      #   * `:public_read_write`
      #   * `:authenticated_read`
      #   * `:bucket_owner_read`
      #   * `:bucket_owner_full_control`
      #
      # @option options [Boolean] :reduced_redundancy (false) If true,
      #   Reduced Redundancy Storage will be enabled for the uploaded
      #   object.
      #
      # @option options :cache_control [String] Can be used to specify
      #   caching behavior.  See
      #   http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.9
      #
      # @option options :content_disposition [String] Specifies
      #   presentational information for the object.  See
      #   http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec19.5.1
      #
      # @option options :content_encoding [String] Specifies what
      #   content encodings have been applied to the object and thus
      #   what decoding mechanisms must be applied to obtain the
      #   media-type referenced by the `Content-Type` header field.
      #   See
      #   http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.11
      #
      # @option options :content_type A standard MIME type
      #   describing the format of the object data.
      #
      # @option options [Symbol] :server_side_encryption (nil) If this
      #   option is set, the object will be stored using server side
      #   encryption.  The only valid value is `:aes256`, which
      #   specifies that the object should be stored using the AES
      #   encryption algorithm with 256 bit keys.  By default, this
      #   option uses the value of the `:s3_server_side_encryption`
      #   option in the current configuration; for more information,
      #   see {AWS.config}.
      #
      # @return [S3Object, ObjectVersion] If the bucket has versioning
      #   enabled, returns the {ObjectVersion} representing the
      #   version that was uploaded.  If versioning is disabled,
      #   returns self.
      #
      def multipart_upload(options = {})

        options = options.dup
        add_sse_options(options)

        upload = multipart_uploads.create(options)

        if block_given?
          begin
            yield(upload)
            upload.close
          rescue => e
            upload.abort
            raise e
          end
        else
          upload
        end
      end

      # @example Abort any in-progress uploads for the object:
      #
      #  object.multipart_uploads.each(&:abort)
      #
      # @return [ObjectUploadCollection] Returns an object representing the
      #   collection of uploads that are in progress for this object.
      def multipart_uploads
        ObjectUploadCollection.new(self)
      end

      # Moves an object to a new key.
      #
      # This works by copying the object to a new key and then
      # deleting the old object.  This function returns the
      # new object once this is done.
      #
      #     bucket = s3.buckets['old-bucket']
      #     old_obj = bucket.objects['old-key']
      #
      #     # renaming an object returns a new object
      #     new_obj = old_obj.move_to('new-key')
      #
      #     old_obj.key     #=> 'old-key'
      #     old_obj.exists? #=> false
      #
      #     new_obj.key     #=> 'new-key'
      #     new_obj.exists? #=> true
      #
      # If you need to move an object to a different bucket, pass
      # `:bucket` or `:bucket_name`.
      #
      #     obj = s3.buckets['old-bucket'].objects['old-key']
      #     obj.move_to('new-key', :bucket_name => 'new_bucket')
      #
      # If the copy succeeds, but the then the delete fails, an error
      # will be raised.
      #
      # @param [String] target The key to move this object to.
      #
      # @param [Hash] options
      #
      # @option (see #copy_to)
      #
      # @return [S3Object] Returns a new object with the new key.
      #
      def move_to target, options = {}
        copy = copy_to(target, options)
        delete
        copy
      end
      alias_method :rename_to, :move_to

      # Copies data from one S3 object to another.
      #
      # S3 handles the copy so the clients does not need to fetch the data
      # and upload it again.  You can also change the storage class and
      # metadata of the object when copying.
      #
      # @note This operation does not copy the ACL, storage class
      #   (standard vs. reduced redundancy) or server side encryption
      #   setting from the source object.  If you don't specify any of
      #   these options when copying, the object will have the default
      #   values as described below.
      #
      # @param [Mixed] source
      #
      # @param [Hash] options
      #
      # @option options [String] :bucket_name The slash-prefixed name of
      #   the bucket the source object can be found in.  Defaults to the
      #   current object's bucket.
      #
      # @option options [Bucket] :bucket The bucket the source object
      #   can be found in.  Defaults to the current object's bucket.
      #
      # @option options [Hash] :metadata A hash of metadata to save
      #   with the copied object.  Each name, value pair must conform
      #   to US-ASCII.  When blank, the sources metadata is copied.
      #   If you set this value, you must set ALL metadata values for
      #   the object as we do not preserve existing values.
      #
      # @option options [String] :content_type The content type of
      #   the copied object.  Defaults to the source object's content
      #   type.
      #
      # @option options [String] :content_disposition The presentational
      #   information for the object. Defaults to the source object's
      #   content disposition.
      #
      # @option options [Boolean] :reduced_redundancy (false) If true the
      #   object is stored with reduced redundancy in S3 for a lower cost.
      #
      # @option options [String] :version_id (nil) Causes the copy to
      #   read a specific version of the source object.
      #
      # @option options [Symbol] :acl (private) A canned access
      #   control policy.  Valid values are:
      #
      #   * `:private`
      #   * `:public_read`
      #   * `:public_read_write`
      #   * `:authenticated_read`
      #   * `:bucket_owner_read`
      #   * `:bucket_owner_full_control`
      #
      # @option options [Symbol] :server_side_encryption (nil) If this
      #   option is set, the object will be stored using server side
      #   encryption.  The only valid value is `:aes256`, which
      #   specifies that the object should be stored using the AES
      #   encryption algorithm with 256 bit keys.  By default, this
      #   option uses the value of the `:s3_server_side_encryption`
      #   option in the current configuration; for more information,
      #   see {AWS.config}.
      #
      # @option options [Boolean] :client_side_encrypted (false) Set to true
      #   when the object being copied was client-side encrypted.  This
      #   is important so the encryption metadata will be copied.
      #
      # @option options [Boolean] :use_multipart_copy (false) Set this to
      #   `true` if you need to copy an object that is larger than 5GB.
      #
      # @option options :cache_control [String] Can be used to specify
      #   caching behavior.  See
      #   http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.9
      #
      # @option options [String] :expires The date and time at which the
      #   object is no longer cacheable.
      #
      # @return [nil]
      def copy_from source, options = {}

        options = options.dup

        options[:copy_source] =
          case source
          when S3Object
            "/#{source.bucket.name}/#{source.key}"
          when ObjectVersion
            options[:version_id] = source.version_id
            "/#{source.object.bucket.name}/#{source.object.key}"
          else
            if options[:bucket]
              "/#{options.delete(:bucket).name}/#{source}"
            elsif options[:bucket_name]
              # oops, this should be slash-prefixed, but unable to change
              # this without breaking users that already work-around this
              # bug by sending :bucket_name => "/bucket-name"
              "#{options.delete(:bucket_name)}/#{source}"
            else
              "/#{self.bucket.name}/#{source}"
            end
          end

        if [:metadata, :content_disposition, :content_type, :cache_control,
          ].any? {|opt| options.key?(opt) }
        then
          options[:metadata_directive] = 'REPLACE'
        else
          options[:metadata_directive] ||= 'COPY'
        end

        # copies client-side encryption materials (from the metadata or
        # instruction file)
        if options.delete(:client_side_encrypted)
          copy_cse_materials(source, options)
        end

        add_sse_options(options)

        options[:storage_class] = options.delete(:reduced_redundancy) ?
          'REDUCED_REDUNDANCY' : 'STANDARD'

        options[:bucket_name] = bucket.name
        options[:key] = key

        if use_multipart_copy?(options)
          multipart_copy(options)
        else
          resp = client.copy_object(options)
        end

        nil

      end

      # Copies data from the current object to another object in S3.
      #
      # S3 handles the copy so the client does not need to fetch the data
      # and upload it again.  You can also change the storage class and
      # metadata of the object when copying.
      #
      # @note This operation does not copy the ACL, storage class
      #   (standard vs. reduced redundancy) or server side encryption
      #   setting from this object to the new object.  If you don't
      #   specify any of these options when copying, the new object
      #   will have the default values as described below.
      #
      # @param [S3Object,String] target An S3Object, or a string key of
      #   and object to copy to.
      #
      # @param [Hash] options
      #
      # @option options [String] :bucket_name The slash-prefixed name of the
      #   bucket the object should be copied into.  Defaults to the current
      #   object's bucket.
      #
      # @option options [Bucket] :bucket The bucket the target object
      #   should be copied into. Defaults to the current object's bucket.
      #
      # @option options [Hash] :metadata A hash of metadata to save
      #   with the copied object.  Each name, value pair must conform
      #   to US-ASCII.  When blank, the sources metadata is copied.
      #
      # @option options [Boolean] :reduced_redundancy (false) If true
      #   the object is stored with reduced redundancy in S3 for a
      #   lower cost.
      #
      # @option options [Symbol] :acl (private) A canned access
      #   control policy.  Valid values are:
      #
      #   * `:private`
      #   * `:public_read`
      #   * `:public_read_write`
      #   * `:authenticated_read`
      #   * `:bucket_owner_read`
      #   * `:bucket_owner_full_control`
      #
      # @option options [Symbol] :server_side_encryption (nil) If this
      #   option is set, the object will be stored using server side
      #   encryption.  The only valid value is `:aes256`, which
      #   specifies that the object should be stored using the AES
      #   encryption algorithm with 256 bit keys.  By default, this
      #   option uses the value of the `:s3_server_side_encryption`
      #   option in the current configuration; for more information,
      #   see {AWS.config}.
      #
      # @option options [Boolean] :client_side_encrypted (false) When `true`,
      #   the client-side encryption materials will be copied. Without this
      #   option, the key and iv are not guaranteed to be transferred to
      #   the new object.
      #
      # @option options [String] :expires The date and time at which the
      #   object is no longer cacheable.
      #
      # @return [S3Object] Returns the copy (target) object.
      #
      def copy_to target, options = {}

        unless target.is_a?(S3Object)

          bucket = case
          when options[:bucket] then options[:bucket]
          when options[:bucket_name]
            Bucket.new(options[:bucket_name], :config => config)
          else self.bucket
          end

          target = S3Object.new(bucket, target)
        end

        copy_opts = options.dup
        copy_opts.delete(:bucket)
        copy_opts.delete(:bucket_name)

        target.copy_from(self, copy_opts)
        target

      end

      # Fetches the object data from S3.  If you pass a block to this
      # method, the data will be yielded to the block in chunks as it
      # is read off the HTTP response.
      #
      # ### Read an object from S3 in chunks
      #
      # When downloading large objects it is recommended to pass a block
      # to #read.  Data will be yielded to the block as it is read off
      # the HTTP response.
      #
      #     # read an object from S3 to a file
      #     File.open('output.txt', 'wb') do |file|
      #       bucket.objects['key'].read do |chunk|
      #         file.write(chunk)
      #       end
      #     end
      #
      # ### Reading an object without a block
      #
      # When you omit the block argument to #read, then the entire
      # HTTP response and read and the object data is loaded into
      # memory.
      #
      #     bucket.objects['key'].read
      #     #=> 'object-contents-here'
      #
      # @param [Hash] options
      #
      # @option options [String] :version_id Reads data from a
      #   specific version of this object.
      #
      # @option options [Time] :if_unmodified_since If specified, the
      #   method will raise
      #   `AWS::S3::Errors::PreconditionFailed` unless the
      #   object has not been modified since the given time.
      #
      # @option options [Time] :if_modified_since If specified, the
      #   method will raise `AWS::S3::Errors::NotModified` if
      #   the object has not been modified since the given time.
      #
      # @option options [String] :if_match If specified, the method
      #   will raise `AWS::S3::Errors::PreconditionFailed`
      #   unless the object ETag matches the provided value.
      #
      # @option options [String] :if_none_match If specified, the
      #   method will raise `AWS::S3::Errors::NotModified` if
      #   the object ETag matches the provided value.
      #
      # @option options [Range] :range A byte range to read data from
      #
      # @option options [OpenSSL::PKey::RSA, String] :encryption_key
      #   (nil) If this option is set, the object will be decrypted using
      #   envelope encryption. The valid values are OpenSSL asymmetric keys
      #   `OpenSSL::Pkey::RSA` or strings representing symmetric keys
      #   of an AES-128/192/256-ECB cipher as a `String`.
      #   This value defaults to the value in `s3_encryption_key`;
      #   for more information, see {AWS.config}.
      #
      #   Symmetric Keys:
      #
      #   cipher = OpenSSL::Cipher.new('AES-256-ECB')
      #   key = cipher.random_key
      #
      #   Asymmetric keys can also be generated as so:
      #   key = OpenSSL::PKey::RSA.new(KEY_SIZE)
      #
      # @option options [Symbol] :encryption_materials_location (:metadata)
      #   Set this to `:instruction_file` if the encryption materials
      #   are not stored in the object metadata
      #
      # @note `:range` option cannot be used with client-side encryption
      #
      # @note All decryption reads incur at least an extra HEAD operation.
      #
      def read options = {}, &read_block

        options[:bucket_name] = bucket.name
        options[:key] = key

        if should_decrypt?(options)
          get_encrypted_object(options, &read_block)
        else
          resp_data = get_object(options, &read_block)
          block_given? ? resp_data : resp_data[:data]
        end

      end

      # @api private
      module ACLProxy

        attr_accessor :object

        def change
          yield(self)
          object.acl = self
        end

      end

      # Returns the object's access control list.  This will be an
      # instance of AccessControlList, plus an additional `change`
      # method:
      #
      #     object.acl.change do |acl|
      #       # remove any grants to someone other than the bucket owner
      #       owner_id = object.bucket.owner.id
      #       acl.grants.reject! do |g|
      #         g.grantee.canonical_user_id != owner_id
      #       end
      #     end
      #
      # Note that changing the ACL is not an atomic operation; it
      # fetches the current ACL, yields it to the block, and then
      # sets it again.  Therefore, it's possible that you may
      # overwrite a concurrent update to the ACL using this
      # method.
      #
      # @return [AccessControlList]
      #
      def acl

        resp = client.get_object_acl(:bucket_name => bucket.name, :key => key)

        acl = AccessControlList.new(resp.data)
        acl.extend ACLProxy
        acl.object = self
        acl

      end

      # Sets the objects's ACL (access control list).  You can provide an ACL
      # in a number of different formats.
      # @param (see ACLOptions#acl_options)
      # @return [nil]
      def acl=(acl)

        client_opts = {}
        client_opts[:bucket_name] = bucket.name
        client_opts[:key] = key

        client.put_object_acl(acl_options(acl).merge(client_opts))
        nil

      end

      # @api private
      REQUEST_PARAMETERS = Core::Signers::S3::QUERY_PARAMS.map do |p|
        p.tr("-","_").to_sym
      end

      # Generates a presigned URL for an operation on this object.
      # This URL can be used by a regular HTTP client to perform the
      # desired operation without credentials and without changing
      # the permissions of the object.
      #
      # @example Generate a url to read an object
      #
      #   bucket.objects.myobject.url_for(:read)
      #
      # @example Generate a url to delete an object
      #
      #   bucket.objects.myobject.url_for(:delete)
      #
      # @example Override response headers for reading an object
      #
      #   object = bucket.objects.myobject
      #   url = object.url_for(:read,
      #                        :response_content_type => "application/json")
      #
      # @example Generate a url that expires in 10 minutes
      #
      #   bucket.objects.myobject.url_for(:read, :expires => 10*60)
      #
      # @param [Symbol, String] method The HTTP verb or object
      #   method for which the returned URL will be valid.  Valid
      #   values:
      #
      #   * `:get` or `:read`
      #   * `:put` or `:write`
      #   * `:delete`
      #   * `:head`
      #
      # @param [Hash] options Additional options for generating the URL.
      #
      # @option options :expires Sets the expiration time of the
      #   URL; after this time S3 will return an error if the URL is
      #   used.  This can be an integer (to specify the number of
      #   seconds after the current time), a string (which is parsed
      #   as a date using Time#parse), a Time, or a DateTime object.
      #   This option defaults to one hour after the current time.
      #
      # @option options [Boolean] :secure (true) Whether to generate a
      #   secure (HTTPS) URL or a plain HTTP url.
      #
      # @option options [String] :content_type Object content type for
      #   HTTP PUT. When provided, has to be also added to the request
      #   header as a 'content-type' field
      #
      # @option options [String] :content_md5 Object MD5 hash for HTTP PUT.
      #   When provided, has to be also added to the request header as a
      #   'content-md5' field
      #
      # @option options [String] :endpoint Sets the hostname of the
      #   endpoint.
      #
      # @option options [Integer] :port Sets the port of the
      #   endpoint (overrides config.s3_port).
      #
      # @option options [Boolean] :force_path_style (false) Indicates
      #   whether the generated URL should place the bucket name in
      #   the path (true) or as a subdomain (false).
      #
      # @option options [String] :response_content_type Sets the
      #   Content-Type header of the response when performing an
      #   HTTP GET on the returned URL.
      #
      # @option options [String] :response_content_language Sets the
      #   Content-Language header of the response when performing an
      #   HTTP GET on the returned URL.
      #
      # @option options [String] :response_expires Sets the Expires
      #   header of the response when performing an HTTP GET on the
      #   returned URL.
      #
      # @option options [String] :response_cache_control Sets the
      #   Cache-Control header of the response when performing an
      #   HTTP GET on the returned URL.
      #
      # @option options [String] :response_content_disposition Sets
      #   the Content-Disposition header of the response when
      #   performing an HTTP GET on the returned URL.
      #
      # @option options [String] :acl The value to use for the
      #   x-amz-acl.
      #
      # @option options [String] :response_content_encoding Sets the
      #   Content-Encoding header of the response when performing an
      #   HTTP GET on the returned URL.
      #
      # @option options [:v3, :v4] :signature_version (:v3)
      #
      # @return [URI::HTTP, URI::HTTPS]
      def url_for(method, options = {})

        options = options.dup
        options[:expires] = expiration_timestamp(options[:expires])
        options[:secure] = config.use_ssl? unless options.key?(:secure)
        options[:signature_version] ||= config.s3_signature_version

        case options[:signature_version]
        when :v3 then presign_v3(method, options)
        when :v4 then presign_v4(method, options)
        else
          msg = "invalid signature version, expected :v3 or :v4, got "
          msg << options[:signature_version].inspect
          raise ArgumentError, msg
        end
      end

      # Generates a public (not authenticated) URL for the object.
      #
      # @param [Hash] options Options for generating the URL.
      #
      # @option options [Boolean] :secure Whether to generate a
      #   secure (HTTPS) URL or a plain HTTP url.
      #
      # @return [URI::HTTP, URI::HTTPS]
      #
      def public_url(options = {})
        options[:secure] = config.use_ssl? unless options.key?(:secure)
        build_uri(request_for_signing(options), options)
      end

      # Generates fields for a presigned POST to this object.  This
      # method adds a constraint that the key must match the key of
      # this object.  All options are sent to the PresignedPost
      # constructor.
      #
      # @see PresignedPost
      # @return [PresignedPost]
      def presigned_post(options = {})
        PresignedPost.new(bucket, options.merge(:key => key))
      end

      # @note Changing the storage class of an object incurs a COPY
      #   operation.
      #
      # Changes the storage class of the object to enable or disable
      # Reduced Redundancy Storage (RRS).
      #
      # @param [true,false] value If this is true, the object will be
      #   copied in place and stored with reduced redundancy at a
      #   lower cost.  Otherwise, the object will be copied and stored
      #   with the standard storage class.
      #
      # @return [true,false] The `value` parameter.
      def reduced_redundancy= value
        copy_from(key, :reduced_redundancy => value)
        value
      end

      private

      def presign_v4(method, options)
        PresignV4.new(self).presign(method, options)
      end

      def presign_v3(method, options)
        options[:acl] = options[:acl].to_s.sub('_', '-') if options[:acl]

        req = request_for_signing(options)
        req.http_method = http_method(method)
        req.add_param("AWSAccessKeyId", config.credential_provider.access_key_id)
        req.add_param("versionId", options[:version_id]) if options[:version_id]
        req.add_param("Signature", signature(req, options))
        req.add_param("Expires", options[:expires])
        req.add_param("x-amz-acl", options[:acl]) if options[:acl]
        if config.credential_provider.session_token
          req.add_param(
            "x-amz-security-token",
            config.credential_provider.session_token
          )
        end

        build_uri(req, options)
      end

      # Used to determine if the data needs to be copied in parts
      def use_multipart_copy? options
        options[:use_multipart_copy]
      end

      def multipart_copy options

        unless options[:content_length]
          msg = "unknown content length, must set :content_length " +
              "to use multi-part copy"
          raise ArgumentError, msg
        end

        part_size = compute_part_size(options)
        clean_up_options(options)
        source_length = options.delete(:content_length)

        multipart_upload(options) do |upload|
          pos = 0
          # We copy in part_size chunks until we read the
          until pos >= source_length
            last_byte = (pos + part_size >= source_length) ? source_length - 1 : pos + part_size - 1
            upload.copy_part(options[:copy_source], options.merge({:copy_source_range => "bytes=#{pos}-#{last_byte}"}))
            pos += part_size
          end
        end
      end

      # @return [Boolean]
      def should_decrypt? options
        options[:encryption_key] or config.s3_encryption_key
      end

      # A small wrapper around client#get_object
      def get_object options, &read_block
        client.get_object(options, &read_block).data
      end

      # A wrapper around get_object that decrypts
      def get_encrypted_object options, &read_block
        decryption_cipher(options) do |cipher|
          if block_given?
            resp = get_object(options) do |chunk|
              yield(cipher.update(chunk))
            end
            yield(cipher.final)
            resp
          else
            cipher.update(get_object(options)[:data]) + cipher.final
          end
        end
      end

      # @return [Boolean] Returns `true` if the :data option is large or
      #   guessed to be larger than a configured threshold.
      def use_multipart? options
        estimated_content_length(options) > multipart_threshold(options) and
        !options[:single_request]
      end

      # @return [Integer] Returns the number of bytes where a multipart
      #   upload is used instead of #put_object.
      def multipart_threshold options
        threshold = options[:multipart_threshold] ||
          config.s3_multipart_threshold
      end

      # @return [Integer] Returns the size of each multipart chunk.
      def compute_part_size options

        max_parts = options[:multipart_max_parts] ||
          config.s3_multipart_max_parts

        min_size = options[:multipart_min_part_size] ||
          config.s3_multipart_min_part_size

        estimated_size = estimated_content_length(options)

        part_size = [(estimated_size.to_f / max_parts).ceil, min_size].max.to_i
        part_size += 16 - (part_size % 16)
        part_size

      end

      # @return [Integer] Returns the size of the data or an estimated
      #   size as provided by the user (useful for IO streams).
      def estimated_content_length options
        estimate = options[:content_length] ||
          options[:estimated_content_length]
        unless estimate
          msg = "unknown content length, must set :content_length or " +
              ":estimated_content_length"
          raise ArgumentError, msg
        end
        estimate
      end

      def build_uri(request, options)
        uri_class = options[:secure] ? URI::HTTPS : URI::HTTP
        uri_class.build(:host => request.host,
                        :port => request.port,
                        :path => request.path,
                        :query => request.querystring)
      end

      def signature request, options
        parts = []
        parts << request.http_method
        parts << options[:content_md5].to_s
        parts << options[:content_type].to_s
        parts << options[:expires]
        parts << "x-amz-acl:#{options[:acl]}" if options[:acl]
        if token = config.credential_provider.session_token
          parts << "x-amz-security-token:#{token}"
        end
        parts << Core::Signers::S3.canonicalized_resource(request)

        string_to_sign = parts.join("\n")

        secret = config.credential_provider.secret_access_key
        Core::Signers::Base.sign(secret, string_to_sign, 'sha1')
      end

      def expiration_timestamp(input)
        input = input.to_int if input.respond_to?(:to_int)
        case input
        when Time then input.to_i
        when DateTime then Time.parse(input.to_s).to_i
        when Integer then (Time.now + input).to_i
        when String then Time.parse(input).to_i
        else (Time.now + 60*60).to_i
        end
      end

      def http_method(input)
        symbol = case input
                 when :read then :get
                 when :write then :put
                 else
                   input
                 end
        symbol.to_s.upcase
      end

      def request_for_signing(options)

        port = [443, 80].include?(config.s3_port) ?
          (options[:secure] ? 443 : 80) :
          config.s3_port

        req = Request.new

        req.key = key
        req.host = options.fetch(:endpoint, config.s3_endpoint)

        if req.host.nil? && options.include?(:endpoint) && options[:endpoint].nil?
          req.host = bucket.name
        else
          req.bucket = bucket.name
        end

        req.port = options.fetch(:port, port)
        req.force_path_style = options.fetch(:force_path_style, config.s3_force_path_style)

        REQUEST_PARAMETERS.each do |param|
          req.add_param(param.to_s.tr("_","-"),
                        options[param]) if options.key?(param)
        end

        req
      end

      def add_sse_options(options)
        unless options.key?(:server_side_encryption)
          options[:server_side_encryption] = config.s3_server_side_encryption
        end
        options.delete(:server_side_encryption) if
          options[:server_side_encryption].nil?
      end

      # Adds client-side encryption metadata headers and encrypts key
      def add_cse_options(options)
        encryption_key_for(options) do |encryption_key|

          check_encryption_materials(:encrypt, encryption_key)
          cipher = get_aes_cipher(:encrypt, :CBC)

          generate_aes_key(cipher) do |envelope_key, envelope_iv|
            envelope_key, envelope_iv =
              encode_envelope_key(encryption_key, envelope_key, envelope_iv)

            build_cse_metadata(options,
                               envelope_key,
                               envelope_iv) do |headers, encryption_materials|
              store_encryption_materials(options, headers, encryption_materials)
            end
          end

          # Wrap current stream in encryption
          options[:data] = CipherIO.new(cipher,
                                        options[:data],
                                        options[:content_length])

          # Update content_length
          options[:content_length] =
            get_encrypted_size(options[:content_length]) if
              options[:content_length]

        end
        remove_cse_options(options)
      end

      # @yield [String, String] Yields an encrypted encoded key and iv pair
      def encode_envelope_key encryption_key, envelope_key, envelope_iv, &block
        envelope_key = encrypt(envelope_key, encryption_key)
        [encode64(envelope_key), encode64(envelope_iv)]
      end

      # @yield [Hash, Hash] Yields headers and encryption materials that are
      #   to be stored in the metadata and/or instruction file
      def build_cse_metadata options, enc_envelope_key, enc_envelope_iv, &block
        # Ensure metadata exists
        options[:metadata] = {} unless options[:metadata]

        matdesc = options[:encryption_matdesc] || config.s3_encryption_matdesc

        encryption_materials = {'x-amz-key' => enc_envelope_key,
                                'x-amz-iv'  => enc_envelope_iv,
                                'x-amz-matdesc' => matdesc}
        orig_headers = {}

        # Save the unencrypted content length
        if options[:content_length]
          orig_headers['x-amz-unencrypted-content-length'] =
            options[:content_length]
        end

        # Save the unencrypted content MD5
        if options[:content_md5]
          orig_headers['x-amz-unencrypted-content-md5'] =
            options[:content_md5]
          options.delete(:content_md5)
        end

        options[:metadata].merge!(orig_headers)

        yield([orig_headers, encryption_materials])
      end

      # Stores the headers and encryption materials needed to decrypt the data
      #   and to know unencrypted information about the object
      def store_encryption_materials options, orig_headers, encryption_materials
        # Get the storage location
        cse_location = options[:encryption_materials_location] ||
                   config.s3_encryption_materials_location

        # Encryption type specific metadata
        case cse_location
        when :metadata
          options[:metadata].merge!(encryption_materials)
        when :instruction_file
          json_string = JSON.generate(encryption_materials)
          inst_headers = {'x-amz-crypto-instr-file' => ""}.merge(orig_headers)
          bucket.objects["#{key}.instruction"].write(json_string,
                                                     :metadata => inst_headers)
        else
          msg = "invalid :encryption_materials_location, expected "
          msg << ":metadata or :instruction_file, got: #{cse_location.inspect}"
          raise ArgumentError, msg
        end
        nil
      end

      # Removes any extra headers client-side encryption uses.
      def remove_cse_options options
        options.delete(:encryption_key)
        options.delete(:encryption_materials_location)
        options.delete(:encryption_matdesc)
      end

      # Yields a decryption cipher for the given client-side encryption key
      # or raises an error.
      def decryption_cipher options, &block
        encryption_key_for(options) do |encryption_key|

          check_encryption_materials(:decrypt, encryption_key)

          location = options[:encryption_materials_location] ||
            config.s3_encryption_materials_location

          cipher =
          decryption_materials(location, options) do |envelope_key, envelope_iv|
            envelope_key, envelope_iv =
              decode_envelope_key(envelope_key, envelope_iv, encryption_key)
            get_aes_cipher(:decrypt, :CBC, envelope_key, envelope_iv)
          end

          remove_cse_options(options)

          yield(cipher)

        end
      end

      # Decodes the envelope key for decryption
      def decode_envelope_key envelope_key, envelope_iv, encryption_key
        decrypted_key =
        begin
          decrypt(decode64(envelope_key), encryption_key)
        rescue RuntimeError
          msg = "Master key used to decrypt data key is not correct."
          raise AWS::S3::Errors::IncorrectClientSideEncryptionKey, msg
        end

        [decrypted_key, decode64(envelope_iv)]
      end


      # @yield [String, String, String] Yields encryption materials for
      #   decryption
      def decryption_materials location, options = {}, &block

        materials = case location
          when :metadata then get_metadata_materials(options)
          when :instruction_file then get_inst_file_materials
          else
            msg = "invalid :encryption_materials_location option, expected "
            msg << ":metadata or :instruction_file, got: #{location.inspect}"
            raise ArgumentError, msg
          end

        envelope_key, envelope_iv = materials

        unless envelope_key and envelope_iv
          raise 'no encryption materials found, unable to decrypt'
        end

        yield(envelope_key, envelope_iv)

      end

      # @return [String, String, String] Returns the data key, envelope_iv, and the
      #   material description for decryption from the metadata.
      def get_metadata_materials(options)
        opts = {}
        opts[:version_id] = options[:version_id] if options[:version_id]
        metadata(opts).to_h.values_at(*%w(x-amz-key x-amz-iv))
      end

      # @return [String, String, String] Returns the data key, envelope_iv, and the
      #   material description for decryption from the instruction file.
      def get_inst_file_materials
        obj = bucket.objects["#{key}.instruction"]
        JSON.parse(obj.read).values_at(*%w(x-amz-key x-amz-iv))
      end

      # @yield [Hash] Yields the metadata to be saved for client-side encryption
      def copy_cse_materials source, options
        cse_materials = {}
        meta = source.metadata.to_h
        cse_materials['x-amz-key'] = meta['x-amz-key'] if meta['x-amz-key']
        cse_materials['x-amz-iv'] = meta['x-amz-iv']   if meta['x-amz-iv']
        cse_materials['x-amz-matdesc'] = meta['x-amz-matdesc'] if
                                           meta['x-amz-matdesc']
        cse_materials['x-amz-unencrypted-content-length'] =
          meta['x-amz-unencrypted-content-length'] if
            meta['x-amz-unencrypted-content-length']
        cse_materials['x-amz-unencrypted-content-md5'] =
          meta['x-amz-unencrypted-content-md5'] if
            meta['x-amz-unencrypted-content-md5']

        if
          cse_materials['x-amz-key'] and
          cse_materials['x-amz-iv']  and
          cse_materials['x-amz-matdesc']
        then
          options[:metadata] = (options[:metadata] || {}).merge(cse_materials)
        else
          # Handling instruction file
          source_inst = "#{source.key}.instruction"
          dest_inst   = "#{key}.instruction"
          self.bucket.objects[dest_inst].copy_from(
            source.bucket.objects[source_inst])
        end
      end

      # Removes unwanted options that should not be passed to the client.
      def clean_up_options(options)
        options.delete(:estimated_content_length)
        options.delete(:single_request)
        options.delete(:multipart_threshold)
      end

      # Performs a write using a multipart upload
      def write_with_multipart options
        part_size = compute_part_size(options)
        clean_up_options(options)
        options.delete(:content_length)

        multipart_upload(options) do |upload|
          upload.add_part(options[:data].read(part_size)) until
            options[:data].eof?
        end
      end

      # Performs a write using a single request
      def write_with_put_object options

        # its possible we don't know the content length of the data
        # option, but the :estimated_content_length was sufficiently
        # small that we will read the entire stream into memory
        # so we can tell s3 the content length (this is required).
        unless options[:content_length]
          data = StringIO.new

          while (chunk = options[:data].read(4 * 1024))
            data << chunk
          end

          options[:content_length] = data.size
          data.rewind
          options[:data] = data
        end

        clean_up_options(options)

        options[:bucket_name] = bucket.name
        options[:key]         = key

        resp = client.put_object(options)

        resp.data[:version_id] ?
          ObjectVersion.new(self, resp.data[:version_id]) : self
      end

      def encryption_key_for options, &block
        if key = options[:encryption_key] || config.s3_encryption_key
          yield(key)
        end
      end

      def add_storage_class_option options
        if options[:reduced_redundancy] == true
          options[:storage_class] = 'REDUCED_REDUNDANCY'
        end
      end

      # @return [String] Encodes a `String` in base 64 regardless of version of
      #   Ruby for http headers (removes newlines).
      def encode64 input
        Base64.encode64(input).split("\n") * ""
      end

      # @return [String] Decodes a `String` in base 64.
      def decode64 input
        Base64.decode64(input)
      end
    end
  end
end
