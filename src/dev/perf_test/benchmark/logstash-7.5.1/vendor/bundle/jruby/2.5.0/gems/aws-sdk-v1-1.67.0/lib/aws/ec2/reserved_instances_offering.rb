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
    class ReservedInstancesOffering < Resource

      ATTRIBUTES = [
        :instance_type,
        :availability_zone,
        :duration,
        :fixed_price,
        :usage_price,
        :product_description,
        :instance_tenancy,
        :currency_code,
        :recurring_charges,
        :offering_type,
      ]

      include TaggedItem

      def initialize id, options = {}
        @id = id
        super
      end

      # @return [String] The id of this reserved instance offering.
      attr_reader :id

      ATTRIBUTES.each do |attr_name|
        attribute(attr_name, :static => true)
      end

      populates_from(:describe_reserved_instances_offerings) do |resp|
        resp.reserved_instances_offerings_set.find do |r|
          r.reserved_instances_offering_id == id
        end
      end

      def purchase options = {}
        options[:instance_count] = 1 unless options[:instance_count]
        options[:reserved_instances_offering_id] = id
        response = client.purchase_reserved_instances_offering(options)
        ReservedInstances.new(response.reserved_instances_id, :config => config)
      end

    end
  end
end
