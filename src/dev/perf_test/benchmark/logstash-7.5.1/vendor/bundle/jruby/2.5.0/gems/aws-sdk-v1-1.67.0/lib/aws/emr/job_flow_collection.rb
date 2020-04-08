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
  class EMR

    # # Creating a Job Flow
    #
    # Call {#create} to run a new job flow.
    #
    #     emr = AWS::EMR.new
    #
    #     job_flow = emr.job_flows.create('name',
    #       :instances => {
    #         :instance_count => 2,
    #         :master_instance_type => 'm1.small',
    #         :slave_instance_type => 'm1.small',
    #       }
    #     )
    #
    # # Getting a Job Flow
    #
    # You can get a job flow by its ID.
    #
    #     job_flow = emr.job_flows['j-123456678'] # makes no request
    #     job_flow.exists? #=> true/false
    #
    # # Enumerating Job Flows
    #
    # You can enumerate all job flows, or filter them.
    #
    #     # all job flows
    #     job_flows.each {|job_flow| ... }
    #
    #     # only job flows with a particular state
    #     job_flows.with_state('ENDED').each {|job_flow| ... }
    #
    # The filtering methods include:
    #
    # * {#with_id}
    # * {#with_state}
    # * {#created_before}
    # * {#created_after}
    #
    class JobFlowCollection

      include Core::Collection::Simple

      # @api private
      def initialize options = {}
        @filters = options[:filters] || {}
        super
      end

      # @param [String] job_flow_id
      # @return [JobFlow] Returns a {JobFlow} with the given ID.
      def [] job_flow_id
        JobFlow.new(job_flow_id, :config => config)
      end

      # Runs a job flow.
      #
      #     job_flow = emr.job_flows.create('name',
      #       :instances => {
      #         :instance_count => 2,
      #         :master_instance_type => 'm1.small',
      #         :slave_instance_type => 'm1.small',
      #       }
      #     )
      #
      # See {Client#run_job_flow} for documentation on the complete
      # list of accepted options.
      # @param [String] name
      # @param [Hash] options
      # @see (Client#run_job_flow)
      # @return [JobFlow]
      def create name, options = {}

        options[:name] = name
        options[:ami_version] ||= 'latest'
        options[:instances] ||= {}

        resp = client.run_job_flow(options)

        self[resp.data[:job_flow_id]]

      end
      alias_method :run, :create

      # Returns a new collection that will only enumerate job flows that have
      # one of the given ids.
      #
      #     emr.job_flows.with_id('id1', 'id2', 'id3').each do |job_flow|
      #       # ...
      #     end
      #
      # @param [String] ids One or more job flow ids to use as a filter.
      # @return [JobFlowCollection]
      def with_id *ids
        filter(:job_flow_ids, ids.flatten)
      end

      # Returns a new collection that will only enumerate job flows that have
      # one of the given job flow states.
      #
      #     emr.job_flows.with_state('SHUTTING_DOWN', 'TERMINATED').each do |job|
      #       # ...
      #     end
      #
      # @param [String] states One or more job flow states to use as a filter.
      # @return [JobFlowCollection]
      def with_state *states
        filter(:job_flow_states, states.flatten)
      end

      # Returns a new collection that will only enumerate job flows that
      # were created before the given time.
      #
      #     # enumerate jobs that are more than an hour old
      #     emr.job_flows.created_before(Time.now - 3600).each{|job| ... }
      #
      # @param [Time,DateTime,Date,Integer] time
      # @return [JobFlowCollection]
      def created_before time
        filter(:created_before, time.to_i)
      end

      # Returns a new collection that will only enumerate job flows that
      # were created after the given time.
      #
      #     # enumerate jobs that are at most 1 hour old
      #     emr.job_flows.created_after(Time.now - 3600).each{|job| ... }
      #
      # @param [Time,DateTime,Date,Integer] time
      # @return [JobFlowCollection]
      def created_after time
        filter(:created_after, time.to_i)
      end

      # @param [String,Symbol] name
      # @param [Mixed] value
      # @return [JobFlowCollection]
      def filter name, value
        options = {}
        options[:filters] = @filters.merge(name.to_s.to_sym => value)
        options[:config] = config
        JobFlowCollection.new(options)
      end

      protected

      def _each_item options = {}, &block

        resp = client.describe_job_flows(@filters.merge(options))
        resp.data[:job_flows].each do |details|

          job_flow = JobFlow.new_from(
            :describe_job_flows,
            details,
            details[:job_flow_id],
            :config => config)

          yield(job_flow)

        end
      end

    end
  end
end
