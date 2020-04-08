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
  class EC2

    # # Getting Export Tasks
    #
    # Allows you to enumerate export tasks.
    #
    #     ec2.export_tasks.each do |task|
    #       # yield ExportTask objects
    #     end
    #
    # You can also get an export task by id
    #
    #     task = ec2.export_tasks['export-task-id']
    #
    # # Creating Export Tasks
    #
    # To create an export task you start with the {Instance}:
    #
    #     task = ec2.instances['i-12345678'].export_to_s3('bucket-name')
    #
    # See {Instance#export_to_s3} for more options.
    #
    class ExportTaskCollection < Collection

      include Core::Collection::Simple

      # @param [String] export_task_id
      # @return [ExportTask] Returns reference to the export task with the
      #   given export task id.
      def [] export_task_id
        ExportTask.new(export_task_id, :config => config)
      end

      protected

      def _each_item options = {}, &block
        resp = filtered_request(:describe_export_tasks, options, &block)
        resp.data[:export_task_set].each do |details|

          task = ExportTask.new_from(
            :describe_export_tasks,
            details,
            details[:export_task_id],
            :config => config)

          yield(task)

        end
      end

    end
  end
end
