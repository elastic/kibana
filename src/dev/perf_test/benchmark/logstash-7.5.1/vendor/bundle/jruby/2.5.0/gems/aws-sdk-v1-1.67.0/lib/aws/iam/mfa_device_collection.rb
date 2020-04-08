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

    # @attr_reader [User] user Returns the user that owns this collection.
    class MFADeviceCollection

      include Collection

      # @param [User] user The user that owns this device collection.
      def initialize user, options = {}
        @user = user
        super
      end

      # @return [User] Returns the user that this mfa device collection
      #   belongs to.
      attr_reader :user

      # Enables an MFA device for this user.
      # @param [String] serial_number The serial number that uniquely
      #   identifies the MFA device
      # @param [String] authentication_code_1 An authentication code emitted
      #   by the device.
      # @param [String] authentication_code_2 A subsequent authentication
      #   code emitted by the device.
      # @return [MFADevice] Returns the newly enabled MFA device.
      def enable serial_number, authentication_code_1, authentication_code_2
        client.enable_mfa_device({
          :user_name => user.name,
          :serial_number => serial_number,
          :authentication_code_1 => authentication_code_1.to_s,
          :authentication_code_2 => authentication_code_2.to_s,
        })
        self[serial_number]
      end

      alias_method :create, :enable

      # @param [String] serial_number The serial number of the MFA device you
      #   want to disable.
      # @return [nil]
      def disable serial_number
        self[serial_number].disable
        nil
      end

      # @param [String] serial_number The serial number of an MFA device.
      # @return [MFADevice] Returns a reference to an MFA device with the
      #   given serial number.
      def [] serial_number
        MFADevice.new(user, serial_number)
      end

      # Deactivates all of the MFA devices in this collection.
      # Virtual MFA devices in this collection will not be
      # deleted. Instead they will be available in the
      # {IAM#virtual_mfa_devices} collection so that they can either
      # be deleted or enabled for different users.
      #
      # @return [nil]
      def clear
        each do |device|
          device.deactivate
        end
        nil
      end

      # Yields once for each MFA device.
      #
      # You can limit the number of devices yielded using `:limit`.
      #
      # @param [Hash] options
      # @option options [Integer] :limit The maximum number of devices to yield.
      # @option options [Integer] :batch_size The maximum number of devices
      #   receive each service reqeust.
      # @yieldparam [User] user
      # @return [nil]
      def each options = {}, &block
        super(options.merge(:user_name => user.name), &block)
      end

      # Returns an enumerable object for this collection.  This can be
      # useful if you want to call an enumerable method that does
      # not accept options (e.g. `collect`, `first`, etc).
      #
      #   mfa_devices.enumerator(:limit => 10).collect(&:serial_number)
      #
      # @param (see #each)
      # @option (see #each)
      # @return [Enumerator]
      def enumerator options = {}
        super(options)
      end

      # @api private
      protected
      def each_item response, &block
        response.mfa_devices.each do |item|

          if item.serial_number =~ /^arn:/
            mfa_device = VirtualMfaDevice.new_from(:list_mfa_devices, item,
                                                   item.serial_number,
                                                   :config => config)
          else
            mfa_device = MFADevice.new(user, item.serial_number)
          end

          yield(mfa_device)

        end
      end

    end
  end
end
