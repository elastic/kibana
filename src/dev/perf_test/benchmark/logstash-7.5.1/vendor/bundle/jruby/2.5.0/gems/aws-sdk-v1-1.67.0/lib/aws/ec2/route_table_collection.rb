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

    class RouteTableCollection < Collection

      include TaggedCollection
      include Core::Collection::Simple

      # Creates a route table.
      #
      # @param [Hash] options
      #
      # @option options [VPC,String] :vpc The vpc or vpc id of where you want
      #   to create the route table.
      #
      # @return [RouteTable]
      #
      def create options = {}

        client_opts = {}
        client_opts[:vpc_id] = vpc_id_option(options)

        resp = client.create_route_table(client_opts)

        RouteTable.new_from(:create_route_table, resp.route_table,
          resp.route_table.route_table_id, :config => config)

      end

      # @param [String] route_table_id
      # @return [RouteTable]
      def [] route_table_id
        RouteTable.new(route_table_id, :config => config)
      end

      # @return [RouteTable] Returns the main (default) route table.
      #   This route table is automatically assigned to new subnets
      #   and can not be deleted.
      def main_route_table
        @main = AWS.memoize { self.find {|rt| rt.main? } } if @main.nil?
        @main
      end

      protected
      def _each_item options = {}, &block
        response = filtered_request(:describe_route_tables, options, &block)
        response.route_table_set.each do |t|

          route_table = RouteTable.new_from(:describe_route_tables, t,
            t.route_table_id, :config => config)

          yield(route_table)

        end
      end

    end
  end
end
