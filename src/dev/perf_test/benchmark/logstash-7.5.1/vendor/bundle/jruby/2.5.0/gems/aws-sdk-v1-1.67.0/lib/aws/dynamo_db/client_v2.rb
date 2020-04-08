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

    # ClientV2 is now deprecated.  To use the lastest Amazon DynamoDB
    # api version, pass the :api_version option to AWS::DynamoDB::Client.new
    #
    #    AWS::DynamoDB::Client.new(:api_version => '2012-08-10')
    #    #=> #<AWS::DynamoDB::Client::V20120810>
    #
    #    # defaults to the oldest api version
    #    AWS::DynamoDB::Client.new
    #    #=> #<AWS::DynamoDB::Client::V20111205>
    #
    # @deprecated
    class ClientV2

      DEPRECATION_MSG = "DEPRECATION WARNING: AWS::DynamoDB::ClientV2 is deprecated, use AWS::DynamoDB::Client.new(:api_version => '2012-08-10')"

      class << self

        extend Core::Deprecations

        def new(options = {})
          Client.new(options.merge(:api_version => '2012-08-10'))
        end
        deprecated :new, :message => DEPRECATION_MSG

      end
    end
  end
end
