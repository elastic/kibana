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

    class InternetGatewayCollection < Collection

      include TaggedCollection
      include Core::Collection::Simple

      # Creates a new Internet gateway in your AWS account. After creating
      # the gateway you can attach it to a VPC.
      #
      # @return [InternetGateway]
      #
      def create
        response = client.create_internet_gateway
        self[response.internet_gateway.internet_gateway_id]
      end

      # @param [String] internet_gateway_id
      # @return [InternetGateway]
      def [] internet_gateway_id
        InternetGateway.new(internet_gateway_id, :config => config)
      end

      protected

      def _each_item options = {}, &block
        response = filtered_request(:describe_internet_gateways, options, &block)
        response.internet_gateway_set.each do |g|

          gateway = InternetGateway.new_from(:describe_internet_gateways, g,
            g.internet_gateway_id, :config => config)

          yield(gateway)

        end
      end

    end
  end
end
