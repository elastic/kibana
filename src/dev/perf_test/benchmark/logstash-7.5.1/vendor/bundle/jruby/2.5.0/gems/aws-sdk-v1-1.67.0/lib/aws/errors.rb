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

  # # Errors
  #
  # There are two basic types of errors:
  #
  # * {ClientError}
  # * {ServerError}
  #
  # ## Client Errors
  #
  # Errors in the three and four hundreds are client errors ({ClientError}).
  # A client error should not be resent without changes.  The body of the
  # http response (the error #message) should give more information about
  # the nature of the problem.
  #
  # ## Server Errors
  #
  # A 500 level error typically indicates the service is having an issue.
  #
  # Requests that generate service errors are automatically retried with
  # an exponential backoff.  If the service still fails to respond with
  # a 200 after 3 retries the error is raised.
  #
  module Errors

    # Base class for all errors returned by the service.
    class Base < StandardError

      # @overload new(error_message)
      #   @param [String] error_message The body of the error message
      #
      # @overload new(http_request, http_response, code = nil, message = nil)
      #   @param [Http::Request] http_request
      #   @param [Http::Response] http_response
      #   @param [String] code (nil)
      #   @param [String] message (nil)
      #
      def initialize req = nil, resp = nil, code = nil, message = nil
        if req.is_a?(String) or req.nil?
          super(req)
        else
          @http_request = req
          @http_response = resp
          @code = code
          include_error_type
          super(message || http_response.body)
        end
      end

      # @return [String] The response code given by the service.
      attr_reader :code

      # @return [Http::Request] The low level http request that caused the
      #   error to be raised.
      attr_reader :http_request

      # @return [Http::Response] The low level http response from the service
      #   that wrapped the service error.
      attr_reader :http_response

      protected

      # Extends the error object with {ServerError} or {ClientError}.
      # This indicates if the request should be retried (server errors)
      # or not (client errors).
      def include_error_type
        if http_response.status >= 500
          extend ServerError
        else
          extend ClientError
        end
      end

    end

    # Provides the ability to instantiate instances of {ServerError} and
    # {ClientError}.
    # @api private
    module ExceptionMixinClassMethods
      def new(*args)
        e = Base.new(*args)
        e.extend(self)
        e
      end
    end

    # Raised when an error occurs as a result of bad client
    # behavior, most commonly when the parameters passed to a method
    # are somehow invalid.  Other common cases:
    #
    # * Throttling errors
    # * Bad credentials
    # * No permission to do the requested operation
    # * Limits exceeded (e.g. too many buckets)
    #
    module ClientError
      extend ExceptionMixinClassMethods
    end

    # Raised when an AWS service is unable to handle the request.  These
    # are automatically retired.  If after 3 retries the request is still
    # failing, then the error is raised.
    module ServerError
      extend ExceptionMixinClassMethods
    end

    # Raised when AWS credentials could not be found.
    class MissingCredentialsError < StandardError

      def initialize msg = nil
        msg ||= <<-MSG

Missing Credentials.

Unable to find AWS credentials.  You can configure your AWS credentials
a few different ways:

* Call AWS.config with :access_key_id and :secret_access_key

* Export AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to ENV

* On EC2 you can run instances with an IAM instance profile and credentials
  will be auto loaded from the instance metadata service on those
  instances.

* Call AWS.config with :credential_provider.  A credential provider should
  either include AWS::Core::CredentialProviders::Provider or respond to
  the same public methods.

= Ruby on Rails

In a Ruby on Rails application you may also specify your credentials in
the following ways:

* Via a config initializer script using any of the methods mentioned above
  (e.g. RAILS_ROOT/config/initializers/aws-sdk.rb).

* Via a yaml configuration file located at RAILS_ROOT/config/aws.yml.
  This file should be formated like the default RAILS_ROOT/config/database.yml
  file.

MSG
        super(msg)
      end
    end

  end
end
