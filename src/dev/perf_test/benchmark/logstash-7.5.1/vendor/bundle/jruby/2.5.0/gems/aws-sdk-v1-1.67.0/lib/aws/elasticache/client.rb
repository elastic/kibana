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
  class ElastiCache

    # Client class for Amazon ElastiCache.
    class Client < Core::QueryClient

      API_VERSION = '2014-09-30'

      signature_version :Version4, 'elasticache'

      # @api private
      CACHEABLE_REQUESTS = Set[]

    end

    class Client::V20130615 < Client
      define_client_methods('2013-06-15')
    end

    class Client::V20140324 < Client
      define_client_methods('2014-03-24')
    end

    class Client::V20140715 < Client
      define_client_methods('2014-07-15')
    end

    class Client::V20140930 < Client
      define_client_methods('2014-09-30')
    end
  end
end
