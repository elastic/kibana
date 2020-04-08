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
    class WebsiteConfiguration

      # @option options [Hash] :redirect_all_requests_to
      #   Describes the redirect behavior for every request to this
      #   bucket's website endpoint. If this element is present, no
      #   other options are are allowed.
      #   * `:host_name` - (*required*, String)
      #     Name of the host where requests will be redirected.
      #   * `:protocol` - (String)
      #     Protocol to use (http, https) when redirecting requests. The
      #     default is the protocol that is used in the original request.
      # @option options [Hash] :index_document
      #   * `:suffix` - (*required*, String) - A suffix that is appended to
      #     a request that is for a directory on the website endpoint
      #     (e.g. if the suffix is index.html and you make a request to
      #     samplebucket/images/ the data that is returned will be for
      #     the object with the key name images/index.html).
      #     The suffix must not be empty and must not include a
      #     slash character.
      # @option options [Hash] :error_document
      #   * `:key` - (*required*, String) - The object key name to use
      #     when a 4XX class error occurs.
      # @option options [Array<Hash>] :routing_rules
      #   * `:redirect` - (*required*, Hash)
      #     * `:host_name` - (String)
      #     * `:protocol` - (String)
      #     * `:replace_key_prefix_with` - (String)
      #     * `:replace_key_with` - (String)
      #     * `:http_redirect_code` - (String)
      #   * `:condition` - (Hash)
      #     * `:key_prefix_equals` - (String)
      #     * `:http_error_code_returned_equals` - (String)
      def initialize options = {}
        @options = deep_copy(options)
        if @options.empty?
          @options[:index_document] = { :suffix => 'index.html' }
          @options[:error_document] = { :key => 'error.html' }
        end
      end

      # @return [Hash]
      attr_reader :options

      alias_method :to_hash, :options

      # This method exists for backwards compatability.
      # @return [String,nil]
      # @api private
      def index_document_suffix
        (@options[:index_document] || {})[:suffix]
      end

      # This method exists for backwards compatability.
      # @api private
      def index_document_suffix= suffix
        @options.delete(:redirect_all_requests_to)
        @options[:index_document] ||= {}
        @options[:index_document][:suffix] = suffix
      end

      # This method exists for backwards compatability.
      # @return [String,nil]
      # @api private
      def error_document_key
        (@options[:error_document] || {})[:key]
      end

      # This method exists for backwards compatability.
      # @api private
      def error_document_key= key
        @options.delete(:redirect_all_requests_to)
        @options[:error_document] ||= {}
        @options[:error_document][:key] = key
      end

      private

      def deep_copy hash
        Marshal.load(Marshal.dump(hash))
      end

    end
  end
end
