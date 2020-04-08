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

require 'base64'

module AWS
  class IAM

    # @attr_reader [String] base_32_string_seed The Base32 seed defined as
    #   specified in RFC3548.  Only accessible on newly created
    #   devices. This value is Base64-encoded.
    #
    # @attr_reader [Blob] qr_code_png A QR code PNG image that encodes
    #   otpauth://totp/$virtualMFADeviceName@$AccountName? secret=$Base32String
    #   where $virtualMFADeviceName is one of the create call arguments,
    #   AccountName is the user name if set (accountId otherwise), and
    #   Base32String is the seed in Base32 format.  Only accessible on newly
    #   created devices. This value is Base64-encoded.
    #
    # @attr_reader [DateTime] enable_date When this device was enabled.
    #   Returns nil if this device has not been enabled.
    #
    class VirtualMfaDevice < Resource

      # @api private
      def initialize serial_number, options = {}
        @serial_number = serial_number
        super
      end

      # @return [String] Returns the virtual MFA device serial number (ARN).
      attr_reader :serial_number

      alias_method :arn, :serial_number

      attribute :base_32_string_seed, :static => true

      attribute :qr_code_png, :static => true

      attribute :enable_date, :static => true

      attribute :user_details, :from => :user

      protected :user_details

      # @return [User,nil] Returns the user this device was enabled
      #   for, or nil if this device has not been enabled.
      def user
        if details = user_details
          User.new(details.user_name, :config => config)
        end
      end

      # Enables the MFA device and associates it with the specified user.
      # When enabled, the MFA device is required for every subsequent login
      # by the user name associated with the device.
      # @param [User,String] user The user (or user name string) you want
      #   to enable this device for.
      # @param [String] code1 An authentication code emitted by the device.
      # @param [String] code2 A subsequent authentication code emitted by
      #   the device.
      def enable user, code1, code2

        user_name = user.is_a?(User) ? user.name : user

        client.enable_mfa_device(
          :user_name => user_name,
          :serial_number => serial_number,
          :authentication_code_1 => format_auth_code(code1),
          :authentication_code_2 => format_auth_code(code2))

        nil

      end

      # @return [Boolean] Returns true if this device has been enabled
      #   for a user.
      def enabled?
        !!enable_date
      end

      # Deactivates the MFA device and removes it from association with
      # the user for which it was originally enabled.
      # @return [nil]
      def deactivate
        client_opts = {}
        client_opts[:user_name] = user.name
        client_opts[:serial_number] = serial_number
        client.deactivate_mfa_device(client_opts)
        nil
      end
      alias_method :disable, :deactivate

      # Deletes this virtual MFA device.
      # @return [nil]
      def delete
        client.delete_virtual_mfa_device(resource_options)
        nil
      end

      populates_from :create_virtual_mfa_device do |resp|
        if resp.virtual_mfa_device.serial_number == serial_number
          resp.virtual_mfa_device
        end
      end

      populates_from :list_virtual_mfa_devices do |resp|
        resp.virtual_mfa_devices.find { |d| d.serial_number == serial_number }
      end

      protected
      def format_auth_code(code)
        code.is_a?(Integer) ? sprintf("%06d", code) : code
      end

      protected
      def get_resource attr_name
        client.list_virtual_mfa_devices
      end

      protected
      def resource_identifiers
        [[:serial_number, serial_number]]
      end

    end

  end
end
