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
    class InternetGateway < Resource

      # Represents the attachment between an internet gateway and a VPC.
      #
      # ## Creating Attachments
      #
      # To create an attachment, just assign an internet gateway to a VPC
      # or visa versa.
      #
      #     # attaches a gateway to a vpc
      #     internet_gateway.vpc = vpc
      #
      #     # this can also be done in reverse
      #     vpc.internet_gateway = internet_gateway
      #
      # ## Enumerating Attachments
      #
      # You can enumerate the attachments for an {InternetGateway} like so:
      #
      #     internet_gateway.attachments.each do |attachment|
      #        puts "#{attachment.internet_gateway.id} => #{attachment.vpc.id}"
      #     end
      #
      # ## Deleting Attachments
      #
      # You can delete an attachment from the Attachment object:
      #
      #     internet_gateway.attachments.each(&:delete)
      #
      # You can also delete an attachment by assigning a nil value:
      #
      #     # removes the current attachment to the vpc is one exists
      #     internet_gateway.vpc = nil
      #
      class Attachment

        # @api private
        def initialize internet_gateway, details
          @internet_gateway = internet_gateway
          @vpc = VPC.new(details.vpc_id, :config => internet_gateway.config)
          @state = details.state.to_sym
        end

        # @return [InternetGateway]
        attr_reader :internet_gateway

        # @return [VPC]
        attr_reader :vpc

        # @return [Symbol]
        attr_reader :state

        # Deletes this attachment.
        # @return (see InternetGateway#detach)
        def delete
          internet_gateway.detach(vpc)
        end
        alias_method :detach, :delete

      end
    end
  end
end
