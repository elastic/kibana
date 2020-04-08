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
  class EC2

    # Client class for Amazon Elastic Compute Cloud (EC2).
    class Client < Core::QueryClient

      API_VERSION = '2014-10-01'

      signature_version :Version4, 'ec2'

      def retryable_error?(response)
        if response.error.is_a?(Errors::InsufficientInstanceCapacity)
          false
        else
          super
        end
      end

      # @api private
      CACHEABLE_REQUESTS = Set[
        :describe_addresses,
        :describe_availability_zones,
        :describe_bundle_tasks,
        :describe_customer_gateways,
        :describe_dhcp_options,
        :describe_image_attribute,
        :describe_images,
        :describe_instances,
        :describe_key_pairs,
        :describe_regions,
        :describe_reserved_instances,
        :describe_reserved_instances_offerings,
        :describe_security_groups,
        :describe_snapshot_attribute,
        :describe_snapshots,
        :describe_subnets,
        :describe_volume_status,
        :describe_volumes,
        :describe_vpcs,
        :describe_vpn_connections,
        :describe_vpn_gateways,
        :describe_instance_attribute,
        :describe_spot_instance_requests,
        :describe_spot_price_history,
        :describe_spot_datafeed_subscription,
        :describe_licenses,
        :describe_placement_groups,
        :describe_tags,
        :describe_internet_gateways,
        :describe_route_tables,
        :describe_network_acls,
        :describe_instance_status,
        :describe_conversion_tasks,
        :describe_network_interfaces,
        :describe_network_interface_attribute,
      ]

      protected

      # @return [Core::Signers::Version2]
      def v2_signer
        @v2_signer ||= Core::Signers::Version2.new(credential_provider)
      end

      # @return [Core::Signers::Version4]
      def v4_signer
        @v4_signer ||=
          Core::Signers::Version4.new(credential_provider, 'ec2', @region)
      end

    end

    class Client::V20130815 < Client
      define_client_methods('2013-08-15')
    end

    class Client::V20131001 < Client
      define_client_methods('2013-10-01')
    end

    class Client::V20131015 < Client
      define_client_methods('2013-10-15')
    end

    class Client::V20140201 < Client
      define_client_methods('2014-02-01')
    end

    class Client::V20140501 < Client
      define_client_methods('2014-05-01')
    end

    class Client::V20140901 < Client
      define_client_methods('2014-09-01')
    end

    class Client::V20141001 < Client

      define_client_methods('2014-10-01')

      alias basic_copy_snapshot copy_snapshot

      def copy_snapshot(params = {})
        # Adding logic to auto-compute the destination group and presigned
        # url params for the copy snapshot operation.  This is necessary
        # when calling copy snapshot on snapshots for encrypted volumes.
        # This addition should be transparent to the API user.
        params = params.dup
        params[:destination_region] = @region
        params[:presigned_url] = presigned_copy_snapshot_url(params)
        basic_copy_snapshot(params)
      end

      private

      def presigned_copy_snapshot_url(params)
        token = credential_provider.session_token

        client = self.with_options(:ec2_region => params[:source_region])

        req = client.build_request(:copy_snapshot, params)

        now = req.remove_param("Timestamp").value
        now = Time.parse(now).strftime("%Y%m%dT%H%M%SZ")

        req.add_param("X-Amz-Algorithm", "AWS4-HMAC-SHA256")
        req.add_param("X-Amz-Date", now)
        req.add_param("X-Amz-SignedHeaders", 'host')
        req.add_param("X-Amz-Expires", "3600")
        req.add_param('X-Amz-Security-Token', token) if token
        req.add_param("X-Amz-Credential", client.v4_signer.credential(now))

        req.http_method = 'GET'
        req.uri = '/?' + req.url_encoded_params
        req.body = ''
        req.headers.clear
        req.headers['host'] = client.config.ec2_endpoint

        key = client.v4_signer.derive_key(now)
        sig = client.v4_signer.signature(req, key, now, client.v4_signer.class::EMPTY_DIGEST)

        req.add_param('X-Amz-Signature', sig)

        req.endpoint + '/?' + req.url_encoded_params
      end

    end
  end
end
