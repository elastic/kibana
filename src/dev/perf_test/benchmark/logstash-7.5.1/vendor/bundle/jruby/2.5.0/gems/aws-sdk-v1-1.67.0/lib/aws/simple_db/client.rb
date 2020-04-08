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
  class SimpleDB

    # Client class for Amazon SimpleDB.
    class Client < Core::QueryClient

      API_VERSION = '2009-04-15'

      signature_version :Version2

      # @api private
      REGION_US_E1 = 'sdb.amazonaws.com'

      # @api private
      REGION_US_W1 = 'sdb.us-west-1.amazonaws.com'

      # @api private
      REGION_EU_W1 = 'sdb.eu-west-1.amazonaws.com'

      # @api private
      REGION_APAC_SE1 = 'sdb.ap-southeast-1.amazonaws.com'

      # @api private
      CACHEABLE_REQUESTS = Set[
        :domain_metadata,
        :get_attributes,
        :list_domains,
        :select,
      ]

      # @param [String] name
      # @return [Boolean] Returns true if the given name is a valid
      #   Amazon SimpleDB domain name.
      # @api private
      def valid_domain_name? name
        self.class.valid_domain_name?(name)
      end

      # @param [String] name
      # @return [Boolean] Returns true if the given name is a valid
      #   Amazon SimpleDB domain name.
      def self.valid_domain_name? name
        name.to_s =~ /^[a-z_\-\.]{3,255}$/i ? true : false
      end

    end

    class Client::V20090415 < Client

      define_client_methods('2009-04-15')

    end
  end
end
