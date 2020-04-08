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

    module FilteredCollection

      def initialize options = {}
        @filters = options[:filters] || []
        super
      end

      # Specify one or more criteria to filter elastic IP addresses by.
      # A subsequent call to #each will limit the results returned
      # by provided filters.
      #
      #   * Chain multiple calls of #filter together to AND multiple conditions
      #     together.
      #   * Supply multiple values to a singler #filter call to OR those
      #     value conditions together.
      #   * '*' matches one or more characters and '?' matches any one
      #     character.
      #
      def filter filter_name, *values
        filters = @filters.dup
        filters << { :name => filter_name, :values => values.flatten }
        collection_with(:filters => filters)
      end

      # @api private
      def filtered_request client_method, options = {}, &block
        options[:filters] = @filters unless @filters.empty?
        client.send(client_method, options)
      end

      protected
      def vpc_id_option options
        vpc_id = options[:vpc]
        vpc_id ||= options[:vpc_id]
        vpc_id ||= filter_value_for('vpc-id')
        vpc_id = vpc_id.id if vpc_id.is_a?(VPC)
        vpc_id
      end

      protected
      def subnet_id_option options
        subnet_id = options.delete(:subnet)
        subnet_id ||= options[:subnet_id]
        subnet_id ||= filter_value_for('subnet-id')
        subnet_id = subnet_id.id if subnet_id.is_a?(Subnet)
        subnet_id
      end

      protected
      def filter_value_for filter_name
        @filters.each do |filter|
          return filter[:values].first if filter[:name] == filter_name
        end
        nil
      end

      # @api private
      protected
      def preserved_options
        { :config => config, :filters => @filters }
      end

      # @api private
      protected
      def collection_with(options = {})
        self.class.new(preserved_options.merge(options))
      end

    end
  end
end
