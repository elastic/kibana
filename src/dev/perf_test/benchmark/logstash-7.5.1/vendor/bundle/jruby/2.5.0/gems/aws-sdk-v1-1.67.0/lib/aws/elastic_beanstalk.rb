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

require 'aws/core'
require 'aws/elastic_beanstalk/config'

module AWS

  # Provides an expressive, object-oriented interface to AWS Elastic Beanstalk.
  #
  # ## Credentials
  #
  # You can setup default credentials for all AWS services via
  # AWS.config:
  #
  #     AWS.config(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # Or you can set them directly on the ElasticBeanstalk interface:
  #
  #     beanstalk = AWS::ElasticBeanstalk.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # @!attribute [r] client
  #   @return [Client] the low-level ElasticBeanstalk client object
  class ElasticBeanstalk

    autoload :Client, 'aws/elastic_beanstalk/client'
    autoload :Errors, 'aws/elastic_beanstalk/errors'

    include Core::ServiceInterface

    endpoint_prefix 'elasticbeanstalk'

  end

end
