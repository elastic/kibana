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
  class SNS

    # A module to enrich {Message} based on it originating from AutoScaling,
    # which have a particular subject and message payload.
    # Parses such messages into a more rich representation.
    module FromAutoScaling
      def self.extended base
        base.origin = :autoscaling
      end

      # @return [Boolean] true when the SNS originates from auto-scaling
      def applicable? sns
        sns['Subject'] =~ /.*autoscaling:.*/i
      end

      module_function :applicable?

      def body
        return @body if defined? @body
        @body = self.parse_from self.raw['Message']
      end

      # @return [Symbol] the auto-scaling event name
      def event
        return @event if defined? @event
        e = body['Event']
        @event = case
          when e =~ /EC2_INSTANCE_TERMINATE/ then :ec2_instance_terminate
          when e =~ /EC2_INSTANCE_TERMINATE_ERROR/ then :ec2_instance_terminate_error
          when e =~ /EC2_INSTANCE_LAUNCH/ then :ec2_instance_launch
          when e =~ /EC2_INSTANCE_LAUNCH_ERROR/ then :ec2_instance_launch_error
          when e =~ /TEST_NOTIFICATION/ then :test_notification
          else :unknown
        end
      end

      # @return [String] the auto-scaling group name
      def group_name
        body['AutoScalingGroupName']
      end

      def status_code
        body['StatusCode']
      end

      # @return [String] the instance-ID that is the subject of this event
      def instance_id
        body['EC2InstanceId']
      end

      # TODO: Further methods to fully expose what AS-SNS' carry as payload.
    end
  end
end
