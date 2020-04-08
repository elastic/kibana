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
  class CloudFormation

    # # Stack Summaries
    #
    # Stack summaries contain information about CloudFormation
    # stacks.  You can filter the stacks you want summary information
    # for by one or more statuses.  You can even get information
    # about deleted stacks for up to 90 days.
    #
    # ## Enumerating Stack Summaries
    #
    # You can enumerate all available summaries using enumerable
    # methods.  Yielded summaries are simple hashes.
    #
    #     cfm = AWS::CloudFormation.new
    #     cfm.stack_summaries.each do |summary|
    #       puts summary.to_yaml
    #     end
    #
    # ## Filtering Stack Summaries
    #
    # You can optionally provide one or more stack stasus values
    # to filter the results by.  Only stacks with the given status(es)
    # will be enumerated.
    #
    #     cfm.stack_summaries.with_status(:create_failed).each do |summary|
    #       # ...
    #     end
    #
    #     # enumerate stacks with various delete statuses
    #     statuses = %w(delete_in_progress delete_failed delete_complete)
    #     cf.stack_summaries.with_status(statuses).each do |summary|
    #       # ...
    #     end
    class StackSummaryCollection

      include Core::Collection::WithNextToken

      # @api private
      def initialize options = {}
        @filters = options[:filters]
        super
      end

      # Limits the stacks summaries that are enumerated.
      #
      #     cfm.stack_summaries.with_status(:create_complete).each do |summary|
      #       puts summary[:stack_name]
      #     end
      #
      # You can provide multiple statuses:
      #
      #     statuses = [:create_failed, :rollback_failed]
      #     cfm.stack_summaries.with_status(statuses).each do |summary|
      #       puts summary[:stack_name]
      #     end
      #
      # Status names may be symbolized (snake-cased) or upper-cased strings
      # (e.g. :create_in_progress, 'CREATE_IN_PROGRESS').
      #
      # @param [Symbol,String] status_filters One or more statuses to filter
      #   stacks with. Valid values include:
      #
      #     * `:create_in_progress`
      #     * `:create_failed`
      #     * `:create_complete`
      #     * `:rollback_in_progress`
      #     * `:rollback_failed`
      #     * `:rollback_complete`
      #     * `:delete_in_progress`
      #     * `:delete_failed`
      #     * `:delete_complete`
      #     * `:update_in_progress`
      #     * `:update_complete_cleanup_in_progress`
      #     * `:update_complete`
      #     * `:update_rollback_in_progress`
      #     * `:update_rollback_failed`
      #     * `:update_rollback_complete_cleanup_in_progress`
      #     * `:update_rollback_complete`
      #
      # @return [StackSummaryCollection] Returns a new stack summary
      #   collection that restricts what stack summariess will be
      #   enumerated.
      #
      def with_status *status_filters
        StackSummaryCollection.new(
          :filters => status_filters.flatten.map(&:to_s).map(&:upcase),
          :config => config)
      end

      protected

      def _each_item next_token, options = {}, &block

        options[:next_token] = next_token if next_token
        options[:stack_status_filter] = @filters if @filters

        resp = client.list_stacks(options)
        resp.data[:stack_summaries].each do |summary|
          yield(summary)
        end

        resp.data[:next_token]

      end

    end
  end
end
