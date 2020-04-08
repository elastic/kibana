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
  class CloudFront

    class Client < Core::RESTXMLClient

      API_VERSION = '2014-11-06'

      signature_version :Version4, 'cloudfront'

      # @api private
      CACHEABLE_REQUESTS = Set[]

    end

    class Client::V20130512 < Client
      define_client_methods('2013-05-12')
    end

    class Client::V20130826 < Client
      define_client_methods('2013-08-26')
    end

    class Client::V20130927 < Client
      define_client_methods('2013-09-27')
    end

    class Client::V20131111 < Client
      define_client_methods('2013-11-11')
    end

    class Client::V20131122 < Client
      define_client_methods('2013-11-22')
    end

    class Client::V20140131 < Client
      define_client_methods('2014-01-31')
    end

    class Client::V20140531 < Client
      define_client_methods('2014-05-31')
    end

    class Client::V20141021 < Client
      define_client_methods('2014-10-21')
    end

    class Client::V20141106 < Client
      define_client_methods('2014-11-06')
    end

  end
end
