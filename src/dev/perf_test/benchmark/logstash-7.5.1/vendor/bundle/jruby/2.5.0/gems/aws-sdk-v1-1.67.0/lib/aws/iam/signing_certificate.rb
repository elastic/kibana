# Copyright 2011-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
  class IAM

    # Signing certificates can be activated and deactivated.
    # By default, newly-uploaded certifictes are active.
    #
    #     certificate = iam.signing_certificates.upload(cert_body)
    #     certificate.status
    #     #=> :active
    #
    #     certificate.deactivate!
    #     certificate.active?
    #     #=> false
    #
    # ## Contents
    #
    # You can access the certificate contents you uploaded:
    #
    #     > puts certificate.contents
    #     -----BEGIN CERTIFICATE-----
    #     MIICdzCCAeCgAwIBAgIFGS4fY6owDQYJKoZIhvcNAQEFBQAwUzELMAkGA1UEBhMC
    #     ......
    #     Glli79yh87PRi0vNDlFEoHXNynkvC/c4TiWruZ4haM9BR9EdWr1DBNNu73ui093K
    #     F9TbdXSWdgMl7E0=
    #     -----END CERTIFICATE-----
    #
    # ## User
    #
    # A certificate can also return the user it belongs to.  If the certificate
    # belongs to the AWS account, then {#user} will return `nil`.
    #
    #     user = iam.users['someuser'].signing_certificates.first
    #     user.name
    #     #=> 'someuser'
    #
    # @attr_reader [String] contents Returns the contents of this
    #   signing certificate.
    #
    # @attr_reader [Time] upload_date
    #
    # @attr_reader [Symbol] status The status of this signing
    #   certificate.  Status may be `:active` or `:inactive`.
    #
    class SigningCertificate < Resource

      # @param [String] certificate_id The id of the signing certificate.
      # @param [Hash] options
      # @option options [User] :user
      def initialize certificate_id, options = {}
        @id = certificate_id
        @user = options[:user]
        @user ? super(@user, options) : super(options)
      end

      # @return [String] Returns the signing certificate's ID.
      attr_reader :id

      # @return [User,nil] Returns the user this cerficiate belongs to.
      #   Returns `nil` if the cerficiate is a root credential for the
      #   account.  If the configured credentials belong to an IAM user,
      #   then that user is the implied owner.
      attr_reader :user

      attribute :contents, :from => :certificate_body, :static => true

      # @attr_reader [Time] upload_date
      attribute :upload_date, :static => true

      mutable_attribute :status, :to_sym => true

      protected :status=

      populates_from(
        :upload_signing_certificate,
        :update_signing_certificate
      ) do |resp|
        resp.certificate if matches_response_object?(resp.certificate)
      end

      populates_from(:list_signing_certificates) do |resp|
        resp.certificates.find {|c| matches_response_object?(c) }
      end

      # @return [String,nil] Returns the name of the user this certificate
      #   belogns to.  If the certificate belongs to the account, `nil` is
      #   returned.
      def user_name
        @user ? @user.name : nil
      end

      # @return [Boolean] Returns true if this signing certificate is active.
      def active?
        status == :active
      end

      # @return [Boolean] Returns true if this signing certificate is inactive.
      def inactive?
        status == :inactive
      end

      # Activates this signing cerificate.
      #
      # @example
      #   signing_certificate.activate!
      #   signing_certificate.status
      #   # => :active
      #
      # @return [nil]
      def activate!
        self.status = 'Active'
        nil
      end

      # Deactivates this signing cerificate.
      #
      # @example
      #   signing_certificate.deactivate!
      #   signing_certificate.status
      #   # => :inactive
      #
      # @return [nil]
      def deactivate!
        self.status = 'Inactive'
        nil
      end

      # Deletes the signing certificate.
      def delete
        client.delete_signing_certificate(resource_options)
        nil
      end

      # @return [Boolean] Returns `true` if the resource exists.
      def exists?
        exists = false
        SigningCertificateCollection.new(:config => config).each do |cert|
          if cert.id == self.id
            exists = true
            break
          end
        end
        exists
      end

      # @api private
      protected
      def resource_identifiers
        identifiers = []
        identifiers << [:certificate_id, id]
        identifiers << [:user_name, user.name] if user
        identifiers
      end

      # IAM does not provide a request for "get signing certificate".
      # Also note, we do not page the response. This is because
      # restrictions on how many certificates an account / user may
      # have is fewer than one page of results.
      # @api private
      protected
      def get_resource attribute = nil
        options = user ? { :user_name => user.name } : {}
        client.list_signing_certificates(options)
      end

      # @api private
      protected
      def matches_response_object? obj
        user_name = obj.respond_to?(:user_name) ? obj.user_name : nil
        obj.certificate_id == self.id and user_name == self.user_name
      end

    end
  end
end
