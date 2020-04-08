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
  class CloudSearch

    # Client class for Amazon Cloud Search.
    class Client < Core::QueryClient

      # The 2013 API is not backwards compatible with the 2011 API,
      # so we continue to default to the older version.
      API_VERSION = '2011-02-01'

      signature_version :Version4, 'cloudsearch'

      # @api private
      CACHEABLE_REQUESTS = Set[]

    end

    class Client::V20110201 < Client
      define_client_methods('2011-02-01')
    end

    class Client::V20130101 < Client
      define_client_methods('2013-01-01')
    end

  end
end
