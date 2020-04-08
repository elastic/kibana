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
  class EMR

    #
    # @attr_reader [String] name
    #   The name of the job flow.
    #
    # @attr_reader [String] ami_version
    #   The version of the AMI used to initialize Amazon EC2 instances in
    #   the job flow.
    #
    # @attr_reader [String,nil] log_uri
    #   The location in Amazon S3 where log files for the job are stored.
    #
    # @attr_reader [Array<String>] supported_products
    #   A list of strings set by third party software when the job flow is
    #   launched. If you are not using third party software to manage the
    #   job flow this value is empty.
    #
    # @attr_reader [Array<Hash>] bootstrap_actions
    #
    # @attr_reader [String] state
    #
    # @attr_reader [Time] created_at
    #
    # @attr_reader [Time] started_at
    #
    # @attr_reader [Time] ready_at
    #
    # @attr_reader [Time] ended_at
    #
    # @attr_reader [String] last_state_change_reason
    #
    # @attr_reader [String] master_instance_type
    #
    # @attr_reader [String] master_public_dns_name
    #
    # @attr_reader [String] master_instance_id
    #
    # @attr_reader [String] slave_instance_id
    #
    # @attr_reader [Integer] instance_count
    #
    # @attr_reader [Integer] normalized_instance_hours
    #
    # @attr_reader [String] ec2_key_name
    #
    # @attr_reader [String] ec2_subnet_id
    #
    # @attr_reader [String] availability_zone_name
    #
    # @attr_reader [Boolean] keep_job_flow_alive_when_no_steps
    #
    # @attr_reader [Boolean] termination_protected
    #
    # @attr_reader [String] hadoop_version
    #
    # @attr_reader [Array<Hash>] instance_group_details
    #
    # @attr_reader [Array<Hash>] step_details
    #
    class JobFlow < Core::Resource

      # @param [String] job_flow_id
      # @param [Hash] options
      # @api private
      def initialize job_flow_id, options = {}
        @job_flow_id = job_flow_id
        super
      end

      # @return [String]
      attr_reader :job_flow_id

      alias_method :id, :job_flow_id

      attribute :name, :static => true

      attribute :ami_version, :static => true

      attribute :log_uri, :static => true

      attribute :supported_products, :static => true

      # attributes from :execution_status_detail

      attribute :state,
        :from => [:execution_status_detail, :state]

      attribute :creation_date_time,
        :from => [:execution_status_detail, :creation_date_time],
        :static => true,
        :alias => :created_at

      attribute :start_date_time,
        :from => [:execution_status_detail, :start_date_time],
        :alias => :started_at

      attribute :ready_date_time,
        :from => [:execution_status_detail, :ready_date_time],
        :alias => :ready_at

      attribute :end_date_time,
        :from => [:execution_status_detail, :end_date_time],
        :alias => :ended_at

      attribute :last_state_change_reason,
        :from => [:execution_status_detail, :last_state_change_reason]

      # attributes from :instances

      attribute :master_instance_type,
        :from => [:instances, :master_instance_type]

      attribute :master_public_dns_name,
        :from => [:instances, :master_public_dns_name]

      attribute :master_instance_id,
        :from => [:instances, :master_instance_id]

      attribute :slave_instance_type,
        :from => [:instances, :slave_instance_type]

      attribute :instance_count,
        :from => [:instances, :instance_count]

      attribute :normalized_instance_hours,
        :from => [:instances, :normalized_instance_hours]

      attribute :ec2_key_name,
        :from => [:instances, :ec2_key_name]

      attribute :ec2_subnet_id,
        :from => [:instances, :ec2_subnet_id]

      attribute :availability_zone_name,
        :from => [:instances, :placement, :availability_zone]

      attribute :keep_job_flow_alive_when_no_steps,
        :from => [:instances, :keep_job_flow_alive_when_no_steps],
        :alias => :keep_job_flow_alive_when_no_steps?

      attribute :termination_protected,
        :from => [:instances, :termination_protected],
        :alias => :termination_protected?

      attribute :hadoop_version,
        :from => [:instances, :hadoop_version]

      attribute :instance_group_details,
        :from => [:instances, :instance_groups]

      attribute :step_details, :from => :steps

      attribute :bootstrap_actions

      populates_from(:describe_job_flows) do |resp|
        resp.data[:job_flows].find{|j| j[:job_flow_id] == job_flow_id }
      end

      # @return [EC2::Instance,nil]
      def master_instance
        if instance_id = master_instance_id
          AWS::EC2.new(:config => config).instances[instance_id]
        end
      end

      # @return [EC2::Instance,nil]
      def slave_instance
        if instance_id = slave_instance_id
          AWS::EC2.new(:config => config).instances[instance_id]
        end
      end

      # @return [EC2::AvailabilityZone,nil]
      def availability_zone
        if name = availability_zone_name
          AWS::EC2.new(:config => config).availability_zones[name]
        end
      end

      # Adds one (or more) steps to the current job flow.
      #
      #     emr.job_flows['job-flow-id'].add_steps([{
      #       :name => 'step-name',
      #       :action_on_failure => 'TERMINATE_JOB_FLOW',
      #       :hadoop_jar_step => {
      #         :jar => 'path/to/a/jar/file',
      #         :main_class => 'MainClassName',
      #         :args => %w(arg1 arg2 arg3)],
      #         :properties => [
      #           { :key => 'property-1-name', :value => 'property-1-value' }
      #           { :key => 'property-2-name', :value => 'property-2-value' }
      #         ],
      #       }
      #     }])
      #     emr.job_flows['job-flow-id'].add_steps([{
      #
      # @param [Array<Hash>] steps A list of one or more steps to add.
      #   Each step should be a hash with the following structure:
      #   * `:name` - *required* - (String) The name of the job flow step.
      #   * `:action_on_failure` - (String) Specifies the action to take if the
      #     job flow step fails.
      #   * `:hadoop_jar_step` - *required* - (Hash) Specifies the JAR file
      #     used for the job flow step.
      #     * `:properties` - (Array<Hash>) A list of Java properties that are
      #       set when the step runs. You can use these properties to pass key
      #       value pairs to your main function.
      #       * `:key` - (String) The unique identifier of a key value pair.
      #       * `:value` - (String) The value part of the identified key.
      #     * `:jar` - *required* - (String) A path to a JAR file run during
      #       the step.
      #     * `:main_class` - (String) The name of the main class in the
      #       specified Java file. If not specified, the JAR file should
      #       specify a Main-Class in its manifest file.
      #     * `:args` - (Array<String>) A list of command line arguments passed
      #       to the JAR file's main function when executed.
      #
      # @return [nil]
      #
      def add_steps *steps
        options = {}
        options[:job_flow_id] = job_flow_id
        options[:steps] = steps.flatten
        client.add_job_flow_steps(options)
        nil
      end

      # @return [InstanceGroupCollection]
      def instance_groups
        InstanceGroupCollection.new(self)
      end

      # Locks this job flow so the Amazon EC2 instances in the cluster
      # cannot be terminated by user intervention, an API call, or in the
      # event of a job-flow error.
      # @return [nil]
      def enable_termination_protection
        set_termination_protection(true)
      end

      # Removes a lock on this job flow so the Amazon EC2 instances in the
      # cluster may be terminated.
      # @return [nil]
      def disable_termination_protection
        set_termination_protection(false)
      end

      # @param [Boolean] state
      # @return [nil]
      def set_termination_protection state
        options = {}
        options[:termination_protected] = state
        options[:job_flow_ids] = [job_flow_id]
        client.set_termination_protection(options)
        nil
      end

      # @param [Boolean] state
      # @return [nil]
      def set_visible_to_all_users state
        options = {}
        options[:visible_to_all_users] = state
        options[:job_flow_ids] = [job_flow_id]
        client.set_visible_to_all_users(options)
        nil
      end

      # Terminates the current job flow.
      # @return [nil]
      def terminate
        client.terminate_job_flows(:job_flow_ids => [job_flow_id])
        nil
      end
      alias_method :delete, :terminate

      # @return [Boolean] Returns `true` if the job flow exists.
      def exists?
        !get_resource.data[:job_flows].empty?
      end

      protected

      def resource_identifiers
        [[:job_flow_id, job_flow_id]]
      end

      def get_resource attr = nil
        client.describe_job_flows(:job_flow_ids => [job_flow_id])
      end

    end
  end
end
