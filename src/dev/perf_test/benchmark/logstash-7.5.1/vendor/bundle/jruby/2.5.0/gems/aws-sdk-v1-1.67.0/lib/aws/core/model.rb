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
  module Core

    # @api private
    module Model

      # @api private
      def initialize(*args)
        options = args.last.kind_of?(Hash) ? args.last : {}
        @config = case
        when options[:config] then options[:config]
        when args.first.respond_to?(:config) then args.first.config
        else AWS.config
        end
      end

      # @return [Configuration] Returns the configuration for this object.
      attr_reader :config

      # Each class including this module has its own client class.
      # Generally it is the service namespace suffixed by client:
      #
      # * s3_client
      # * simple_db_client
      #
      # @return Retruns the proper client class for the given model.
      def client
        @config.send("#{config_prefix}_client")
      end

      # @return [String] The short name of the service as used in coniguration.
      #   (e.g. SimpleDB::Client.config_prefix #=> 'simple_db')
      def config_prefix
        Inflection.ruby_name(self.class.to_s.split(/::/)[1])
      end

      # @return [String] A sensible default inspect string.
      def inspect
        "<#{self.class}>"
      end

      # @api private
      def to_yaml_properties
        instance_variables.map(&:to_s) - %w(@config)
      end

    end
  end
end
