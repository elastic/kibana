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


require 'date'
require 'time'

module AWS
  class RDS
    class DBInstanceCollection

      include Core::Collection::WithLimitAndNextToken

      # @param [String] db_instance_id The DB instance identifier.
      #   This should be a lowercase string.
      # @return [DBInstance] Returns a {DBInstance} with the given ID.
      def [] db_instance_id
        DBInstance.new(db_instance_id.to_s.downcase, :config => config)
      end

      # Creates a database instance.  See {Client#create_db_instance}
      # for documentation on the accepted (and required) options.
      # @param [String] db_instance_id The DB instance identifier.
      #   This should be a lowercase string.
      # @param [Hash] options
      # @option (see Client#create_db_instance)
      # @return [DBInstance]
      def create db_instance_id, options = {}

        options[:db_instance_identifier] = db_instance_id

        resp = client.create_db_instance(options)

        DBInstance.new_from(:create_db_instance, resp,
          resp[:db_instance_identifier], :config => config)

      end

      protected

      def _each_item marker, max_records, options = {}, &block

        options[:marker] = marker if marker
        options[:max_records] = [[20,max_records].max,100].min if max_records

        response = client.describe_db_instances(options)
        response.data[:db_instances].each do |details|

          db_instance = DBInstance.new_from(
              :describe_db_instances,
              details,
              details[:db_instance_identifier],
              :config => config)

          yield(db_instance)

        end

        response.data[:marker]

      end

    end
  end
end
