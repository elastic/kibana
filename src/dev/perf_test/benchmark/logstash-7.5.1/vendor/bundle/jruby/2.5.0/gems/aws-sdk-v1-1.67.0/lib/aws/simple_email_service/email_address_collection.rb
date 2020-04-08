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
  class SimpleEmailService

    # Helps you manage your verified SimpleEmailService email addresses.
    # @note This class is deprecated. Please use
    #   {SimpleEmailService#identities} instead.
    class EmailAddressCollection

      include Core::Model
      include Enumerable

      # Requests for an email address to be verified.  An email will be
      # sent to the given `email_address` with a link to click.  Once
      # the link has been followed the `email_address` will be verified.
      #
      # @param [String] email_address The email address to verify.
      # @return [nil]
      # @note This method is deprecated.
      def verify email_address
        client.verify_email_address(:email_address => email_address)
        nil
      end
      alias_method :create, :verify

      # @param [String] email_address An email address to remove from the list
      #   of verified email addresses.  Useful for cleanup as there is a 100
      #   email address limit.
      # @return [nil]
      # @note This method is deprecated.
      def delete email_address
        client.delete_verified_email_address(:email_address => email_address)
        nil
      end

      # @note This method is deprecated.
      def include?
        # this is so jruby can detect that verified? is an alias
        super
      end
      alias_method :verified?, :include?

      # Yields each verified email address as a string.
      # @return [nil]
      #   yielded.
      # @note This method is deprecated.
      def each &block
        response = client.list_verified_email_addresses({})
        response.verified_email_addresses.each do |email_address|
          yield(email_address)
        end
        nil
      end

    end
  end
end
