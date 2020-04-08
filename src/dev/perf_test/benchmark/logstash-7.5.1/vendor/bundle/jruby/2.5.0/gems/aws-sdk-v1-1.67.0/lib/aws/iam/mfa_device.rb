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

    class MFADevice

      include Core::Model

      # @param [User] user The user the MFA device is associated with.
      # @param [String] serial_number The MFA device's unique serial number.
      def initialize user, serial_number, options = {}
        @user = user
        @serial_number = serial_number
        super
      end

      # @return [User] Returns the MFA device's user.
      attr_reader :user

      # @return [String] Returns the MFA device's serial number
      attr_reader :serial_number

      # Deactivates the MFA device and removes it from association
      # with the user for which it was originally enabled.  You must
      # call {MFADeviceCollection#enable} to enable the device again.
      #
      # @return [nil]
      def deactivate
        client.deactivate_mfa_device({
          :user_name => user.name,
          :serial_number => serial_number,
        })
        nil
      end

      alias_method :delete, :deactivate

    end

  end
end
