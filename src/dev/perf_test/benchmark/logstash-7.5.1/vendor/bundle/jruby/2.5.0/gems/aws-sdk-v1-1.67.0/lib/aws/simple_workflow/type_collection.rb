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

    # The base class for {WorkflowTypeCollection} and {ActivityTypeCollection}.
    # @api private
    class TypeCollection

      include OptionFormatters
      include Core::Collection::WithLimitAndNextToken

      # @param [Domain] domain The domain the (workflow or activity types
      #   belong to.
      def initialize domain, options = {}

        @domain = domain

        @named = options[:named]

        @registration_status = options[:registration_status] ?
          options[:registration_status].to_s.upcase : 'REGISTERED'

        @reverse_order = options.key?(:reverse_order) ?
          !!options[:reverse_order] : false

        super

      end

      # @return [Domain]
      attr_reader :domain

      # Returns the type with the given name and version.
      #
      #     # get a workflow type
      #     domain.workflow_types['name','version']
      #     domain.workflow_types.at('name','version')
      #
      #     # get an activity type
      #     domain.activity_types['name','version']
      #     domain.activity_types.at('name','version')
      #
      # @param [String] name Name of the type.
      #
      # @param [String] version Version of the type.
      #
      # @return [ActivityType,WorkflowType]
      #
      def [] name, version
        member_class.new(domain, name, version)
      end
      alias_method :at, :[]

      def register
        raise NotImplementedError # implemented in subclasses
      end
      alias_method :create, :register

      # @return [TypeCollection] Returns a collection that
      #   will only enumerate deprecated types.
      def deprecated
        collection_with(:registration_status => 'DEPRECATED')
      end

      # @return [TypeCollection] Returns a collection that
      #   enumerates types in reverse alphabetical order.  Default
      #   ordering is alphabetical.
      def reverse_order
        collection_with(:reverse_order => true)
      end

      # @return [TypeCollection] Returns a collection that
      #   enumerates types with the given name.  Each instance
      #   will have a different version.
      def named name
        collection_with(:named => name.to_s)
      end

      protected
      def collection_with options = {}
        self.class.new(domain, {
          :registration_status => @registration_status,
          :reverse_order => @reverse_order,
          :named => @named,
          :config => config,
        }.merge(options))
      end

      protected
      def member_class
        name = self.class.name.split(/::/).last.sub(/Collection/, '')
        SimpleWorkflow.const_get(name)
      end

      protected
      def _each_item next_token, limit, options = {}, &block

        options[:domain] = domain.name
        options[:next_page_token] = next_token if next_token
        options[:maximum_page_size] = limit if limit
        options[:registration_status] ||= @registration_status
        options[:name] ||= @named if @named # may be nil
        options[:reverse_order] = @reverse_order unless
          options.has_key?(:reverse_order)


        ruby_name = Core::Inflection.ruby_name(member_class.name)
        type_key = member_class.type_key
        client_method = :"list_#{ruby_name}s"

        response = client.send(client_method, options)
        response.data['typeInfos'].each do |desc|

          type = member_class.new_from(client_method, desc, domain,
            desc[type_key]['name'],
            desc[type_key]['version'])

          yield(type)

        end

        response.data['nextPageToken']

      end

    end
  end
end
