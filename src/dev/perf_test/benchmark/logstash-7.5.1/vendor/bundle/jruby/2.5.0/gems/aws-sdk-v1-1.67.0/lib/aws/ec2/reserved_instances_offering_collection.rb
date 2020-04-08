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
  class EC2
    class ReservedInstancesOfferingCollection < Collection

      include TaggedCollection
      include Core::Collection::WithLimitAndNextToken

      def member_class
        ReservedInstancesOffering
      end

      protected

      def _each_item(next_token, max_results, options = {}, &block)
        options[:next_token] = next_token if next_token
        options[:max_results] = max_results if max_results
        resp = filtered_request(:describe_reserved_instances_offerings, options)
        resp.reserved_instances_offerings_set.each do |item|

          reserved_instance_offering = ReservedInstancesOffering.new_from(
            :describe_reserved_instances_offerings, item,
            item.reserved_instances_offering_id, :config => config)

          yield(reserved_instance_offering)

        end
        resp[:next_token]
      end

    end
  end
end
