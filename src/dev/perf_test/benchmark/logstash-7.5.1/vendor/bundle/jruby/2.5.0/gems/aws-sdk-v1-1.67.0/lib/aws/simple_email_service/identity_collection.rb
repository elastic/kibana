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
    class IdentityCollection

      include Core::Collection::WithLimitAndNextToken

      # @api private
      def initialize options = {}
        @type = options[:type]
        super
      end

      # Request verification for an email address or a domain.
      # @param [String] email_or_domain
      # @return [Identity] Returns an {Identity} object.  Identities for
      #   domains will have a #verification_token.
      def verify email_or_domain

        resp = email_or_domain =~ /@/ ?
          client.verify_email_identity(:email_address => email_or_domain) :
          client.verify_domain_identity(:domain => email_or_domain)

        Identity.new(email_or_domain,
          :verification_token => resp.data[:verification_token],
          :config => config)

      end
      alias_method :create, :verify

      # @param [String] email_or_domain
      # @return [DomainIdentity,EmailIdentity] Returns an {Identity} with
      #   the given email address or domain name.
      def [] email_or_domain
        Identity.new(email_or_domain, :config => config)
      end

      # @return [IdentityCollection] Returns a collection that only
      #   enumerates email addresses.
      def email_addresses
        self.class.new(:type => 'EmailAddress', :config => config)
      end

      # @return [IdentityCollection] Returns a collection that only
      #   enumerates domains.
      def domains
        self.class.new(:type => 'Domain', :config => config)
      end

      protected

      def _each_item next_token, limit, options = {}, &block

        options[:max_items] = limit if limit
        options[:next_token] = next_token if next_token
        options[:identity_type] = @type if @type

        resp = client.list_identities(options)
        resp.data[:identities].each do |identity|
          yield(self[identity])
        end

        resp.data[:next_token]

      end

    end
  end
end
