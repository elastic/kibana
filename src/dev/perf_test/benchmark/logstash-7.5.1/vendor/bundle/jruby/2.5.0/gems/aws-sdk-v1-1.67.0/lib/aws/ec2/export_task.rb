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

    # @attr_reader [String] description
    #   Description of the resource being exported.
    #
    # @attr_reader [Symbol] state State of the conversion task.
    #   Valid values :active, :cancelling, :cancelled and :completed.
    #
    # @attr_reader [String] status_message Status message related to the
    #   export task.
    #
    # @attr_reader [String] instance_id ID of instance being exported.
    #
    # @attr_reader [String] target_environment The target virtualization
    #   environment.
    #
    # @attr_reader [String] disk_image_format The format for the exported
    #   image.
    #
    # @attr_reader [String] container_format The container format used to
    #   combine disk images with metadata (such as OVF).
    #
    # @attr_reader [String] s3_bucket The name of the Amazon S3 bucket
    #   the image will be exported to.
    #
    # @attr_reader [String] s3_key The key of the Amazon S3 object
    #   the image will be exported to.
    #
    class ExportTask < Resource

      # @api private
      def initialize export_task_id, options = {}
        @export_task_id = export_task_id
        super
      end

      # @return [String]
      attr_reader :export_task_id

      alias_method :id, :export_task_id

      attribute :description, :static => true

      attribute :state, :to_sym => true

      attribute :status_message

      attribute :instance_id,
        :from => [:instance_export, :instance_id],
        :static => true

      attribute :target_environment,
        :from => [:instance_export, :target_environment],
        :static => true

      attribute :disk_image_format,
        :from => [:export_to_s3, :disk_image_format],
        :static => true

      attribute :container_format,
        :from => [:export_to_s3, :container_format],
        :static => true

      attribute :s3_bucket_name,
        :from => [:export_to_s3, :s3_bucket],
        :static => true

      attribute :s3_key,
        :from => [:export_to_s3, :s3_key],
        :static => true

      populates_from(:create_instance_export_task) do |resp|
        resp[:export_task] if resp[:export_task][:export_task_id] == id
      end

      populates_from(:describe_export_tasks) do |resp|
        resp[:export_task_set].find do |task|
          task[:export_task_id] == id
        end
      end

      # @return [Instance]
      def instance
        Instance.new(instance_id, :config => config)
      end

      # @return [S3::Bucket]
      def s3_bucket
        S3::Bucket.new(s3_bucket_name, :config => config)
      end

      # @return [S3::S3Object]
      def s3_object
        s3_bucket.objects[s3_key]
      end

      # Cancels the export task.
      # @return [nil]
      def cancel
        client.cancel_export_task(:export_task_id => export_task_id)
        nil
      end

    end
  end
end
