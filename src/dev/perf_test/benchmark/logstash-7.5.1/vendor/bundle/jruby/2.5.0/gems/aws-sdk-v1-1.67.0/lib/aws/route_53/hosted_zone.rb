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
  class Route53

    # # Delete existing hosted zone
    #
    #     hosted_zone = AWS::Route53::HostedZone.new(hosted_zone_id)
    #     hosted_zone.delete
    #
    # @attr_reader [String] name The hosted zone name.
    #
    # @attr_reader [Integer] resource_record_set_count
    #   The resource record set count.
    #
    # @attr_reader [Array<String>] delegation_set
    #
    class HostedZone < Core::Resource

      S3_HOSTED_ZONE_IDS = {
          'us-east-1' => 'Z3AQBSTGFYJSTF',
          'us-west-2' => 'Z3BJ6K6RIION7M',
          'us-west-1' => 'Z2F56UZL2M1ACD',
          'eu-west-1' => 'Z1BKCTXD74EZPE',
          'ap-southeast-1' => 'Z3O0J2DXBE1FTB',
          'ap-southeast-2' => 'Z1WCIGYICN2BYD',
          'ap-northeast-1' => 'Z2M4EHUR26P7ZW',
          'sa-east-1' => 'Z7KQH4QJS55SO',
          'us-gov-west-1' => 'Z31GFT0UA1I2HV'
      }

      # @api private
      def initialize id, options = {}
        @id = id.sub(%r!^/hostedzone/!, '')
        @change_info = options[:change_info]
        super
      end

      # @return [String] The hosted zone ID.
      attr_reader :id

      # @return [ChangeInfo] Change info for the newly created HostedZone
      #   instance.
      attr_reader :change_info

      # The Hosted zone path.
      # @return [String]
      def path
        "/hostedzone/#{id}"
      end

      define_attribute_type :list

      define_attribute_type :get

      list_attribute :name, :static => true

      list_attribute :configuration, :from => :config, :static => true

      list_attribute :resource_record_set_count

      get_attribute :delegation_set, :static => true

      get_attribute :vpcs

      provider(:list_hosted_zones) do |provider|
        provider.find do |resp|
          resp.data[:hosted_zones].find do |detail|
            detail[:hosted_zone][:id] == path
          end
        end
        provider.provides *list_attributes.keys
      end

      provider(:create_hosted_zone, :get_hosted_zone) do |provider|
        provider.find do |resp|
          if resp[:hosted_zone][:id] == path
            resp[:hosted_zone][:delegation_set] = resp[:delegation_set]
            resp[:hosted_zone][:vpcs] = resp[:vpcs]
            resp[:hosted_zone]
          end
        end
        provider.provides *list_attributes.keys
        provider.provides *get_attributes.keys
      end

      # Deletes the hosted zone.
      # @return [ChangeInfo]
      def delete
        resp = client.delete_hosted_zone(:id => id)
        if resp[:change_info][:id]
          ChangeInfo.new_from(:delete_hosted_zone,
                              resp[:change_info],
                              resp[:change_info][:id],
                              :config => config)
        end
      end

      # @return [Boolean] Returns `true` if this hosted zone exists.
      def exists?
        get_resource
        true
      rescue Errors::NoSuchHostedZone
        false
      end

      # Returns resource record sets.
      # @return [ResourceRecordSetCollection]
      def resource_record_sets
        ResourceRecordSetCollection.new(id, :config => config)
      end
      alias_method :rrsets, :resource_record_sets

      # Associates an additional VPC with a private hosted zone.
      # @return [ChangeInfo]
      def associate_vpc vpc
        resp = client.associate_vpc_with_hosted_zone(:hosted_zone_id => id, :vpc => vpc)
        if resp[:change_info][:id]
          ChangeInfo.new_from(:associate_vpc_with_hosted_zone,
                              resp[:change_info],
                              resp[:change_info][:id])
        end
      end

      # Disassociates an VPC from an private hosted zone.
      # @return [ChangeInfo]
      def disassociate_vpc vpc
        resp = client.disassociate_vpc_from_hosted_zone(:hosted_zone_id => id, :vpc => vpc)
        if resp[:change_info][:id]
          ChangeInfo.new_from(:disassociate_vpc_from_hosted_zone,
                              resp[:change_info],
                              resp[:change_info][:id])
        end
      end

      protected

      def resource_identifiers
        [[:id, id], [:name, name]]
      end

      def get_resource attr_name = nil
        client.get_hosted_zone(:id => id)
      end

    end
  end
end
