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
  class SimpleWorkflow

    # Base class for {WorkflowType} and {ActivityType} objects.
    class Type < Resource

      # @param [Domain] domain The domain this type is registered to.
      # @param [String] name The name of this type.
      # @param [String] version The version of this type.
      def initialize domain, name, version, options = {}
        @domain = domain
        @name = name.to_s
        @version = version.to_s
        super
      end

      # @return [Domain] Returns the domain this type is registered to.
      attr_reader :domain

      # @return [String] Returns the name of this type.
      attr_reader :name

      # @return [String] Returns the version of this type.
      attr_reader :version

      # Deprecates the type.
      #
      # After a type has been deprecated, you cannot create new
      # executions of that type. Executions that were started before the
      # type was deprecated will continue to run.
      #
      # @note This operation is eventually consistent. The results are best
      #   effort and may not exactly reflect recent updates and changes.
      #
      # @return [nil]
      #
      def deprecate
        client.send("deprecate_#{self.class.ruby_name}", resource_options)
        nil
      end
      alias_method :delete, :deprecate

      # @return [Boolean] Returns true if the type is deprecated.
      def deprecated?
        status == :deprecated
      end

      protected
      def resource_identifiers
        [[:domain,domain.name], [:name,name], [:version,version]]
      end

      protected
      def resource_options
        {
          :domain => domain.name,
          :"#{self.class.ruby_name}" => {
            :name => name,
            :version => version
          }
        }
      end

      protected
      def self.ruby_name
        Core::Inflection.ruby_name(name.split(/::/).last)
      end

      protected
      def self.type_key
        "#{ruby_name.split(/_/).first}Type"
      end

    end
  end
end
