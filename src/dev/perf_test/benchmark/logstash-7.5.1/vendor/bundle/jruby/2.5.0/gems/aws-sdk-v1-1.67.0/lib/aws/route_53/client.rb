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
  class Route53

    # Client class for Route53.
    class Client < Core::RESTXMLClient

      API_VERSION = '2013-04-01'

      signature_version :Version3Https

      # @api private
      CACHEABLE_REQUESTS = Set[]

    end

    class Client::V20121212 < Client
      define_client_methods('2012-12-12')
    end

    class Client::V20130401 < Client
      define_client_methods('2013-04-01')
    end

  end
end
