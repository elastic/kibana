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

    class VirtualMfaDeviceCollection

      include Collection

      # Creates a new virtual MFA device for the AWS account.
      # After creating the virtual MFA, you can enable the device to an
      # IAM user.
      #
      # @param [String] name The name of the virtual MFA device. Name and path
      #   together uniquely identify a virtual MFA device.
      # @param [Hash] options
      # @option [String] :path The path for the virtual MFA device.
      # @return [VirtualMfaDevice]
      def create name, options = {}

        client_opts = options.dup
        client_opts[:virtual_mfa_device_name] = name
        resp = client.create_virtual_mfa_device(client_opts)

        VirtualMfaDevice.new_from(
          :create_virtual_mfa_device,
          resp.virtual_mfa_device,
          resp.virtual_mfa_device.serial_number,
          :config => config)

      end

      # Returns a virtual MFA device with the given serial number.
      # @param [String] serial_number The serial number (ARN) of a virtual
      #   MFA device.
      # @return [VirtualMfaDevice]
      def [] serial_number
        VirtualMfaDevice.new(serial_number, :config => config)
      end

      protected
      def request_method; :list_virtual_mfa_devices; end

      protected
      def next_token_key; :marker; end

      protected
      def limit_key; :max_items; end

      protected
      def each_item(response)
        response.virtual_mfa_devices.each do |d|
          device = VirtualMfaDevice.new_from(
            :list_mfa_devices, d, d.serial_number, :config => config)
          yield(device)
        end
      end

    end

  end
end
