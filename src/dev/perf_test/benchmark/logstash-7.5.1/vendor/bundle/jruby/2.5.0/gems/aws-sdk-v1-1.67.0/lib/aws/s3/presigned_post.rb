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
require 'time'

module AWS
  class S3

    # Helper to generate form fields for presigned POST requests to
    # a bucket.  You can use this to create a form that can be used
    # from a web browser to upload objects to S3 while specifying
    # conditions on what can be uploaded and how it is processed and
    # stored.
    #
    # @example Form fields for uploading by file name
    #
    #   form = bucket.presigned_post(:key => "photos/${filename}")
    #   form.url.to_s        # => "https://mybucket.s3.amazonaws.com/"
    #   form.fields          # => { "AWSAccessKeyId" => "...", ... }
    #
    # @example Generating a minimal HTML form
    #
    #   form = bucket.objects.myobj.presigned_post
    #   hidden_inputs = form.fields.map do |(name, value)|
    #     %(<input type="hidden" name="#{name}" value="#{value}" />)
    #   end
    #   <<-END
    #   <form action="#{form.url}" method="post" enctype="multipart/form-data">
    #     #{hidden_inputs}
    #     <input type="file" name="file" />
    #   </form>
    #   END
    #
    # @example Restricting the size of the uploaded object
    #
    #   bucket.presigned_post(:content_length => 1..(10*1024))
    #
    # @example Restricting the key prefix
    #
    #   bucket.presigned_post.where(:key).starts_with("photos/")
    #
    class PresignedPost

      include Core::Model

      # @return [Bucket] The bucket to which data can be uploaded
      #   using the form fields
      attr_reader :bucket

      # @return [String] The key of the object that will be
      #   uploaded.  If this is nil, then the object can be uploaded
      #   with any key that satisfies the conditions specified for
      #   the upload (see {#where}).
      attr_reader :key

      # @return [Hash] A hash of the metadata fields included in the
      #   signed fields.  Additional metadata fields may be provided
      #   with the upload as long as they satisfy the conditions
      #   specified for the upload (see {#where}).
      attr_reader :metadata

      # @return [Range] The range of acceptable object sizes for the
      #   upload.  By default any size object may be uploaded.
      attr_reader :content_length

      # @api private
      attr_reader :conditions

      # @return [Array<String>] Additional fields which may be sent
      #   with the upload.  These will be included in the policy so
      #   that they can be sent with any value.  S3 will ignore
      #   them.
      attr_reader :ignored_fields

      # @return The expiration time for the signature.  By default
      #   the signature will expire an hour after it is generated.
      attr_reader :expires

      # @api private
      SPECIAL_FIELDS = [:key,
                        :policy,
                        :signature,
                        :expires,
                        :metadata,
                        :content_length,
                        :conditions,
                        :ignore,
                        :secure]

      # Creates a new presigned post object.
      #
      # @param [Bucket] bucket The bucket to which data can be uploaded
      #   using the form fields.
      #
      # @param [Hash] opts Additional options for the upload.  Aside
      #   from `:secure`, `:expires`, `:content_length` and `:ignore`
      #   the values provided here will be stored in the hash returned
      #   from the {#fields} method, and the policy in that hash will
      #   restrict their values to the values provided.  If you
      #   instead want to only restrict the values and not provide
      #   them -- for example, if your application generates separate
      #   form fields for those values -- you should use the {#where}
      #   method on the returned object instead of providing the
      #   values here.
      #
      # @option opts [String] :key The key of the object that will
      #   be uploaded.  If this is nil, then the object can be
      #   uploaded with any key that satisfies the conditions
      #   specified for the upload (see {#where}).
      #
      # @option opts [Boolean] :secure By setting this to false, you
      #   can cause {#url} to return an HTTP URL.  By default it
      #   returns an HTTPS URL.
      #
      # @option opts [Time, DateTime, Integer, String] :expires The
      #   time at which the signature will expire.  By default the
      #   signature will expire one hour after it is generated
      #   (e.g. when {#fields} is called).
      #
      #   When the value is a Time or DateTime, the signature
      #   expires at the specified time.  When it is an integer, the
      #   signature expires the specified number of seconds after it
      #   is generated.  When it is a string, the string is parsed
      #   as a time (using Time.parse) and the signature expires at
      #   that time.
      #
      # @option opts [String] :cache_control Sets the Cache-Control
      #   header stored with the object.
      #
      # @option opts [String] :content_type Sets the Content-Type
      #   header stored with the object.
      #
      # @option opts [String] :content_disposition Sets the
      #   Content-Disposition header stored with the object.
      #
      # @option opts [String] :expires_header Sets the Expires
      #   header stored with the object.
      #
      # @option options [Symbol] :acl A canned access control
      #   policy.  Valid values are:
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
      # @option opts [String] :success_action_redirect The URL to
      #   which the client is redirected upon successful upload.
      #
      # @option opts [Integer] :success_action_status The status
      #   code returned to the client upon successful upload if
      #   `:success_action_redirect` is not specified.  Accepts the
      #   values 200, 201, or 204 (default).
      #
      #   If the value is set to 200 or 204, Amazon S3 returns an
      #   empty document with a 200 or 204 status code.
      #
      #   If the value is set to 201, Amazon S3 returns an XML
      #   document with a 201 status code.  For information on the
      #   content of the XML document, see
      #   [POST Object](http://docs.aws.amazon.com/AmazonS3/2006-03-01/API/index.html?RESTObjectPOST.html).
      #
      # @option opts [Hash] :metadata A hash of the metadata fields
      #   included in the signed fields.  Additional metadata fields
      #   may be provided with the upload as long as they satisfy
      #   the conditions specified for the upload (see {#where}).
      #
      # @option opts [Integer, Range] :content_length The range of
      #   acceptable object sizes for the upload.  By default any
      #   size object may be uploaded.
      #
      # @option opts [Array<String>] :ignore Additional fields which
      #   may be sent with the upload.  These will be included in
      #   the policy so that they can be sent with any value.  S3
      #   will ignore them.
      def initialize(bucket, opts = {})
        @bucket = bucket
        @key = opts[:key]
        @secure = (opts[:secure] != false)
        @fields = {}
        # TODO normalize all values to @fields
        opts.each do |opt_key, opt_val|
          @fields[opt_key] = opt_val unless SPECIAL_FIELDS.include? opt_key
        end
        @metadata = opts[:metadata] || {}
        @content_length = range_value(opts[:content_length])
        @conditions = opts[:conditions] || {}
        @ignored_fields = [opts[:ignore]].flatten.compact
        @expires = opts[:expires] || Time.now.utc + 60*60

        super

        @fields[:server_side_encryption] =
          config.s3_server_side_encryption unless
          @fields.key?(:server_side_encryption)
        @fields.delete(:server_side_encryption) if
          @fields[:server_side_encryption].nil?
      end

      # @return [Boolean] True if {#url} generates an HTTPS url.
      def secure?
        @secure
      end

      # @return [URI::HTTP, URI::HTTPS] The URL to which the form
      #   fields should be POSTed.  If you are using the fields in
      #   an HTML form, this is the URL to put in the `action`
      #   attribute of the form tag.
      def url
        req = Request.new
        req.bucket = bucket.name
        req.host = config.s3_endpoint
        build_uri(req)
      end

      # Lets you specify conditions on a field.  See
      # {PresignedPost#where} for usage examples.
      class ConditionBuilder

        # @api private
        def initialize(post, field)
          @post = post
          @field = field
        end

        # Specifies that the value of the field must equal the
        # provided value.
        def is(value)
          if @field == :content_length
            self.in(value)
          else
            @post.with_equality_condition(@field, value)
          end
        end

        # Specifies that the value of the field must begin with the
        # provided value.  If you are specifying a condition on the
        # "key" field, note that this check takes place after the
        # `${filename}` variable is expanded.  This is only valid
        # for the following fields:
        #
        # * `:key`
        # * `:cache_control`
        # * `:content_type`
        # * `:content_disposition`
        # * `:content_encoding`
        # * `:expires_header`
        # * `:acl`
        # * `:success_action_redirect`
        # * metadata fields (see {#where_metadata})
        def starts_with(prefix)
          @post.with_prefix_condition(@field, prefix)
        end

        # Specifies that the value of the field must be in the given
        # range.  This may only be used to constrain the
        # `:content_length` field,
        # e.g. `presigned_post.with(:conent_length).in(1..4)`.
        def in(range)
          @post.refine(:content_length => range)
        end

      end

      # Adds a condition to the policy for the POST.  Use
      # {#where_metadata} to add metadata conditions.
      #
      # @example Restricting the ACL to "bucket-owner" ACLs
      #  presigned_post.where(:acl).starts_with("bucket-owner")
      #
      # @param [Symbol] field The field for which a condition should
      #  be added. In addition to any arbitrary values you have set,
      #  the following values are also permitted:
      #
      #  * `:key`
      #  * `:content_length`
      #  * `:cache_control`
      #  * `:content_type`
      #  * `:content_disposition`
      #  * `:content_encoding`
      #  * `:expires_header`
      #  * `:acl`
      #  * `:success_action_redirect`
      #  * `:success_action_status`
      #
      # @return [ConditionBuilder] An object that allows you to
      #   specify a condition on the field.
      def where(field)
        ConditionBuilder.new(self, field)
      end

      # Adds a condition to the policy for the POST to constrain the
      # values of metadata fields uploaded with the object.  If a
      # metadata field does not have a condition associated with it
      # and is not specified in the constructor (see {#metadata})
      # then S3 will reject it.
      #
      # @param [Symbol, String] field The name of the metadata
      #   attribute.  For example, `:color` corresponds to the
      #   "x-amz-meta-color" field in the POST body.
      #
      # @return [ConditionBuilder] An object that allows you to
      #   specify a condition on the metadata attribute.
      def where_metadata(field)
        where("x-amz-meta-#{field}")
      end

      # @return [String] The Base64-encoded JSON policy document.
      def policy
        json = {
          "expiration" => format_expiration,
          "conditions" => generate_conditions
        }.to_json
        Base64.encode64(json).tr("\n","")
      end

      # @return [Hash] A collection of form fields (including a
      #   signature and a policy) that can be used to POST data to
      #   S3.  Additional form fields may be added after the fact as
      #   long as they are described by a policy condition (see
      #   {#where}).
      def fields

        secret = config.credential_provider.secret_access_key
        signature = Core::Signers::Base.sign(secret, policy, 'sha1')

        fields = {
          "AWSAccessKeyId" => config.credential_provider.access_key_id,
          "key" => key,
          "policy" => policy,
          "signature" => signature
        }.merge(optional_fields)

        if token = config.credential_provider.session_token
          fields["x-amz-security-token"] = token
        end

        fields.merge(optional_fields)
      end

      # @api private
      def with_equality_condition(option_name, value)
        field_name = field_name(option_name)
        with_condition(option_name, Hash[[[field_name, value]]])
      end

      # @api private
      def with_prefix_condition(option_name, prefix)
        field_name = field_name(option_name)
        with_condition(option_name,
                       ["starts-with", "$#{field_name}", prefix])
      end

      # @api private
      def refine(opts)
        self.class.new(bucket, {
                         :conditions => conditions,
                         :key => key,
                         :metadata => metadata,
                         :secure => secure?,
                         :content_length => content_length,
                         :expires => expires,
                         :ignore => ignored_fields
                       }.merge(@fields).
                       merge(opts))
      end

      # @api private
      private
      def with_condition(field, condition)
        conditions = self.conditions.dup
        (conditions[field] ||= []) << condition
        refine(:conditions => conditions)
      end

      # @api private
      private
      def format_expiration
        time =
          case expires
          when Time
            expires
          when DateTime
            Time.parse(expires.to_s)
          when Integer
            (Time.now + expires)
          when String
            Time.parse(expires)
          end
        time.utc.iso8601
      end

      # @api private
      private
      def range_value(range)
        case range
        when Integer
          range..range
        when Range
          range
        end
      end

      # @api private
      private
      def split_range(range)
        range = range_value(range)
        [range.begin,
         (range.exclude_end? ?
          range.end-1 :
          range.end)]
      end

      # @api private
      private
      def optional_fields
        fields = @fields.keys.inject({}) do |fields, option_name|
          fields[field_name(option_name)] =
            field_value(option_name)
          fields
        end

        @metadata.each do |key, value|
          fields["x-amz-meta-#{key}"] = value.to_s
        end

        fields
      end

      # @api private
      private
      def field_name(option_name)
        case option_name
        when :expires_header
          "Expires"
        when :server_side_encryption
          "x-amz-server-side-encryption"
        when :key, "Key", :policy, "Policy"
          option_name.to_s.downcase
        when :acl, :success_action_redirect, :success_action_status
          option_name.to_s
        else
          # e.g. Cache-Control from cache_control
          field_name = option_name.to_s.tr("_", "-").
            gsub(/-(.)/) { |m| m.upcase }
          field_name[0,1] = field_name[0,1].upcase
          field_name
        end
      end

      # @api private
      private
      def field_value(option_name)
        case option_name
        when :acl
          @fields[:acl].to_s.tr("_", "-")
        when :server_side_encryption
          value = @fields[:server_side_encryption]
          if value.kind_of?(Symbol)
            value.to_s.upcase
          else
            value.to_s
          end
        else
          @fields[option_name].to_s
        end
      end

      # @api private
      private
      def generate_conditions

        conditions = self.conditions.inject([]) do |list, (field, field_conds)|
          list + field_conds
        end

        conditions << { "bucket" => bucket.name }
        conditions += key_conditions
        conditions += optional_fields.map { |(n, v)| Hash[[[n, v]]] }
        conditions += range_conditions
        conditions += ignored_conditions

        if token = config.credential_provider.session_token
          conditions << { "x-amz-security-token" => token }
        end

        conditions

      end

      # @api private
      private
      def ignored_conditions
        ignored_fields.map do |field|
          ["starts-with", "$#{field}", ""]
        end
      end

      # @api private
      private
      def range_conditions
        if content_length
          [["content-length-range", *split_range(content_length)]]
        else
          []
        end
      end

      # @api private
      private
      def key_conditions
        [if key && key.include?("${filename}")
           ["starts-with", "$key", key[/^(.*)\$\{filename\}/, 1]]
         elsif key
           { "key" => key }
         else
           ["starts-with", "$key", ""]
         end]
      end

      # @api private
      private
      def build_uri(request)
        uri_class = secure? ? URI::HTTPS : URI::HTTP
        uri_class.build(:host => request.host,
                        :path => request.path,
                        :query => request.querystring)
      end

    end

  end
end
