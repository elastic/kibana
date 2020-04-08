# -*- coding: utf-8 -*-
# Copyright 2011-2014 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

require 'rexml/document'
require 'pathname'
require 'stringio'
require 'json'
require 'digest/md5'
require 'base64'
require 'nokogiri'
require 'set'

module AWS
  class S3

    # Client class for Amazon Simple Storage Service (S3).
    class Client < Core::Client

      include RegionDetection

      def initialize(options = {})
        super(options.merge(:http_continue_threshold => 0))
      end

      signature_version :S3

      API_VERSION = '2006-03-01'

      XMLNS = "http://s3.amazonaws.com/doc/#{API_VERSION}/"

      HTTP_200_ERROR_OPERATIONS = Set.new([
        :complete_multipart_upload,
        :copy_object,
        :copy_part,
      ])

      autoload :XML, 'aws/s3/client/xml'

      # @api private
      EMPTY_BODY_ERRORS = {
        304 => Errors::NotModified,
        403 => Errors::Forbidden,
        400 => Errors::BadRequest,
        404 => Errors::NoSuchKey,
      }

      # @api private
      CACHEABLE_REQUESTS = Set[]

      include DataOptions
      include Core::UriEscape

      # @param [Core::Http::Request] request
      # @api private
      def sign_request request
        case @config.s3_signature_version.to_sym
        when :v4 then v4_signer.sign_request(request)
        when :v3 then v3_signer.sign_request(request)
        else
          raise "invalid signature version #{@config.s3_signature_version.inspect}"
        end
      end

      protected

      # @return [Core::Signers::S3]
      def v3_signer
        @v3_signer ||= Core::Signers::S3.new(credential_provider)
      end

      # @return [Core::Signers::Version4]
      def v4_signer
        @v4_signer ||= begin
          Core::Signers::Version4.new(credential_provider, 's3', @region)
        end
      end

      # @param [Http::Request] req
      # @return [Boolean]
      def chunk_sign? req
        req.http_method == 'PUT' &&
        req.headers['content-length'].to_i > 2 * 1024 * 1024 # 2MB
      end

      def self.bucket_method(method_name, verb, *args, &block)

        method_options = (args.pop if args.last.kind_of?(Hash)) || {}
        xml_grammar = (args.pop if args.last.respond_to?(:rules))
        verb = verb.to_s.upcase
        subresource = args.first

        add_client_request_method(method_name) do

          configure_request do |req, options|

            require_bucket_name!(options[:bucket_name])

            req.http_method = verb
            req.bucket = options[:bucket_name]
            req.add_param(subresource) if subresource

            if header_options = method_options[:header_options]
              header_options.each do |(opt, header)|
                if value = options[opt]
                  # for backwards compatability we translate canned acls
                  # header values from symbols to strings (e.g.
                  # :public_read translates to 'public-read')
                  value = (opt == :acl ? value.to_s.tr('_', '-') : value)
                  req.headers[header] = value
                end
              end
            end

          end

          instance_eval(&block) if block

          if xml_grammar

            parser = Core::XML::Parser.new(xml_grammar.rules)

            process_response do |resp|
              resp.data = parser.parse(resp.http_response.body)
              super(resp)
            end

            simulate_response do |resp|
              resp.data = parser.simulate
              super(resp)
            end

          end

        end
      end

      protected

      def set_metadata request, options
        if metadata = options[:metadata]
          Array(metadata).each do |name, value|
            request.headers["x-amz-meta-#{name}"] = value
          end
        end
      end

      def set_storage_class request, options
        storage_class = options[:storage_class]
        if storage_class.kind_of?(Symbol)
          request.headers["x-amz-storage-class"] = storage_class.to_s.upcase
        elsif storage_class
          request.headers["x-amz-storage-class"] = storage_class
        end
      end

      def set_server_side_encryption request, options
        sse = options[:server_side_encryption]
        if sse.is_a?(Symbol)
          request.headers['x-amz-server-side-encryption'] = sse.to_s.upcase
        elsif sse
          request.headers['x-amz-server-side-encryption'] = sse
        end
      end

      def extract_error_details response
        if
          (
            response.http_response.status >= 300 ||
            HTTP_200_ERROR_OPERATIONS.include?(response.request_type)
          ) and
          body = response.http_response.body and
          error = Core::XML::Parser.parse(body) and
          error[:code]
        then
          [error[:code], error[:message]]
        end
      end

      def empty_response_body? response_body
        response_body.nil? or response_body == ''
      end

      # There are a few of s3 requests that can generate empty bodies and
      # yet still be errors.  These return empty bodies to comply with the
      # HTTP spec.  We have to detect these errors specially.
      def populate_error resp
        code = resp.http_response.status
        if EMPTY_BODY_ERRORS.include?(code) and empty_response_body?(resp.http_response.body)
          error_class = EMPTY_BODY_ERRORS[code]
          resp.error = error_class.new(resp.http_request, resp.http_response)
        else
          super
        end
      end

      def retryable_error? response
        super ||
        http_200_error?(response) ||
        response.error.is_a?(Errors::RequestTimeout)
      end

      # S3 may return with a 200 status code in the response, but still
      # embed an error in the body for the following operations:
      #
      # * `#complete_multipart_upload`
      # * `#copy_object`
      # * `#copy_part`
      #
      # To ensure the response is not in error, we have to parse
      # it before the normal parser.
      def http_200_error? response
        HTTP_200_ERROR_OPERATIONS.include?(response.request_type) &&
        extract_error_details(response)
      end

      def new_request
        req = S3::Request.new
        req.force_path_style = config.s3_force_path_style?
        req
      end

      # Previously the access control policy could be specified via :acl
      # as a string or an object that responds to #to_xml.  The prefered
      # method now is to pass :access_control_policy an xml document.
      def move_access_control_policy options
        if acl = options[:acl]
          if acl.is_a?(String) and is_xml?(acl)
            options[:access_control_policy] = options.delete(:acl)
          elsif acl.respond_to?(:to_xml)
            options[:access_control_policy] = options.delete(:acl).to_xml
          end
        end
      end

      # @param [String] possible_xml
      # @return [Boolean] Returns `true` if the given string is a valid xml
      #   document.
      def is_xml? possible_xml
        begin
          REXML::Document.new(possible_xml).has_elements?
        rescue
          false
        end
      end

      def md5 str
        Base64.encode64(OpenSSL::Digest::MD5.digest(str)).strip
      end

      def parse_copy_part_response resp
        doc = REXML::Document.new(resp.http_response.body)
        resp[:etag] = doc.root.elements["ETag"].text
        resp[:last_modified] = doc.root.elements["LastModified"].text
        if header = resp.http_response.headers['x-amzn-requestid']
          data[:request_id] = [header].flatten.first
        end
      end

      def extract_object_headers resp
        meta = {}
        resp.http_response.headers.each_pair do |name,value|
          if name =~ /^x-amz-meta-(.+)$/i
            meta[$1] = [value].flatten.join
          end
        end
        resp.data[:meta] = meta

        if expiry = resp.http_response.headers['x-amz-expiration']
          expiry.first =~ /^expiry-date="(.+)", rule-id="(.+)"$/
          exp_date = DateTime.parse($1)
          exp_rule_id = $2
        else
          exp_date = nil
          exp_rule_id = nil
        end
        resp.data[:expiration_date] = exp_date if exp_date
        resp.data[:expiration_rule_id] = exp_rule_id if exp_rule_id

        restoring = false
        restore_date = nil

        if restore = resp.http_response.headers['x-amz-restore']
          if restore.first =~ /ongoing-request="(.+?)", expiry-date="(.+?)"/
            restoring = $1 == "true"
            restore_date = $2 && DateTime.parse($2)
          elsif restore.first =~ /ongoing-request="(.+?)"/
            restoring = $1 == "true"
          end
        end
        resp.data[:restore_in_progress] = restoring
        resp.data[:restore_expiration_date] = restore_date if restore_date

        {
          'x-amz-version-id' => :version_id,
          'content-type' => :content_type,
          'content-encoding' => :content_encoding,
          'cache-control' => :cache_control,
          'expires' => :expires,
          'etag' => :etag,
          'x-amz-website-redirect-location' => :website_redirect_location,
          'accept-ranges' => :accept_ranges,
          'x-amz-server-side-encryption-customer-algorithm' => :sse_customer_algorithm,
          'x-amz-server-side-encryption-customer-key-MD5' => :sse_customer_key_md5
        }.each_pair do |header,method|
          if value = resp.http_response.header(header)
            resp.data[method] = value
          end
        end

        if time = resp.http_response.header('Last-Modified')
          resp.data[:last_modified] = Time.parse(time)
        end

        if length = resp.http_response.header('content-length')
          resp.data[:content_length] = length.to_i
        end

        if sse = resp.http_response.header('x-amz-server-side-encryption')
          resp.data[:server_side_encryption] = sse.downcase.to_sym
        end

      end

      module Validators

        # @return [Boolean] Returns true if the given bucket name is valid.
        def valid_bucket_name?(bucket_name)
          validate_bucket_name!(bucket_name) rescue false
        end

        # Returns true if the given `bucket_name` is DNS compatible.
        #
        # DNS compatible bucket names may be accessed like:
        #
        #     http://dns.compat.bucket.name.s3.amazonaws.com/
        #
        # Whereas non-dns compatible bucket names must place the bucket
        # name in the url path, like:
        #
        #     http://s3.amazonaws.com/dns_incompat_bucket_name/
        #
        # @return [Boolean] Returns true if the given bucket name may be
        #   is dns compatible.
        #   this bucket n
        #
        def dns_compatible_bucket_name?(bucket_name)
          return false if
            !valid_bucket_name?(bucket_name) or

            # Bucket names should be between 3 and 63 characters long
            bucket_name.size > 63 or

            # Bucket names must only contain lowercase letters, numbers, dots, and dashes
            # and must start and end with a lowercase letter or a number
            bucket_name !~ /^[a-z0-9][a-z0-9.-]+[a-z0-9]$/ or

            # Bucket names should not be formatted like an IP address (e.g., 192.168.5.4)
            bucket_name =~ /(\d+\.){3}\d+/ or

            # Bucket names cannot contain two, adjacent periods
            bucket_name['..'] or

            # Bucket names cannot contain dashes next to periods
            # (e.g., "my-.bucket.com" and "my.-bucket" are invalid)
            (bucket_name['-.'] || bucket_name['.-'])

          true
        end

        # Returns true if the bucket name must be used in the request
        # path instead of as a sub-domain when making requests against
        # S3.
        #
        # This can be an issue if the bucket name is DNS compatible but
        # contains '.' (periods).  These cause the SSL certificate to
        # become invalid when making authenticated requets over SSL to the
        # bucket name.  The solution is to send this as a path argument
        # instead.
        #
        # @return [Boolean] Returns true if the bucket name should be used
        #   as a path segement instead of dns prefix when making requests
        #   against s3.
        #
        def path_style_bucket_name? bucket_name
          if dns_compatible_bucket_name?(bucket_name)
            bucket_name =~ /\./ ? true : false
          else
            true
          end
        end

        def validate! name, value, &block
          if error_msg = yield
            raise ArgumentError, "#{name} #{error_msg}"
          end
          value
        end

        def validate_key!(key)
          validate!('key', key) do
            case
            when key.nil? || key == ''
              'may not be blank'
            end
          end
        end

        def require_bucket_name! bucket_name
          if [nil, ''].include?(bucket_name)
            raise ArgumentError, "bucket_name may not be blank"
          end
        end

        # Returns true if the given bucket name is valid.  If the name
        # is invalid, an ArgumentError is raised.
        def validate_bucket_name!(bucket_name)
          validate!('bucket_name', bucket_name) do
            case
            when bucket_name.nil? || bucket_name == ''
              'may not be blank'
            when bucket_name !~ /^[A-Za-z0-9._\-]+$/
              'may only contain uppercase letters, lowercase letters, numbers, periods (.), ' +
              'underscores (_), and dashes (-)'
            when !(3..255).include?(bucket_name.size)
              'must be between 3 and 255 characters long'
            when bucket_name =~ /\n/
              'must not contain a newline character'
            end
          end
        end

        def require_policy!(policy)
          validate!('policy', policy) do
            case
            when policy.nil? || policy == ''
              'may not be blank'
            else
              json_validation_message(policy)
            end
          end
        end

        def require_acl! options
          acl_options = [
            :acl,
            :grant_read,
            :grant_write,
            :grant_read_acp,
            :grant_write_acp,
            :grant_full_control,
            :access_control_policy,
          ]
          unless options.keys.any?{|opt| acl_options.include?(opt) }
            msg = "missing a required ACL option, must provide an ACL " +
                  "via :acl, :grant_* or :access_control_policy"
            raise ArgumentError, msg
          end
        end

        def set_body_stream_and_content_length request, options

          unless options[:content_length]
            msg = "S3 requires a content-length header, unable to determine "
            msg << "the content length of the data provided, please set "
            msg << ":content_length"
            raise ArgumentError, msg
          end

          request.headers['content-length'] = options[:content_length]
          request.body_stream = options[:data]

        end

        def require_upload_id!(upload_id)
          validate!("upload_id", upload_id) do
            "must not be blank" if upload_id.to_s.empty?
          end
        end

        def require_part_number! part_number
          validate!("part_number", part_number) do
            "must not be blank" if part_number.to_s.empty?
          end
        end

        def validate_parts!(parts)
          validate!("parts", parts) do
            if !parts.kind_of?(Array)
              "must not be blank"
            elsif parts.empty?
              "must contain at least one entry"
            elsif !parts.all? { |p| p.kind_of?(Hash) }
              "must be an array of hashes"
            elsif !parts.all? { |p| p[:part_number] }
              "must contain part_number for each part"
            elsif !parts.all? { |p| p[:etag] }
              "must contain etag for each part"
            elsif parts.any? { |p| p[:part_number].to_i < 1 }
              "must not have part numbers less than 1"
            end
          end
        end

        def json_validation_message(obj)
          if obj.respond_to?(:to_str)
            obj = obj.to_str
          elsif obj.respond_to?(:to_json)
            obj = obj.to_json
          end

          error = nil
          begin
            JSON.parse(obj)
          rescue => e
            error = e
          end
          "contains invalid JSON: #{error}" if error
        end

        def require_allowed_methods!(allowed_methods)
          validate!("allowed_methods", allowed_methods) do
            if !allowed_methods.kind_of?(Array)
              "must be an array"
            elsif !allowed_methods.all? { |x| x.kind_of?(String) }
              "must be an array of strings"
            end
          end
        end

        def require_allowed_origins!(allowed_origins)
          validate!("allowed_origins", allowed_origins) do
            if !allowed_origins.kind_of?(Array)
              "must be an array"
            elsif !allowed_origins.all? { |x| x.kind_of?(String) }
              "must be an array of strings"
            end
          end
        end

      end

      include Validators
      extend Validators

    end

    class Client::V20060301 < Client

      def self.object_method(method_name, verb, *args, &block)
        bucket_method(method_name, verb, *args) do
          configure_request do |req, options|
            validate_key!(options[:key])
            super(req, options)
            req.key = options[:key]
          end

          instance_eval(&block) if block
        end
      end

      public

      # Creates a bucket.
      # @overload create_bucket(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [String] :acl A canned ACL (e.g. 'private',
      #     'public-read', etc).  See the S3 API documentation for
      #     a complete list of valid values.
      #   @option options [String] :grant_read
      #   @option options [String] :grant_write
      #   @option options [String] :grant_read_acp
      #   @option options [String] :grant_write_acp
      #   @option options [String] :grant_full_control
      #   @return [Core::Response]
      bucket_method(:create_bucket, :put, :header_options => {
        :acl => 'x-amz-acl',
        :grant_read => 'x-amz-grant-read',
        :grant_write => 'x-amz-grant-write',
        :grant_read_acp => 'x-amz-grant-read-acp',
        :grant_write_acp => 'x-amz-grant-write-acp',
        :grant_full_control => 'x-amz-grant-full-control',
      }) do

        configure_request do |req, options|
          validate_bucket_name!(options[:bucket_name])
          if location = options[:location_constraint]
            xmlns = "http://s3.amazonaws.com/doc/#{API_VERSION}/"
            req.body = <<-XML
              <CreateBucketConfiguration xmlns="#{xmlns}">
                <LocationConstraint>#{location}</LocationConstraint>
              </CreateBucketConfiguration>
            XML
          end
          super(req, options)
        end

      end
      alias_method :put_bucket, :create_bucket

      # @!method put_bucket_website(options = {})
      #   @param [Hash] options
      #   @option (see WebsiteConfiguration#initialize)
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      bucket_method(:put_bucket_website, :put, 'website') do

        configure_request do |req, options|
          req.body = Nokogiri::XML::Builder.new do |xml|
            xml.WebsiteConfiguration(:xmlns => XMLNS) do

              if redirect = options[:redirect_all_requests_to]
                xml.RedirectAllRequestsTo do
                  xml.HostName(redirect[:host_name])
                  xml.Protocol(redirect[:protocol]) if redirect[:protocol]
                end
              end

              if indx = options[:index_document]
                xml.IndexDocument do
                  xml.Suffix(indx[:suffix])
                end
              end

              if err = options[:error_document]
                xml.ErrorDocument do
                  xml.Key(err[:key])
                end
              end

              rules = options[:routing_rules]
              if rules.is_a?(Array) && !rules.empty?
                xml.RoutingRules do
                  rules.each do |rule|
                    xml.RoutingRule do

                      redirect = rule[:redirect]
                      xml.Redirect do
                        xml.Protocol(redirect[:protocol]) if redirect[:protocol]
                        xml.HostName(redirect[:host_name]) if redirect[:host_name]
                        xml.ReplaceKeyPrefixWith(redirect[:replace_key_prefix_with]) if redirect[:replace_key_prefix_with]
                        xml.ReplaceKeyWith(redirect[:replace_key_with]) if redirect[:replace_key_with]
                        xml.HttpRedirectCode(redirect[:http_redirect_code]) if redirect[:http_redirect_code]
                      end

                      if condition = rule[:condition]
                        xml.Condition do
                          xml.KeyPrefixEquals(condition[:key_prefix_equals]) if condition[:key_prefix_equals]
                          xml.HttpErrorCodeReturnedEquals(condition[:http_error_code_returned_equals]) if condition[:http_error_code_returned_equals]
                        end
                      end

                    end
                  end
                end
              end

            end
          end.doc.root.to_xml
          super(req, options)
        end

      end

      # @overload get_bucket_website(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      #     * `:index_document` - (Hash)
      #       * `:suffix` - (String)
      #     * `:error_document` - (Hash)
      #       * `:key` - (String)
      bucket_method(:get_bucket_website, :get, 'website', XML::GetBucketWebsite)

      # @overload delete_bucket_website(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      bucket_method(:delete_bucket_website, :delete, 'website')

      # Deletes an empty bucket.
      # @overload delete_bucket(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      bucket_method(:delete_bucket, :delete)

      # @overload set_bucket_lifecycle_configuration(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :lifecycle_configuration
      #   @return [Core::Response]
      bucket_method(:set_bucket_lifecycle_configuration, :put) do

        configure_request do |req, options|
          xml = options[:lifecycle_configuration]
          req.add_param('lifecycle')
          req.body = xml
          req.headers['content-md5'] = md5(xml)
          super(req, options)
        end

      end

      # @overload get_bucket_lifecycle_configuration(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      bucket_method(:get_bucket_lifecycle_configuration, :get) do

        configure_request do |req, options|
          req.add_param('lifecycle')
          super(req, options)
        end

        process_response do |resp|
          xml = resp.http_response.body
          resp.data = XML::GetBucketLifecycleConfiguration.parse(xml)
        end

      end

      # @overload delete_bucket_lifecycle_configuration(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      bucket_method(:delete_bucket_lifecycle_configuration, :delete) do

        configure_request do |req, options|
          req.add_param('lifecycle')
          super(req, options)
        end

      end

      # @overload put_bucket_cors(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,Array<Hash>] :rules An array of rule hashes.
      #     * `:id` - (String) A unique identifier for the rule. The ID
      #       value can be up to 255 characters long. The IDs help you find
      #       a rule in the configuration.
      #     * `:allowed_methods` - (required,Array<String>) A list of HTTP
      #       methods that you want to allow the origin to execute.
      #       Each rule must identify at least one method.
      #     * `:allowed_origins` - (required,Array<String>) A list of origins
      #       you want to allow cross-domain requests from. This can
      #       contain at most one * wild character.
      #     * `:allowed_headers` - (Array<String>) A list of headers allowed
      #       in a pre-flight OPTIONS request via the
      #       Access-Control-Request-Headers header. Each header name
      #       specified in the Access-Control-Request-Headers header must
      #       have a corresponding entry in the rule.
      #       Amazon S3 will send only the allowed headers in a response
      #       that were requested. This can contain at most one * wild
      #       character.
      #     * `:max_age_seconds` - (Integer) The time in seconds that your
      #       browser is to cache the preflight response for the specified
      #       resource.
      #     * `:expose_headers` - (Array<String>) One or more headers in
      #       the response that you want customers to be able to access
      #       from their applications (for example, from a JavaScript
      #       XMLHttpRequest object).
      #   @return [Core::Response]
      bucket_method(:put_bucket_cors, :put) do
        configure_request do |req, options|

          req.add_param('cors')

          options[:rules].each do |rule|
            require_allowed_methods!(rule[:allowed_methods])
            require_allowed_origins!(rule[:allowed_origins])
          end

          xml = Nokogiri::XML::Builder.new do |xml|
            xml.CORSConfiguration do
              options[:rules].each do |rule|
                xml.CORSRule do

                  xml.ID(rule[:id]) if rule[:id]

                  (rule[:allowed_methods] || []).each do |method|
                    xml.AllowedMethod(method)
                  end

                  (rule[:allowed_origins] || []).each do |origin|
                    xml.AllowedOrigin(origin)
                  end

                  (rule[:allowed_headers] || []).each do |header|
                    xml.AllowedHeader(header)
                  end

                  xml.MaxAgeSeconds(rule[:max_age_seconds]) if
                    rule[:max_age_seconds]

                  (rule[:expose_headers] || []).each do |header|
                    xml.ExposeHeader(header)
                  end

                end
              end
            end
          end.doc.root.to_xml

          req.body = xml
          req.headers['content-md5'] = md5(xml)

          super(req, options)

        end
      end

      # @overload get_bucket_cors(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      bucket_method(:get_bucket_cors, :get) do

        configure_request do |req, options|
          req.add_param('cors')
          super(req, options)
        end

        process_response do |resp|
          resp.data = XML::GetBucketCors.parse(resp.http_response.body)
        end

      end

      # @overload delete_bucket_cors(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      bucket_method(:delete_bucket_cors, :delete) do
        configure_request do |req, options|
          req.add_param('cors')
          super(req, options)
        end
      end

      # @overload put_bucket_tagging(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [Hash] :tags
      #   @return [Core::Response]
      bucket_method(:put_bucket_tagging, :put) do
        configure_request do |req, options|

          req.add_param('tagging')

          xml = Nokogiri::XML::Builder.new
          xml.Tagging do |xml|
            xml.TagSet do
              options[:tags].each_pair do |key,value|
                xml.Tag do
                  xml.Key(key)
                  xml.Value(value)
                end
              end
            end
          end

          xml = xml.doc.root.to_xml
          req.body = xml
          req.headers['content-md5'] = md5(xml)

          super(req, options)

        end
      end

      # @overload get_bucket_tagging(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      bucket_method(:get_bucket_tagging, :get) do

        configure_request do |req, options|
          req.add_param('tagging')
          super(req, options)
        end

        process_response do |resp|
          resp.data = XML::GetBucketTagging.parse(resp.http_response.body)
        end

      end

      # @overload delete_bucket_tagging(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      bucket_method(:delete_bucket_tagging, :delete) do
        configure_request do |req, options|
          req.add_param('tagging')
          super(req, options)
        end
      end

      # @overload list_buckets(options = {})
      #   @param [Hash] options
      #   @return [Core::Response]
      add_client_request_method(:list_buckets) do

        configure_request do |req, options|
          req.http_method = "GET"
        end

        process_response do |resp|
          resp.data = XML::ListBuckets.parse(resp.http_response.body)
        end

        simulate_response do |resp|
          resp.data = Core::XML::Parser.new(XML::ListBuckets.rules).simulate
        end

      end

      # Sets the access policy for a bucket.
      # @overload set_bucket_policy(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :policy This can be a String
      #     or any object that responds to `#to_json`.
      #   @return [Core::Response]
      bucket_method(:set_bucket_policy, :put, 'policy') do

        configure_request do |req, options|
          require_policy!(options[:policy])
          super(req, options)
          policy = options[:policy]
          policy = policy.to_json unless policy.respond_to?(:to_str)
          req.body = policy
        end

      end

      # Gets the access policy for a bucket.
      # @overload get_bucket_policy(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      bucket_method(:get_bucket_policy, :get, 'policy') do

        process_response do |resp|
          resp.data[:policy] = resp.http_response.body
        end

      end

      # Deletes the access policy for a bucket.
      # @overload delete_bucket_policy(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      bucket_method(:delete_bucket_policy, :delete, 'policy')

      # @overload set_bucket_versioning(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :state
      #   @option options [String] :mfa_delete
      #   @option options [String] :mfa
      #   @return [Core::Response]
      bucket_method(:set_bucket_versioning, :put, 'versioning', :header_options => { :mfa => "x-amz-mfa" }) do

        configure_request do |req, options|
          state = options[:state].to_s.downcase.capitalize
          unless state =~ /^(Enabled|Suspended)$/
            raise ArgumentError, "invalid versioning state `#{state}`"
          end

          # Leave validation of MFA options to S3
          mfa_delete = options[:mfa_delete].to_s.downcase.capitalize if options[:mfa_delete]

          # Generate XML request for versioning
          req.body = Nokogiri::XML::Builder.new do |xml|
            xml.VersioningConfiguration('xmlns' => XMLNS) do
              xml.Status(state)
              xml.MfaDelete(mfa_delete) if mfa_delete
            end
          end.doc.root.to_xml

          super(req, options)
        end

      end

      # Gets the bucket's location constraint.
      # @overload get_bucket_location(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      bucket_method(:get_bucket_location, :get, 'location') do

        process_response do |response|
          regex = />(.*)<\/LocationConstraint>/
          matches = response.http_response.body.to_s.match(regex)
          response.data[:location_constraint] = matches ? matches[1] : nil
        end

      end

      # @overload put_bucket_logging(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [Boolean] :logging_enabled Set to true if turning on
      #     bucket logging. If not set or false, all of the following options
      #     will be ignored.
      #   @option options [String] :target_bucket The name of the bucket in
      #     which you want Amazon S3 to store server access logs. You can push
      #     logs to any bucket you own, including the bucket being logged.
      #   @option options [String] :target_prefix Allows you to specify a prefix
      #     for the keys that the log files will be stored under. Recommended
      #     if you will be writing logs from multiple buckets to the same target
      #     bucket.
      #   @option options [Array<Hash>] :grants An array of hashes specifying
      #     permission grantees. For each hash, specify ONLY ONE of :id, :uri,
      #     or :email_address.
      #     * `:email_address` - (String) E-mail address of the person being
      #       granted logging permissions.
      #     * `:id` - (String) The canonical user ID of the grantee.
      #     * `:uri` - (String) URI of the grantee group.
      #     * `:permission` - (String) Logging permissions given to the Grantee
      #          for the bucket. The bucket owner is automatically granted FULL_CONTROL
      #          to all logs delivered to the bucket. This optional element enables
      #          you grant access to others. Valid Values: FULL_CONTROL | READ | WRITE
      #   @return [Core::Response]
      bucket_method(:put_bucket_logging, :put) do
        configure_request do |req, options|

          req.add_param('logging')

          xml = Nokogiri::XML::Builder.new
          xml.BucketLoggingStatus('xmlns' => XMLNS) do |xml|
            if options[:logging_enabled] == true
              xml.LoggingEnabled do
                xml.TargetBucket(options[:target_bucket])
                xml.TargetPrefix(options[:target_prefix])
                unless options[:grants].nil?

                  xml.TargetGrants do
                    options[:grants].each do |grant|
                      xml.Grant do
                        if !grant[:email_address].nil?
                          xml.Grantee('xmlns:xsi' => 'http://www.w3.org/2001/XMLSchema-instance',
                                  'xsi:type' => 'AmazonCustomerByEmail') do
                            xml.EmailAddress(grant[:email_address])
                          end
                        elsif !grant[:uri].nil?
                          xml.Grantee('xmlns:xsi' => 'http://www.w3.org/2001/XMLSchema-instance',
                                  'xsi:type' => 'Group') do
                            xml.URI(grant[:uri])
                          end
                        elsif !grant[:id].nil?
                          xml.Grantee('xmlns:xsi' => 'http://www.w3.org/2001/XMLSchema-instance',
                                  'xsi:type' => 'CanonicalUser') do
                            xml.ID(grant[:id])
                          end
                        end

                        xml.Permission(grant[:permission])
                      end
                    end
                  end
                end
              end
            end
          end

          xml = xml.doc.root.to_xml
          req.body = xml
          req.headers['content-md5'] = md5(xml)

          super(req, options)

        end
      end

      # Gets the bucket's logging status.
      # @overload get_bucket_logging(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      bucket_method(:get_bucket_logging, :get, 'logging',
        XML::GetBucketLogging)

      # @overload get_bucket_versioning(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      bucket_method(:get_bucket_versioning, :get, 'versioning',
        XML::GetBucketVersioning)

      # @overload list_object_versions(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [String] :prefix
      #   @option options [String] :delimiter
      #   @option options [String] :max_keys
      #   @option options [String] :key_marker
      #   @option options [String] :version_id_marker
      #   @return [Core::Response]
      bucket_method(:list_object_versions, :get, 'versions',
        XML::ListObjectVersions) do

        configure_request do |req, options|
          super(req, options)
          params = %w(delimiter key_marker max_keys prefix version_id_marker)
          params.each do |param|
            if options[param.to_sym]
              req.add_param(param.gsub(/_/, '-'), options[param.to_sym])
            end
          end
        end

      end

      # Sets the access control list for a bucket.  You must specify an ACL
      # via one of the following methods:
      #
      # * as a canned ACL (via `:acl`)
      # * as a list of grants (via the `:grant_*` options)
      # * as an access control policy document (via `:access_control_policy`)
      #
      # @example Using a canned acl
      #   s3_client.put_bucket_acl(
      #     :bucket_name => 'bucket-name',
      #     :acl => 'public-read')
      #
      # @example Using grants
      #   s3_client.put_bucket_acl(
      #     :bucket_name => 'bucket-name',
      #     :grant_read => 'uri="http://acs.amazonaws.com/groups/global/AllUsers"',
      #     :grant_full_control => 'emailAddress="xyz@amazon.com", id="8a9...fa7"')
      #
      # @example Using an access control policy document
      #   policy_xml = <<-XML
      #     <AccessControlPolicy xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
      #       <Owner>
      #         <ID>852b113e7a2f25102679df27bb0ae12b3f85be6BucketOwnerCanonicalUserID</ID>
      #         <DisplayName>OwnerDisplayName</DisplayName>
      #       </Owner>
      #       <AccessControlList>
      #         <Grant>
      #           <Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="CanonicalUser">
      #             <ID>BucketOwnerCanonicalUserID</ID>
      #             <DisplayName>OwnerDisplayName</DisplayName>
      #           </Grantee>
      #           <Permission>FULL_CONTROL</Permission>
      #         </Grant>
      #         <Grant>
      #           <Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="Group">
      #             <URI xmlns="">http://acs.amazonaws.com/groups/global/AllUsers</URI>
      #           </Grantee>
      #           <Permission xmlns="">READ</Permission>
      #         </Grant>
      #       </AccessControlList>
      #     </AccessControlPolicy>
      #
      #   XML
      #   s3_client.put_bucket_acl(
      #     :bucket_name => 'bucket-name',
      #     :access_control_policy => policy_xml)
      #
      # @overload put_bucket_acl(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [String] :access_control_policy An access control
      #     policy description as a string of XML.  See the S3 API
      #     documentation for a description.
      #   @option options [String] :acl A canned ACL (e.g. 'private',
      #     'public-read', etc).  See the S3 API documentation for
      #     a complete list of valid values.
      #   @option options [String] :grant_read
      #   @option options [String] :grant_write
      #   @option options [String] :grant_read_acp
      #   @option options [String] :grant_write_acp
      #   @option options [String] :grant_full_control
      #   @return [Core::Response]
      bucket_method(:put_bucket_acl, :put, 'acl', :header_options => {
        :acl => 'x-amz-acl',
        :grant_read => 'x-amz-grant-read',
        :grant_write => 'x-amz-grant-write',
        :grant_read_acp => 'x-amz-grant-read-acp',
        :grant_write_acp => 'x-amz-grant-write-acp',
        :grant_full_control => 'x-amz-grant-full-control',
      }) do

        configure_request do |req, options|
          move_access_control_policy(options)
          require_acl!(options)
          super(req, options)
          req.body = options[:access_control_policy] if
             options[:access_control_policy]
        end

      end
      alias_method :set_bucket_acl, :put_bucket_acl

      # Gets the access control list for a bucket.
      # @overload get_bucket_acl(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @return [Core::Response]
      bucket_method(:get_bucket_acl, :get, 'acl', XML::GetBucketAcl)

      # Sets the access control list for an object.  You must specify an ACL
      # via one of the following methods:
      #
      # * as a canned ACL (via `:acl`)
      # * as a list of grants (via the `:grant_*` options)
      # * as an access control policy document (via `:access_control_policy`)
      #
      # @example Using a canned acl
      #   s3_client.put_object_acl(
      #     :bucket_name => 'bucket-name',
      #     :key => 'object-key',
      #     :acl => 'public-read')
      #
      # @example Using grants
      #   s3_client.put_bucket_acl(
      #     :bucket_name => 'bucket-name',
      #     :key => 'object-key',
      #     :grant_read => 'uri="http://acs.amazonaws.com/groups/global/AllUsers"',
      #     :grant_full_control => 'emailAddress="xyz@amazon.com", id="8a9...fa7"')
      #
      # @example Using an access control policy document
      #   policy_xml = <<-XML
      #     <AccessControlPolicy xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
      #       <Owner>
      #         <ID>852b113e7a2f25102679df27bb0ae12b3f85be6BucketOwnerCanonicalUserID</ID>
      #         <DisplayName>OwnerDisplayName</DisplayName>
      #       </Owner>
      #       <AccessControlList>
      #         <Grant>
      #           <Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="CanonicalUser">
      #             <ID>BucketOwnerCanonicalUserID</ID>
      #             <DisplayName>OwnerDisplayName</DisplayName>
      #           </Grantee>
      #           <Permission>FULL_CONTROL</Permission>
      #         </Grant>
      #         <Grant>
      #           <Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="Group">
      #             <URI xmlns="">http://acs.amazonaws.com/groups/global/AllUsers</URI>
      #           </Grantee>
      #           <Permission xmlns="">READ</Permission>
      #         </Grant>
      #       </AccessControlList>
      #     </AccessControlPolicy>
      #
      #   XML
      #   s3_client.put_bucket_acl(
      #     :bucket_name => 'bucket-name',
      #     :key => 'object-key',
      #     :access_control_policy => policy_xml)
      #
      # @overload put_object_acl(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :key
      #   @option options [String] :access_control_policy An access control
      #     policy description as a string of XML.  See the S3 API
      #     documentation for a description.
      #   @option options [String] :acl A canned ACL (e.g. 'private',
      #     'public-read', etc).  See the S3 API documentation for
      #     a complete list of valid values.
      #   @option options [String] :grant_read
      #   @option options [String] :grant_write
      #   @option options [String] :grant_read_acp
      #   @option options [String] :grant_write_acp
      #   @option options [String] :grant_full_control
      #   @return [Core::Response]
      object_method(:put_object_acl, :put, 'acl', :header_options => {
        :acl => 'x-amz-acl',
        :grant_read => 'x-amz-grant-read',
        :grant_write => 'x-amz-grant-write',
        :grant_read_acp => 'x-amz-grant-read-acp',
        :grant_write_acp => 'x-amz-grant-write-acp',
        :grant_full_control => 'x-amz-grant-full-control',
      }) do

        configure_request do |req, options|
          move_access_control_policy(options)
          require_acl!(options)
          super(req, options)
          req.body = options[:access_control_policy] if
             options[:access_control_policy]
        end

      end
      alias_method :set_object_acl, :put_object_acl

      # Gets the access control list for an object.
      # @overload get_object_acl(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :key
      #   @return [Core::Response]
      object_method(:get_object_acl, :get, 'acl', XML::GetBucketAcl)

      # Puts data into an object, replacing the current contents.
      #
      #   s3_client.put_object({
      #     :bucket_name => 'bucket-name',
      #     :key => 'readme.txt',
      #     :data => 'This is the readme for ...',
      #   })
      #
      # @overload put_object(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :key
      #   @option options [required,String,Pathname,File,IO] :data
      #     The data to upload.  This can be provided as a string,
      #     a Pathname object, or any object that responds to
      #     `#read` and `#eof?` (e.g. IO, File, Tempfile, StringIO, etc).
      #   @option options [Integer] :content_length
      #     Required if you are using block form to write data or if it is
      #     not possible to determine the size of `:data`.  A best effort
      #     is made to determine the content length of strings, files,
      #     tempfiles, io objects, and any object that responds
      #     to `#length` or `#size`.
      #   @option options [String] :website_redirect_location If the bucket is
      #     configured as a website, redirects requests for this object to
      #     another object in the same bucket or to an external URL.
      #   @option options [Hash] :metadata
      #     A hash of metadata to be included with the
      #     object.  These will be sent to S3 as headers prefixed with
      #     `x-amz-meta`.
      #   @option options [Symbol] :acl (:private) A canned access
      #     control policy.  Accepted values include:
      #     * `:private`
      #     * `:public_read`
      #     * ...
      #   @option options [String] :storage_class+ ('STANDARD')
      #     Controls whether Reduced Redundancy Storage is enabled for
      #     the object.  Valid values are 'STANDARD' and
      #     'REDUCED_REDUNDANCY'.
      #   @option options [Symbol,String] :server_side_encryption (nil) The
      #     algorithm used to encrypt the object on the server side
      #     (e.g. :aes256).
      #   object on the server side, e.g. `:aes256`)
      #   @option options [String] :cache_control
      #     Can be used to specify caching behavior.
      #   @option options [String] :content_disposition
      #     Specifies presentational information.
      #   @option options [String] :content_encoding
      #     Specifies the content encoding.
      #   @option options [String] :content_md5
      #     The base64 encoded content md5 of the `:data`.
      #   @option options [String] :content_type
      #     Specifies the content type.
      #   @option options [String] :expires The date and time at which the
      #     object is no longer cacheable.
      #   @option options [String] :acl A canned ACL (e.g. 'private',
      #     'public-read', etc).  See the S3 API documentation for
      #     a complete list of valid values.
      #   @option options [String] :grant_read
      #   @option options [String] :grant_write
      #   @option options [String] :grant_read_acp
      #   @option options [String] :grant_write_acp
      #   @option options [String] :grant_full_control
      #   @option options [String] :sse_customer_algorithm Specifies the
      #     algorithm to use to when encrypting the object (e.g., AES256).
      #   @option options [String] :sse_customer_key Specifies the
      #     customer-provided encryption key for Amazon S3 to use in encrypting
      #     data. This value is used to store the object and then it is
      #     discarded; Amazon does not store the encryption key. The key must be
      #     appropriate for use with the algorithm specified in the
      #     `:sse_customer_algorithm` header.
      #   @option options [String] :sse_customer_key_md5 Specifies the 128-bit
      #     MD5 digest of the encryption key according to RFC 1321. Amazon S3
      #     uses this header for a message integrity check to ensure the
      #     encryption key was transmitted without error.
      #   @return [Core::Response]
      #
      object_method(:put_object, :put, :header_options => {
        :website_redirect_location => 'x-amz-website-redirect-location',
        :acl => 'x-amz-acl',
        :grant_read => 'x-amz-grant-read',
        :grant_write => 'x-amz-grant-write',
        :grant_read_acp => 'x-amz-grant-read-acp',
        :grant_write_acp => 'x-amz-grant-write-acp',
        :grant_full_control => 'x-amz-grant-full-control',
        :content_md5 => 'Content-MD5',
        :cache_control => 'Cache-Control',
        :content_disposition => 'Content-Disposition',
        :content_encoding => 'Content-Encoding',
        :content_type => 'Content-Type',
        :expires => 'Expires',
        :sse_customer_algorithm => 'x-amz-server-side-encryption-customer-algorithm',
        :sse_customer_key => 'x-amz-server-side-encryption-customer-key',
        :sse_customer_key_md5 => 'x-amz-server-side-encryption-customer-key-MD5',
      }) do

        configure_request do |request, options|

          options = compute_write_options(options)
          set_body_stream_and_content_length(request, options)

          set_metadata(request, options)
          set_storage_class(request, options)
          set_server_side_encryption(request, options)

          super(request, options)

        end

        process_response do |resp|
          extract_object_headers(resp)
        end

        simulate_response do |response|
          response.data[:etag] = 'abc123'
          response.data[:version_id] = nil
        end

      end

      # Gets the data for a key.
      # @overload get_object(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :key
      #   @option options [String] :request_payer If specified, the request
      #     will contain the specified String value in the x-amz-request-payer
      #     header. This is required for Requester Pays enabled buckets.
      #   @option options [Time] :if_modified_since If specified, the
      #     response will contain an additional `:modified` value that
      #     returns true if the object was modified after the given
      #     time.  If `:modified` is false, then the response
      #     `:data` value will be `nil`.
      #   @option options [Time] :if_unmodified_since If specified, the
      #     response will contain an additional `:unmodified` value
      #     that is true if the object was not modified after the
      #     given time.  If `:unmodified` returns false, the `:data`
      #     value will be `nil`.
      #   @option options [String] :if_match If specified, the response
      #     will contain an additional `:matches` value that is true
      #     if the object ETag matches the value for this option.  If
      #     `:matches` is false, the `:data` value of the
      #     response will be `nil`.
      #   @option options [String] :if_none_match If specified, the
      #     response will contain an additional `:matches` value that
      #     is true if and only if the object ETag matches the value for
      #     this option.  If `:matches` is true, the `:data` value
      #     of the response will be `nil`.
      #   @option options [String] :sse_customer_algorithm Specifies the
      #     algorithm to use to when encrypting the object (e.g., AES256).
      #   @option options [String] :sse_customer_key Specifies the
      #     customer-provided encryption key for Amazon S3 to use in encrypting
      #     data. This value is used to store the object and then it is
      #     discarded; Amazon does not store the encryption key. The key must be
      #     appropriate for use with the algorithm specified in the
      #     `:sse_customer_algorithm` header.
      #   @option options [String] :sse_customer_key_md5 Specifies the 128-bit
      #     MD5 digest of the encryption key according to RFC 1321. Amazon S3
      #     uses this header for a message integrity check to ensure the
      #     encryption key was transmitted without error.
      #   @option options [Range<Integer>] :range A byte range of data to request.
      #   @return [Core::Response]
      #
      object_method(:get_object, :get,
                    :header_options => {
                      :request_payer => "x-amz-request-payer",
                      :if_modified_since => "If-Modified-Since",
                      :if_unmodified_since => "If-Unmodified-Since",
                      :if_match => "If-Match",
                      :if_none_match => "If-None-Match",
                      :sse_customer_algorithm => 'x-amz-server-side-encryption-customer-algorithm',
                      :sse_customer_key => 'x-amz-server-side-encryption-customer-key',
                      :sse_customer_key_md5 => 'x-amz-server-side-encryption-customer-key-MD5',
                    }) do
        configure_request do |req, options|

          super(req, options)

          if options[:version_id]
            req.add_param('versionId', options[:version_id])
          end

          ["If-Modified-Since",
           "If-Unmodified-Since"].each do |date_header|
            case value = req.headers[date_header]
            when DateTime
              req.headers[date_header] = Time.parse(value.to_s).rfc2822
            when Time
              req.headers[date_header] = value.rfc2822
            end
          end

          if options[:range]
            range = options[:range]
            if range.is_a?(Range)
              offset = range.exclude_end? ? -1 : 0
              range = "bytes=#{range.first}-#{range.last + offset}"
            end
            req.headers['Range'] = range
          end

        end

        process_response do |resp|
          extract_object_headers(resp)
          resp.data[:data] = resp.http_response.body
        end

      end

      # Gets the torrent for a key.
      # @overload get_object_torrent(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :key
      #   @return [Core::Response]
      #
      object_method(:get_object_torrent, :get, 'torrent') do
        process_response do |resp|
          extract_object_headers(resp)
          resp.data[:data] = resp.http_response.body
        end
      end

      # @overload head_object(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :key
      #   @option options [String] :version_id
      #   @option options [Time] :if_modified_since If specified, the
      #     response will contain an additional `:modified` value that
      #     returns true if the object was modified after the given
      #     time.  If `:modified` is false, then the response
      #     `:data` value will be `nil`.
      #   @option options [Time] :if_unmodified_since If specified, the
      #     response will contain an additional `:unmodified` value
      #     that is true if the object was not modified after the
      #     given time.  If `:unmodified` returns false, the `:data`
      #     value will be `nil`.
      #   @option options [String] :if_match If specified, the response
      #     will contain an additional `:matches` value that is true
      #     if the object ETag matches the value for this option.  If
      #     `:matches` is false, the `:data` value of the
      #     response will be `nil`.
      #   @option options [String] :if_none_match If specified, the
      #     response will contain an additional `:matches` value that
      #     is true if and only if the object ETag matches the value for
      #     this option.  If `:matches` is true, the `:data` value
      #     of the response will be `nil`.
      #   @option options [String] :sse_customer_algorithm Specifies the
      #     algorithm to use to when encrypting the object (e.g., AES256).
      #   @option options [String] :sse_customer_key Specifies the
      #     customer-provided encryption key for Amazon S3 to use in encrypting
      #     data. This value is used to store the object and then it is
      #     discarded; Amazon does not store the encryption key. The key must be
      #     appropriate for use with the algorithm specified in the
      #     `:sse_customer_algorithm` header.
      #   @option options [String] :sse_customer_key_md5 Specifies the 128-bit
      #     MD5 digest of the encryption key according to RFC 1321. Amazon S3
      #     uses this header for a message integrity check to ensure the
      #     encryption key was transmitted without error.
      #   @option options [Range<Integer>] :range A byte range of data to request.
      #   @return [Core::Response]
      object_method(:head_object, :head,
                    :header_options => {
                      :if_modified_since => "If-Modified-Since",
                      :if_unmodified_since => "If-Unmodified-Since",
                      :if_match => "If-Match",
                      :if_none_match => "If-None-Match",
                      :sse_customer_algorithm => 'x-amz-server-side-encryption-customer-algorithm',
                      :sse_customer_key => 'x-amz-server-side-encryption-customer-key',
                      :sse_customer_key_md5 => 'x-amz-server-side-encryption-customer-key-MD5',
                    }) do

        configure_request do |req, options|
          super(req, options)
          if options[:version_id]
            req.add_param('versionId', options[:version_id])
          end

          ["If-Modified-Since",
           "If-Unmodified-Since"].each do |date_header|
            case value = req.headers[date_header]
            when DateTime
              req.headers[date_header] = Time.parse(value.to_s).rfc2822
            when Time
              req.headers[date_header] = value.rfc2822
            end
          end

          if options[:range]
            range = options[:range]
            if range.is_a?(Range)
              offset = range.exclude_end? ? -1 : 0
              range = "bytes=#{range.first}-#{range.last + offset}"
            end
            req.headers['Range'] = range
          end
        end

        process_response do |resp|
          extract_object_headers(resp)
        end

      end

      # @overload delete_object(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :key
      #   @option options [String] :version_id
      #   @option options [String] :mfa
      #   @return [Core::Response]
      object_method(:delete_object, :delete, :header_options => { :mfa => "x-amz-mfa" }) do

        configure_request do |req, options|
          super(req, options)
          if options[:version_id]
            req.add_param('versionId', options[:version_id])
          end
        end

        process_response do |resp|
          resp.data[:version_id] = resp.http_response.header('x-amz-version-id')
        end

      end

      # @overload restore_object(options = {})
      #   Restores a temporary copy of an archived object.
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :key
      #   @option options [required,Integer] :days the number of days to keep
      #     the restored object.
      #   @return [Core::Response]
      # @since 1.7.2
      object_method(:restore_object, :post, 'restore',
          :header_options => { :content_md5 => 'Content-MD5' }) do
        configure_request do |req, options|
          super(req, options)

          validate!(:days, options[:days]) do
            "must be greater or equal to 1" if options[:days].to_i <= 0
          end

          xml = Nokogiri::XML::Builder.new do |xml|
            xml.RestoreRequest('xmlns' => XMLNS) do
              xml.Days(options[:days].to_i) if options[:days]
            end
          end.doc.root.to_xml

          req.body = xml
          req.headers['content-type'] = 'application/xml'
          req.headers['content-md5'] = md5(xml)
        end
      end


      # @overload list_objects(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [String] :delimiter
      #   @option options [String] :marker
      #   @option options [String] :max_keys
      #   @option options [String] :prefix
      #   @return [Core::Response]
      bucket_method(:list_objects, :get, XML::ListObjects) do
        configure_request do |req, options|
          super(req, options)
          params = %w(delimiter marker max_keys prefix)
          params.each do |param|
            if options[param.to_sym]
              req.add_param(param.gsub(/_/, '-'), options[param.to_sym])
            end
          end
        end
      end

      alias_method :get_bucket, :list_objects

      # @overload initiate_multipart_upload(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :key
      #   @option options [String] :website_redirect_location If the bucket is
      #     configured as a website, redirects requests for this object to
      #     another object in the same bucket or to an external URL.
      #   @option options [Hash] :metadata
      #   @option options [Symbol] :acl
      #   @option options [String] :cache_control
      #   @option options [String] :content_disposition
      #   @option options [String] :content_encoding
      #   @option options [String] :content_type
      #   @option options [String] :storage_class+ ('STANDARD')
      #     Controls whether Reduced Redundancy Storage is enabled for
      #     the object.  Valid values are 'STANDARD' and
      #     'REDUCED_REDUNDANCY'.
      #   @option options [Symbol,String] :server_side_encryption (nil) The
      #     algorithm used to encrypt the object on the server side
      #     (e.g. :aes256).
      #   @option options [String] :expires The date and time at which the
      #     object is no longer cacheable.
      #   @option options [String] :acl A canned ACL (e.g. 'private',
      #     'public-read', etc).  See the S3 API documentation for
      #     a complete list of valid values.
      #   @option options [String] :grant_read
      #   @option options [String] :grant_write
      #   @option options [String] :grant_read_acp
      #   @option options [String] :grant_write_acp
      #   @option options [String] :grant_full_control
      #   @option options [String] :sse_customer_algorithm Specifies the
      #     algorithm to use to when encrypting the object (e.g., AES256).
      #   @option options [String] :sse_customer_key Specifies the
      #     customer-provided encryption key for Amazon S3 to use in encrypting
      #     data. This value is used to store the object and then it is
      #     discarded; Amazon does not store the encryption key. The key must be
      #     appropriate for use with the algorithm specified in the
      #     `:sse_customer_algorithm` header.
      #   @option options [String] :sse_customer_key_md5 Specifies the 128-bit
      #     MD5 digest of the encryption key according to RFC 1321. Amazon S3
      #     uses this header for a message integrity check to ensure the
      #     encryption key was transmitted without error.
      #   @return [Core::Response]
      object_method(:initiate_multipart_upload, :post, 'uploads',
                    XML::InitiateMultipartUpload,
                    :header_options => {
                      :website_redirect_location => 'x-amz-website-redirect-location',
                      :acl => 'x-amz-acl',
                      :grant_read => 'x-amz-grant-read',
                      :grant_write => 'x-amz-grant-write',
                      :grant_read_acp => 'x-amz-grant-read-acp',
                      :grant_write_acp => 'x-amz-grant-write-acp',
                      :grant_full_control => 'x-amz-grant-full-control',
                      :cache_control => 'Cache-Control',
                      :content_disposition => 'Content-Disposition',
                      :content_encoding => 'Content-Encoding',
                      :content_type => 'Content-Type',
                      :expires => 'Expires',
                      :sse_customer_algorithm => 'x-amz-server-side-encryption-customer-algorithm',
                      :sse_customer_key => 'x-amz-server-side-encryption-customer-key',
                      :sse_customer_key_md5 => 'x-amz-server-side-encryption-customer-key-MD5',
                    }) do

        configure_request do |req, options|
          set_metadata(req, options)
          set_storage_class(req, options)
          set_server_side_encryption(req, options)
          super(req, options)
        end

        process_response do |resp|
          extract_object_headers(resp)
        end

      end

      # @overload list_multipart_uploads(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [String] :delimiter
      #   @option options [String] :key_marker
      #   @option options [String] :max_keys
      #   @option options [String] :upload_id_marker
      #   @option options [String] :max_uploads
      #   @option options [String] :prefix
      #   @return [Core::Response]
      bucket_method(:list_multipart_uploads,
                    :get, 'uploads',
                    XML::ListMultipartUploads) do
        configure_request do |req, options|
          super(req, options)
          params = %w(delimiter key_marker max_keys) +
            %w(upload_id_marker max_uploads prefix)
          params.each do |param|
            if options[param.to_sym]
              req.add_param(param.gsub(/_/, '-'), options[param.to_sym])
            end
          end
        end
      end

      # @overload delete_objects(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,Array<Hash>] :objects Each entry should be
      #     a hash with the following keys:
      #     * `:key` - *required*
      #     * `:version_id`
      #   @option options [Boolean] :quiet (true)
      #   @option options [String] :mfa
      #   @return [Core::Response]
      bucket_method(:delete_objects, :post, 'delete', XML::DeleteObjects,
        :header_options => { :mfa => "x-amz-mfa" }
      ) do

        configure_request do |req, options|

          super(req, options)

          req.body = Nokogiri::XML::Builder.new do |xml|
            xml.Delete do
              xml.Quiet(options.key?(:quiet) ? options[:quiet] : true)
              (options[:objects] || options[:keys]).each do |obj|
                xml.Object do
                  xml.Key(obj[:key])
                  xml.VersionId(obj[:version_id]) if obj[:version_id]
                end
              end
            end
          end.doc.root.to_xml

          req.headers['content-md5'] = md5(req.body)

        end
      end

      # @overload upload_part(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :key
      #   @option options [required,String] :upload_id
      #   @option options [required,Integer] :part_number
      #   @option options [required,String,Pathname,File,IO] :data
      #     The data to upload.  This can be provided as a string,
      #     a Pathname object, or any object that responds to
      #     `#read` and `#eof?` (e.g. IO, File, Tempfile, StringIO, etc).
      #   @return [Core::Response]
      object_method(:upload_part, :put,
                    :header_options => {
                      :content_md5 => 'Content-MD5',
                      :sse_customer_algorithm => 'x-amz-server-side-encryption-customer-algorithm',
                      :sse_customer_key => 'x-amz-server-side-encryption-customer-key',
                      :sse_customer_key_md5 => 'x-amz-server-side-encryption-customer-key-MD5',
                    }) do
        configure_request do |request, options|

          options = compute_write_options(options)
          set_body_stream_and_content_length(request, options)

          require_upload_id!(options[:upload_id])
          request.add_param('uploadId', options[:upload_id])

          require_part_number!(options[:part_number])
          request.add_param('partNumber', options[:part_number])

          super(request, options)

        end

        process_response do |resp|
          extract_object_headers(resp)
        end

        simulate_response do |response|
          response.data[:etag] = 'abc123'
        end
      end

      # @overload complete_multipart_upload(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :key
      #   @option options [required,String] :upload_id
      #   @option options [required,Array<Hash>] :parts An array of hashes
      #     with the following keys:
      #     * `:part_number` [Integer] - *required*
      #     * `:etag` [String] - *required*
      #   @return [Core::Response]
      object_method(:complete_multipart_upload, :post,
                    XML::CompleteMultipartUpload) do
        configure_request do |req, options|
          require_upload_id!(options[:upload_id])
          validate_parts!(options[:parts])
          super(req, options)
          req.add_param('uploadId', options[:upload_id])

          req.body = Nokogiri::XML::Builder.new do |xml|
            xml.CompleteMultipartUpload do
              options[:parts].each do |part|
                xml.Part do
                  xml.PartNumber(part[:part_number])
                  xml.ETag(part[:etag])
                end
              end
            end
          end.doc.root.to_xml

        end

        process_response do |resp|
          extract_object_headers(resp)
        end

        simulate_response do |response|
          response.data = {}
        end

      end

      # @overload abort_multipart_upload(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :key
      #   @option options [required,String] :upload_id
      #   @return [Core::Response]
      object_method(:abort_multipart_upload, :delete) do
        configure_request do |req, options|
            require_upload_id!(options[:upload_id])
          super(req, options)
          req.add_param('uploadId', options[:upload_id])
        end
      end

      # @overload list_parts(options = {})
      #   @param [Hash] options
      #   @option options [required,String] :bucket_name
      #   @option options [required,String] :key
      #   @option options [required,String] :upload_id
      #   @option options [Integer] :max_parts
      #   @option options [Integer] :part_number_marker
      #   @return [Core::Response]
      object_method(:list_parts, :get, XML::ListParts) do

        configure_request do |req, options|
            require_upload_id!(options[:upload_id])
          super(req, options)
          req.add_param('uploadId', options[:upload_id])
          req.add_param('max-parts', options[:max_parts])
          req.add_param('part-number-marker', options[:part_number_marker])
        end

      end

      # Copies an object from one key to another.
      # @overload copy_object(options = {})
      #   @param [Hash] options
      #   @option options [required, String] :bucket_name Name of the bucket
      #     to copy a object into.
      #   @option options [required, String] :key Where (object key) in the
      #     bucket the object should be copied to.
      #   @option options [String] :website_redirect_location If the bucket is
      #     configured as a website, redirects requests for this object to
      #     another object in the same bucket or to an external URL.
      #   @option options [required, String] :copy_source The source
      #     bucket name and key, joined by a forward slash ('/').
      #     This string must be URL-encoded. Additionally, you must
      #     have read access to the source object.
      #   @option options [String] :acl A canned ACL (e.g. 'private',
      #     'public-read', etc).  See the S3 API documentation for
      #     a complete list of valid values.
      #   @option options [Symbol,String] :server_side_encryption (nil) The
      #     algorithm used to encrypt the object on the server side
      #     (e.g. :aes256).
      #   @option options [String] :storage_class+ ('STANDARD')
      #     Controls whether Reduced Redundancy Storage is enabled for
      #     the object.  Valid values are 'STANDARD' and
      #     'REDUCED_REDUNDANCY'.
      #   @option options [String] :metadata_directive ('COPY') Specify 'COPY' or
      #     'REPLACE'.
      #   @option options [String] :content_type
      #   @option options [String] :content_encoding
      #   @option options [String] :content_disposition
      #   @option options [String] :cache_control
      #   @option options [String] :expires The date and time at which the
      #     object is no longer cacheable.
      #   @option options [String] :grant_read
      #   @option options [String] :grant_write
      #   @option options [String] :grant_read_acp
      #   @option options [String] :grant_write_acp
      #   @option options [String] :grant_full_control
      #   @option options [String] :sse_customer_algorithm Specifies the
      #     algorithm to use to when encrypting the object (e.g., AES256).
      #   @option options [String] :sse_customer_key Specifies the
      #     customer-provided encryption key for Amazon S3 to use in encrypting
      #     data. This value is used to store the object and then it is
      #     discarded; Amazon does not store the encryption key. The key must be
      #     appropriate for use with the algorithm specified in the
      #     `:sse_customer_algorithm` header.
      #   @option options [String] :sse_customer_key_md5 Specifies the 128-bit
      #     MD5 digest of the encryption key according to RFC 1321. Amazon S3
      #     uses this header for a message integrity check to ensure the
      #     encryption key was transmitted without error.
      #   @option options [String] :copy_source_sse_customer_algorithm Specifies
      #     the algorithm to use when decrypting the source object (e.g.,
      #     AES256).
      #   @option options [String] :copy_source_sse_customer_key Specifies the
      #     customer-provided encryption key for Amazon S3 to use to decrypt the
      #     source object. The encryption key provided in this header must be
      #     one that was used when the source object was created.
      #   @option options [String] :copy_source_sse_customer_key_md5 Specifies
      #     the 128-bit MD5 digest of the encryption key according to RFC 1321.
      #     Amazon S3 uses this header for a message integrity check to ensure
      #     the encryption key was transmitted without error.
      #   @return [Core::Response]
      object_method(:copy_object, :put, :header_options => {
        :website_redirect_location => 'x-amz-website-redirect-location',
        :acl => 'x-amz-acl',
        :grant_read => 'x-amz-grant-read',
        :grant_write => 'x-amz-grant-write',
        :grant_read_acp => 'x-amz-grant-read-acp',
        :grant_write_acp => 'x-amz-grant-write-acp',
        :grant_full_control => 'x-amz-grant-full-control',
        :copy_source => 'x-amz-copy-source',
        :cache_control => 'Cache-Control',
        :metadata_directive => 'x-amz-metadata-directive',
        :content_type => 'Content-Type',
        :content_encoding => 'Content-Encoding',
        :content_disposition => 'Content-Disposition',
        :expires => 'Expires',
        :sse_customer_algorithm => 'x-amz-server-side-encryption-customer-algorithm',
        :sse_customer_key => 'x-amz-server-side-encryption-customer-key',
        :sse_customer_key_md5 => 'x-amz-server-side-encryption-customer-key-MD5',
        :copy_source_sse_customer_algorithm => 'x-amz-copy-source-server-side-encryption-customer-algorithm',
        :copy_source_sse_customer_key => 'x-amz-copy-source-server-side-encryption-customer-key',
        :copy_source_sse_customer_key_md5 => 'x-amz-copy-source-server-side-encryption-customer-key-MD5',
      }) do

        configure_request do |req, options|

          validate!(:copy_source, options[:copy_source]) do
            "may not be blank" if options[:copy_source].to_s.empty?
          end

          options = options.merge(:copy_source => escape_path(options[:copy_source]))
          super(req, options)
          set_metadata(req, options)
          set_storage_class(req, options)
          set_server_side_encryption(req, options)

          if options[:version_id]
            req.headers['x-amz-copy-source'] += "?versionId=#{options[:version_id]}"
          end
        end

        process_response do |resp|
          extract_object_headers(resp)
        end

      end

      object_method(:copy_part, :put, XML::CopyPart, :header_options => {
        :copy_source => 'x-amz-copy-source',
        :copy_source_range => 'x-amz-copy-source-range',
      }) do

        configure_request do |request, options|

          validate!(:copy_source, options[:copy_source]) do
            "may not be blank" if options[:copy_source].to_s.empty?
          end

          validate!(:copy_source_range, options[:copy_source_range]) do
            "must start with bytes=" if options[:copy_source_range] && !options[:copy_source_range].start_with?("bytes=")
          end

          options = options.merge(:copy_source => escape_path(options[:copy_source]))

          require_upload_id!(options[:upload_id])
          request.add_param('uploadId', options[:upload_id])

          require_part_number!(options[:part_number])
          request.add_param('partNumber', options[:part_number])

          super(request, options)

          if options[:version_id]
            req.headers['x-amz-copy-source'] += "?versionId=#{options[:version_id]}"
          end

        end

      end

    end
  end
end
