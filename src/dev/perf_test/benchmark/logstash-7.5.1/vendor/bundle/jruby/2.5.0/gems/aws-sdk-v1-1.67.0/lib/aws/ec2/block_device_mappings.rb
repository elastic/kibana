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

    # @api private
    module BlockDeviceMappings

      # @api private
      private
      def translate_block_device_mappings(mapping)
        raise ArgumentError.new("block_device_mappings must be a hash") unless
          mapping.kind_of?(Hash)
        mapping.map do |device, dest|
          raise ArgumentError.new("keys of block_device_mappings must be strings") unless
            device.kind_of?(String)
          entry = { :device_name => device }
          case dest
          when :no_device
            # for some reason EC2 rejects boolean values for this seemingly boolean option
            entry[:no_device] = ""
          when Symbol
            raise ArgumentError.new("unrecognized block device mapping: #{dest}")
          when String
            entry[:virtual_name] = dest
          when Hash
            if snapshot = dest.delete(:snapshot)
              dest[:snapshot_id] = snapshot.id
            end
            entry[:ebs] = dest
          else
            raise ArgumentError.new("values of block_device_mappings must "+
                                    "be strings, symbols, or hashes")
          end
          entry
        end
      end

    end

  end
end
