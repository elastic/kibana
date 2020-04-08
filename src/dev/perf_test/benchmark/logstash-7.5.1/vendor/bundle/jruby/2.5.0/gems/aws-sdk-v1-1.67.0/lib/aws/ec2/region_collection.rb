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

    # Represents all the regions available to your account.
    #
    # @example Getting a map of endpoints by region name
    #   ec2.regions.inject({}) { |m, r| m[r.name] = r.endpoint; m }
    class RegionCollection < Collection

      # @yield [Region] Each region that is available to your account.
      # @return [nil]
      def each
        response = filtered_request(:describe_regions)
        response.region_info.each do |r|
          region = Region.new(r.region_name,
                              :endpoint => r.region_endpoint,
                              :config => config)
          yield(region)
        end
        nil
      end

      # @return [Region] The region identified by the given name
      #   (e.g. "us-west-2").
      def [](name)
        super
      end

      # @api private
      protected
      def member_class
        Region
      end

    end

  end
end
