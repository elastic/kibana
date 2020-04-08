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

require 'aws/core'
require 'aws/cloud_watch/config'

module AWS

  # This class is the starting point for working with Amazon CloudWatch.
  #
  # To use Amazon CloudWatch you must first
  # [sign up here](http://aws.amazon.com/cloudwatch/).
  #
  # For more information about Amazon CloudWatch:
  #
  # * [Amazon CloudWatch](http://aws.amazon.com/cloudwatch/)
  # * [Amazon CloudWatch Documentation](http://aws.amazon.com/documentation/cloudwatch/)
  #
  # # Credentials
  #
  # You can setup default credentials for all AWS services via
  # AWS.config:
  #
  #     AWS.config(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # Or you can set them directly on the AWS::CloudWatch interface:
  #
  #     cw = AWS::CloudWatch.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # # Using the Client
  #
  # AWS::CloudWatch does not provide higher level abstractions for CloudWatch at
  # this time.  You can still access all of the API methods using
  # {AWS::CloudWatch::Client}.  Here is how you access the client and make
  # a simple request:
  #
  #     cw = AWS::CloudWatch.new
  #
  #     resp = cw.client.describe_alarms
  #     resp[:metric_alarms].each do |alarm|
  #       puts alarm[:alarm_name]
  #     end
  #
  # See {Client} for documentation on all of the supported operations.
  #
  # @!attribute [r] client
  #   @return [Client] the low-level CloudWatch client object
  class CloudWatch

    autoload :Alarm, 'aws/cloud_watch/alarm'
    autoload :AlarmCollection, 'aws/cloud_watch/alarm_collection'
    autoload :AlarmHistoryItem, 'aws/cloud_watch/alarm_history_item'
    autoload :AlarmHistoryItemCollection, 'aws/cloud_watch/alarm_history_item_collection'
    autoload :Client, 'aws/cloud_watch/client'
    autoload :Errors, 'aws/cloud_watch/errors'
    autoload :Metric, 'aws/cloud_watch/metric'
    autoload :MetricCollection, 'aws/cloud_watch/metric_collection'
    autoload :MetricAlarmCollection, 'aws/cloud_watch/metric_alarm_collection'
    autoload :MetricStatistics, 'aws/cloud_watch/metric_statistics'

    include Core::ServiceInterface

    endpoint_prefix 'monitoring'

    # Puts data for a metric.  The metric is created if it does not already
    # exist.
    #
    #     cw.put_metric_data(
    #       :namespace => 'test/cli',
    #       :metric_data => [
    #         { :metric_name => 'sample', :value => 1 },
    #         { :metric_name => 'sample', :value => 2 },
    #         { :metric_name => 'sample', :value => 3 },
    #         { :metric_name => 'sample', :value => 4 },
    #         { :metric_name => 'sample', :value => 5 },
    #       ]
    #     )
    #
    # @param [Hash] options
    # @see Client#put_metric_data
    # @return [nil]
    #
    def put_metric_data options = {}
      client.put_metric_data(options)
      nil
    end

    # @return [AlarmCollection]
    def alarms
      AlarmCollection.new(:config => config)
    end

    # @return [AlarmHistoryItemCollection]
    def alarm_history_items
      AlarmHistoryItemCollection.new(:config => config)
    end

    # @return [MetricCollection]
    def metrics options = {}
      MetricCollection.new(options.merge(:config => config))
    end

  end
end
