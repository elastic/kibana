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
require 'aws/elb/config'

module AWS

  # Provides an expressive, object-oriented interface to Elastic Load
  # Balancing (ELB).
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
  # Or you can set them directly on the ELB interface:
  #
  #     elb = AWS::ELB.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # @!attribute [r] client
  #   @return [Client] the low-level ELB client object
  class ELB

    autoload :AvailabilityZoneCollection, 'aws/elb/availability_zone_collection'
    autoload :BackendServerPolicyCollection, 'aws/elb/backend_server_policy_collection'
    autoload :Client, 'aws/elb/client'
    autoload :Errors, 'aws/elb/errors'
    autoload :InstanceCollection, 'aws/elb/instance_collection'
    autoload :ListenerOpts, 'aws/elb/listener_opts'
    autoload :Listener, 'aws/elb/listener'
    autoload :ListenerCollection, 'aws/elb/listener_collection'
    autoload :LoadBalancer, 'aws/elb/load_balancer'
    autoload :LoadBalancerCollection, 'aws/elb/load_balancer_collection'
    autoload :LoadBalancerPolicy, 'aws/elb/load_balancer_policy'
    autoload :LoadBalancerPolicyCollection, 'aws/elb/load_balancer_policy_collection'

    include Core::ServiceInterface

    endpoint_prefix 'elasticloadbalancing'

    # @return [LoadBalancerCollection] Returns a collection that represents
    #   all of your load balancers.
    def load_balancers
      LoadBalancerCollection.new(:config => config)
    end

  end

end
