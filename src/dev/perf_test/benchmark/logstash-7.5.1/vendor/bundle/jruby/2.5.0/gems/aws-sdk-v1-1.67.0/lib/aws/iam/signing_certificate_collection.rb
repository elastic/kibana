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

    # This is the primary interface for uploading X.509 signing certificates
    # to an AWS account or an IAM user.
    #
    #     iam = AWS::IAM.new
    #
    #     # upload a certificate for the AWS account:
    #     iam.signing_certificates.upload(<<-CERT)
    #     -----BEGIN CERTIFICATE-----
    #     MIICdzCCAeCgAwIBAgIFGS4fY6owDQYJKoZIhvcNAQEFBQAwUzELMAkGA1UEBhMC
    #     ......
    #     Glli79yh87PRi0vNDlFEoHXNynkvC/c4TiWruZ4haM9BR9EdWr1DBNNu73ui093K
    #     F9TbdXSWdgMl7E0=
    #     -----END CERTIFICATE-----
    #     CERT
    #
    # If you want to work with an IAM user's certificates just use the
    # signing certificate interface on a user:
    #
    #     user = iam.users['someuser']
    #     user.signing_certificates.upload(cert_body)
    #
    class SigningCertificateCollection

      include Collection

      # @param [Hash] options
      # @option options [User] :user (nil) When `:user` is provided the
      #   collection will represents the signing certificates belonging only
      #   to that user.  When `:user` is omitted the collection will manage
      #   root credentials on the AWS account (instead those belonging to a
      #   particular user).
      def initialize options = {}
        @user = options[:user]
        @user ? super(@user, options) : super(options)
      end

      # @return [User,nil] Returns the user this collection belongs to.
      #   Returns `nil` if the collection represents the root credentials
      #   for the account.  If the configured credentials belong to an
      #   IAM user, then that user is the implied owner.
      attr_reader :user

      # @param [String] certificate_body The contents of the signing
      #   certificate.
      # @return [SigningCertificate] Returns the newly created signing
      #   certificate.
      def upload certificate_body

        options = {}
        options[:certificate_body] = certificate_body
        options[:user_name] = user.name if user

        resp = client.upload_signing_certificate(options)

        SigningCertificate.new_from(:upload_signing_certificate,
          resp.certificate, resp.certificate.certificate_id, new_options)

      end

      alias_method :create, :upload

      # @param [String] certificate_id The ID of the signing certificate.
      # @return [SigningCertificate] Returns a reference to the signing
      #   certificate with the given certificate ID.
      def [] certificate_id
        SigningCertificate.new(certificate_id.to_s, new_options)
      end

      # Deletes all of the signing certificates from this collection.
      # @return [nil]
      def clear
        each do |certificate|
          certificate.delete
        end
        nil
      end

      # Yields once for each signing certificate.
      #
      # You can limit the number of certificates yielded using `:limit`.
      #
      # @param [Hash] options
      # @option options [Integer] :limit The maximum number of certificates
      #   to yield.
      # @option options [Integer] :batch_size The maximum number of
      #   certificates received each service reqeust.
      # @yieldparam [SigningCertificate] signing_certificate
      # @return [nil]
      def each options = {}, &block
        each_options = options.dup
        each_options[:user_name] = user.name if user
        super(each_options, &block)
      end

      # @api private
      protected
      def each_item response, &block
        response.certificates.each do |item|

          cert = SigningCertificate.new_from(:list_signing_certificates,
            item, item.certificate_id, new_options)

          yield(cert)

        end
      end

      # @api private
      protected
      def new_options
        user ? { :user => user } : { :config => config }
      end

    end
  end
end
