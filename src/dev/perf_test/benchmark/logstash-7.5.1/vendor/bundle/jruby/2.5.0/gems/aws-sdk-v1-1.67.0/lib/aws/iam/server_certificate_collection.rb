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
  class IAM

    # A collection that provides access to IAM server certificates
    # belonging to this account.
    #
    #     iam = AWS::IAM.new
    #     certificates = iam.server_certificates
    #
    # ## Uploading A Server Certificate
    #
    # You can upload any valid, signed certificate using {#upload}.
    #
    #     certificates.upload(:name => "MyCert",
    #                         :certificate_body => my_certificate_body,
    #                         :private_key => my_private_key)
    #
    # For information about generating a server certificate for use
    # with IAM, see
    # {http://docs.aws.amazon.com/IAM/latest/UserGuide/InstallCert.html
    # Creating and Uploading Server Certificates} in <i>Using AWS
    # Identity and Access Management</i>.
    #
    # ## Getting a Server Certificate by Name
    #
    # You can get a reference to a server certificate using array notation:
    #
    #     certificate = certificates['MyCert']
    #
    # ## Enumerating Server Certificates
    #
    # Server certificate collections can also be used to enumerate
    # certificates:
    #
    #     certificates.each do |cert|
    #       puts cert.name
    #     end
    #
    # You can limit the certificates returned by passing a `:prefix`
    # option to any of the enumerator methods.  When you pass a
    # prefix, only the certificates whose paths start with the given
    # string will be returned.
    class ServerCertificateCollection

      include Collection::WithPrefix

      # Uploads a server certificate entity for the AWS account. The
      # server certificate entity includes a public key certificate, a
      # private key, and an optional certificate chain, which should
      # all be PEM-encoded.
      #
      # @param [Hash] options Options for uploading the certificate.
      #   `:name`, `:certificate_body`, and `:private_key` are
      #   required.
      #
      # @option options [String] :certificate_body The contents of the
      #   public key certificate in PEM-encoded format.
      #
      # @option options [String] :name The name for the server
      #   certificate. Do not include the path in this value.
      #
      # @option options [String] :path The path for the server
      #   certificate. For more information about paths, see
      #   {http://docs.aws.amazon.com/IAM/latest/UserGuide/index.html?Using_Identifiers.html
      #   Identifiers for IAM Entities} in <i>Using AWS Identity and
      #   Access Management</i>.
      #
      # @option options [String] :private_key The contents of the
      #   private key in PEM-encoded format.
      #
      # @option options [String] :certificate_chain The contents of
      #   the certificate chain. This is typically a concatenation of
      #   the PEM-encoded public key certificates of the chain.
      #
      # @return [ServerCertificate] The newly created server
      #   certificate.
      def create options = {}

        client_opts = options.dup
        client_opts[:server_certificate_name] = client_opts.delete(:name)

        if path = client_opts[:path]
          client_opts[:path] = "/#{path}/".
            sub(%r{^//}, "/").
            sub(%r{//$}, "/")
        end

        resp = client.upload_server_certificate(client_opts)

        ServerCertificate.new(
          resp[:server_certificate_metadata][:server_certificate_name],
          :config => config)

      end
      alias_method :upload, :create

      # Returns a reference to the server certificate with the given
      # name:
      #
      #   certificate = iam.server_certificates['MyCert']
      #
      # @param [String] name Name of the server certificate.
      #
      # @return [ServerCertificate] Returns a reference to the named
      #   server certificate.
      def [] name
        ServerCertificate.new(name, :config => config)
      end

      # @api private
      protected
      def each_item response, &block
        response.server_certificate_metadata_list.each do |sc|
          certificate = ServerCertificate.new_from(:list_server_certificates,
                                                   sc,
                                                   sc.server_certificate_name,
                                                   :config => config)
          yield(certificate)
        end
      end

    end

  end
end
