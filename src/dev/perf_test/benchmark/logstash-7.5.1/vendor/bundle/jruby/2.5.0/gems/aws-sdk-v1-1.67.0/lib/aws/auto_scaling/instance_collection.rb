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
  class AutoScaling

    # Allows you to enumerate Auto Scaling instances.
    #
    #     auto_scaling = AWS::AutoScaling.new
    #     auto_scaling.instances.each do |instance|
    #       # ...
    #     end
    #
    # You can also get an Auto Scaling instance by its EC2 instance id.
    #
    #     auto_scaling_instance = auto_scaling.instances['i-12345678']
    #     auto_scaling_instance.class #=> AWS::AutoScaling::Instance
    #
    class InstanceCollection

      include Core::Collection::WithLimitAndNextToken

      # @param [String] instance_id An {EC2::Instance} id string.
      # @return [AutoScaling::Instance]
      def [] instance_id
        Instance.new(instance_id, :config => config)
      end

      protected

      def _each_item next_token, limit, options = {}, &block

        options[:next_token] = next_token if next_token
        options[:max_records] = limit if limit

        resp = client.describe_auto_scaling_instances(options)
        resp.auto_scaling_instances.each do |details|

          instance = Instance.new_from(
            :describe_auto_scaling_instances,
            details,
            details.instance_id,
            :config => config)

          yield(instance)

        end
        resp.data[:next_token]
      end

    end
  end
end
