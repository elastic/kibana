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

    # The primary interface for registering, listing and deprecating
    # domains.
    #
    # ## Creating a Domain
    #
    # To create a domain you need to pass a unique name to #create.
    #
    #     domain = simple_workflow.domains.create('my-domain', :none)
    #     #=> #<AWS::SimpleWorkflow::Domain name:my-domain>
    #
    # ## Getting a Domain
    #
    # Domains are indexed by their name.
    #
    #     domain = simple_workflow.domains['my-domain']
    #
    # ## Enumerating Domains
    #
    # You can call Enumerable methods on a domain collection to iterate
    # the domains controlled by your account.
    #
    #     simple_workflow.domains.each {|domain| ... }
    #
    # By default only registered domains are enumerated.  If you would like
    # to enumerate deprecated (deleted) domains you need to pass the
    # `:deprecated` option.
    #
    #     # returns an array of names for all deprecated domains
    #     simple_workflow.domains.deprecated.map(&:name)
    #
    # See {AWS::Core::Collection} to see other useful methods you can
    # call against a domain collection (e.g. #enum, #page, #each_batch).
    #
    class DomainCollection

      include OptionFormatters
      include Core::Collection::WithLimitAndNextToken

      def initialize options = {}

        @registration_status = options[:registration_status] ?
          options[:registration_status].to_s.upcase : 'REGISTERED'

        @reverse_order = options.key?(:reverse_order) ?
          !!options[:reverse_order] : false

        super(options)

      end

      # Registers a new domain.
      #
      #     # register a domain named 'domain' that has no expiry on workflow
      #     # execution history
      #     domain = AWS::SimpleWorkflow.new.domains.register('domain', :none)
      #
      # @param [String] name Name of the domain to register. The name must
      #   be unique.
      #
      # @param [Integer,:none] retention_period A duration (in days)
      #   for which the record (including the history) of workflow
      #   executions in this domain should be kept by the service.
      #   After the retention period, the workflow execution will not be
      #   available in the results of visibility calls.
      #
      #   If you pass the symbol `:none` then there is no expiration for
      #   workflow execution history (effectively an infinite retention
      #   period).
      #
      # @param [Hash] options
      #
      # @option [String] :description (nil) Textual description of the domain.
      #
      # @return [Domain] Returns the newly created {Domain} object.
      #
      def register name, retention_period, options = {}

        client_opts = {}
        client_opts[:name] = name
        client_opts[:workflow_execution_retention_period_in_days] = retention_period
        client_opts[:description] = options[:description] if options[:description]

        duration_opts(client_opts, :workflow_execution_retention_period_in_days)
        client.register_domain(client_opts)

        client_opts[:retention_period] = retention_period.to_s =~ /^\d+$/ ?
          retention_period.to_i : retention_period.to_s.downcase.to_sym

        Domain.new(name, client_opts.merge(:config => config))

      end
      alias_method :create, :register

      # @return [Domain] Returns the domain with the given name.
      def [] name
        Domain.new(name, :config => config)
      end

      # @return [DomainCollection] Returns a domain collection that
      #   will only enumerate registered domains.
      def registered
        collection_with(:registration_status => 'REGISTERED')
      end

      # @return [DomainCollection] Returns a domain collection that
      #   will only enumerate deprecated (deleted) domains.
      def deprecated
        collection_with(:registration_status => 'DEPRECATED')
      end

      # @return [DomainCollection] Returns a domain collection that
      #   enumerates domains in reverse alphabetical order.  Default
      #   ordering is ascending alphabetical.
      def reverse_order
        collection_with(:reverse_order => true)
      end

      protected
      def collection_with options = {}
        self.class.new({
          :registration_status => @registration_status,
          :reverse_order => @reverse_order,
          :config => config,
        }.merge(options))
      end

      protected
      def _each_item next_token, limit, options = {}, &block

        options[:maximum_page_size] = limit if limit
        options[:next_page_token] = next_token if next_token
        options[:registration_status] ||= @registration_status
        options[:reverse_order] = @reverse_order unless
          options.has_key?(:reverse_order)

        response = client.list_domains(options)
        response.data['domainInfos'].each do |desc|

          domain = Domain.new_from(:list_domains, desc,
            desc['name'], :config => config)

          yield(domain)

        end

        response.data['nextPageToken']

      end

    end

  end
end
