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
  class DynamoDB
    class PrimaryKeyElement

      attr_reader :name

      attr_reader :type

      ATTRIBUTE_TYPES = {
        "S" => :string,
        "N" => :number,
        "B" => :binary,
      }

      def initialize(hash)
        @name = hash[:name] || hash["AttributeName"]
        @type = hash[:type] || ATTRIBUTE_TYPES[hash["AttributeType"]]
      end

      def self.from_description(description)
        (name, type, *extra) = description.to_a.flatten

        raise(ArgumentError,
              "key element may contain only one name/type pair") unless
          extra.empty?

        raise ArgumentError, "unsupported type #{type.inspect}" unless
          ATTRIBUTE_TYPES.values.include?(type.to_sym)

        new(:name => name.to_s, :type => type)
      end

    end
  end
end
