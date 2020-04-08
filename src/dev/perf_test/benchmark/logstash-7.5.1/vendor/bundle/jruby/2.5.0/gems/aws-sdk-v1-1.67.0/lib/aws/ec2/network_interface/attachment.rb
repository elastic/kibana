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

require 'aws/ec2/network_interface/attachment'

module AWS
  class EC2
    class NetworkInterface < Resource
      class Attachment

        def initialize network_interface, details
          @network_interface = network_interface
          @attachment_id = details[:attachment_id]
          @instance = Instance.new(details[:instance_id],
            :owner_id => details[:instance_owner_id],
            :config => network_interface.config)
          @instance_owner_id = details[:instance_owner_id]
          @device_index = details[:device_index]
          @status = details[:status].to_sym
          @attach_time = details[:attach_time]
          @delete_on_termination = details[:delete_on_termination]
        end

        # @return [String] Returns the attachment id.
        attr_reader :attachment_id

        alias_method :id, :attachment_id

        # @return [NetworkInterface] Returns the network interface this
        #   is an attachment for.
        attr_reader :network_interface

        # @return [Instance] Returns the instance the network interface
        #   is attached to.
        attr_reader :instance

        # @return [String] Returns the instance owner id.
        attr_reader :instance_owner_id

        # @return [Integer] The index of the device for the network
        #   interface attachment on the instance.
        attr_reader :device_index

        # @return [Symbol] Returns the attachment status.
        attr_reader :status

        # @return [Time]
        attr_reader :attach_time

        # @return [Boolean]
        attr_reader :delete_on_termination

        alias_method :delete_on_termination?, :delete_on_termination

        # Allows you to toggle the delete on termination state.
        #
        #     network_interface.attachment.delete_on_termination = false
        #
        # @param [Boolean] state
        #
        def delete_on_termination= state
          opts = {}
          opts[:network_interface_id] = network_interface.id
          opts[:attachment] = {}
          opts[:attachment][:attachment_id] = id
          opts[:attachment][:delete_on_termination] = state
          network_interface.client.modify_network_interface_attribute(opts)
        end

        # Detaches the network interface from the instance.
        #
        # @param [Hash] options
        #
        # @option options [Boolean] :force (false) Set true to force
        #   a detachment.
        #
        # @return [nil]
        #
        def detach options = {}
          client_opts = {}
          client_opts[:attachment_id] = attachment_id
          client_opts[:force] = options[:force] == true
          network_interface.client.detach_network_interface(client_opts)
        end
        alias_method :delete, :detach

      end
    end
  end
end
