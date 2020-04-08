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

    # Represents a single CORS rule for an S3 {Bucket}.
    #
    # @example
    #
    #   rule = bucket.cors.first
    #   rule.allowed_methods #=> ['GET', 'HEAD']
    #   rule.allowed_origins #=> ['*']
    #
    # @see CORSRuleCollection
    class CORSRule

      # @param [Hash] options A hash of the rule details.
      #
      # @option options [String] :id A unique identifier for the rule. The ID
      #   value can be up to 255 characters long. The IDs help you find
      #   a rule in the configuration.
      #
      # @option options [required,Array<String>] :allowed_methods A list of HTTP
      #   methods that you want to allow the origin to execute.
      #   Each rule must identify at least one method.
      #
      # @option options [required,Array<String>] :allowed_origins A list of
      #   origins you want to allow cross-domain requests from. This can
      #   contain at most one * wild character.
      #
      # @option options [Array<String>] :allowed_headers A list of headers
      #   allowed in a pre-flight OPTIONS request via the
      #   Access-Control-Request-Headers header. Each header name
      #   specified in the Access-Control-Request-Headers header must
      #   have a corresponding entry in the rule.
      #
      #   Amazon S3 will send only the allowed headers in a response
      #   that were requested. This can contain at most one '*' wild
      #   character.
      #
      # @option options [Array<String>] :max_age_seconds The time in
      #   seconds that your browser is to cache the pre-flight response for
      #   the specified resource.
      #
      # @option options [Array<String>] :expose_headers One or more headers in
      #    the response that you want customers to be able to access
      #    from their applications (for example, from a JavaScript
      #    XMLHttpRequest object).
      #
      def initialize options = {}
        @id = options[:id]
        @allowed_methods = options[:allowed_methods] || []
        @allowed_origins = options[:allowed_origins] || []
        @allowed_headers = options[:allowed_headers] || []
        @max_age_seconds = options[:max_age_seconds]
        @expose_headers = options[:expose_headers] || []
      end

      # @return [String,nil] A user supplied unique identifier for this role.
      #   Set this when you set or add roles via {CORSRuleCollection}.
      attr_reader :id

      # @return [Array<String>] A list of HTTP methods (GET, POST, etc) this
      #   role authorizes.
      attr_reader :allowed_methods

      # @return [Array<String>] The list of origins allowed to make
      #   cross-domain requests to the bucket.
      attr_reader :allowed_origins

      # @return [Array<String>] A list of headers allowed in the pre-flight
      #   OPTIONS request.
      attr_reader :allowed_headers

      # @return [Integer,nil] The time in seconds the browser may cache the
      #   pre-flight response.
      attr_reader :max_age_seconds

      # @return [Array<String>] The headers that may be accessed cross-domain.
      attr_reader :expose_headers

      # @return [Hash]
      def to_h
        h = {}
        h[:id] = id if id
        h[:allowed_methods] = allowed_methods
        h[:allowed_origins] = allowed_origins
        h[:allowed_headers] = allowed_headers unless allowed_headers.empty?
        h[:max_age_seconds] = max_age_seconds if max_age_seconds
        h[:expose_headers] = expose_headers unless expose_headers.empty?
        h
      end

    end

  end
end
