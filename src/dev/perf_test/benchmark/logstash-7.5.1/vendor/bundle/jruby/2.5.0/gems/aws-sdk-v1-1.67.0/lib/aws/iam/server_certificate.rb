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

    # Respresents a server certificate.
    #
    #     certificate = iam.server_certificates["MyCert"]
    #
    # You can use this class to get information about a certificate
    # and to delete it.
    #
    # @attr [String] name The name that identifies the server certificate.
    #
    # @attr_reader [String] id The stable and unique string identifying
    #   the server certificate.
    #
    # @attr_reader [Time] upload_date The date when the server certificate was
    #   uploaded.
    #
    # @attr_reader [String] arn The Amazon Resource Name (ARN)
    #   specifying the server certificate. For more information
    #   about ARNs and how to use them in policies, see
    #   {http://docs.aws.amazon.com/IAM/latest/UserGuide/index.html?Using_Identifiers.html
    #   Identifiers for IAM Entities} in <i>Using AWS Identity and
    #   Access Management</i>.
    #
    # @attr [String] path Path to the server certificate.
    #
    # @attr_reader [String] certificate_body The contents of the public key
    #   certificate.
    #
    # @attr_reader [String] certificate_chain The contents of the public key
    #   certificate chain.
    #
    class ServerCertificate < Resource

      prefix_update_attributes

      # @api private
      def initialize(name, opts={})
        opts[:name] = name
        super(opts)
      end

      mutable_attribute :name, :static => true, :from => :server_certificate_name

      attribute :id, :static => true, :from => :server_certificate_id

      attribute :upload_date, :static => true

      attribute :arn

      mutable_attribute :path do
        translates_input do |path|
          path = "/#{path}" unless path[0] == ?/
          path = "#{path}/" unless path[-1] == ?/
          path
        end
      end

      attribute :certificate_body

      attribute :certificate_chain

      provider(:get_server_certificate) do |provider|
        # for metadata attributes
        provider.find do |resp|
          cert, meta = response_objects(resp)
          meta
        end
        provider.provides :name, :id, :upload_date, :arn, :path
      end

      provider(:get_server_certificate) do |provider|
        # for data attributes
        provider.find do |resp|
          cert, meta = response_objects(resp)
          cert
        end
        provider.provides :certificate_body, :certificate_chain
      end

      populates_from(:upload_server_certificate) do |resp|
        resp.server_certificate_metadata if
          resp.server_certificate_metadata.server_certificate_name == name
      end

      populates_from(:list_server_certificates) do |resp|
        resp.server_certificate_metadata_list.find do |sc|
          sc.server_certificate_name == name
        end
      end

      # Deletes the specified server certificate.
      #
      # @note If you are using a server certificate with Elastic Load
      #   Balancing, deleting the certificate could have implications
      #   for your application. If Elastic Load Balancing doesn't
      #   detect the deletion of bound certificates, it may continue
      #   to use the certificates. This could cause Elastic Load
      #   Balancing to stop accepting traffic. We recommend that you
      #   remove the reference to the certificate from Elastic Load
      #   Balancing before using this command to delete the
      #   certificate. For more information, go to
      #   {http://docs.aws.amazon.com/ElasticLoadBalancing/latest/APIReference/API_DeleteLoadBalancerListeners.html
      #   DeleteLoadBalancerListeners} in the _Elastic Load Balancing
      #   API Reference_.
      #
      # @return [nil]
      def delete
        client.delete_server_certificate(resource_options)
        nil
      end

      # @api private
      protected
      def resource_identifiers
        [[:server_certificate_name, name]]
      end

      # extract response objects from get_server_certificate
      private
      def response_objects(resp)
        if cert = resp.server_certificate and
            meta = cert.server_certificate_metadata and
            meta.server_certificate_name == name
          [cert, meta]
        else
          [nil, nil]
        end
      end

    end

  end
end
