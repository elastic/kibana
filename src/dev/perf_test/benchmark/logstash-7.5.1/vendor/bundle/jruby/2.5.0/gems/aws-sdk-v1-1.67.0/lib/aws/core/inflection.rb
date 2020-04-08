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
  module Core

    # @api private
    module Inflection

      def ruby_name aws_name

        inflector = Hash.new do |hash,key|

          key.
            sub(/^.*:/, '').                          # strip namespace
            gsub(/([A-Z0-9]+)([A-Z][a-z])/, '\1_\2'). # split acronyms
            scan(/[a-z]+|\d+|[A-Z0-9]+[a-z]*/).       # split words
            join('_').downcase                        # join parts

        end

        # add a few irregular inflections
        inflector['ETag'] = 'etag'
        inflector['s3Bucket'] = 's3_bucket'
        inflector['s3Key'] = 's3_key'
        inflector['Ec2KeyName'] = 'ec2_key_name'
        inflector['Ec2SubnetId'] = 'ec2_subnet_id'
        inflector['Ec2VolumeId'] = 'ec2_volume_id'
        inflector['Ec2InstanceId'] = 'ec2_instance_id'
        inflector['ElastiCache'] = 'elasticache'
        inflector['NotificationARNs'] = 'notification_arns'

        inflector[aws_name]

      end
      module_function :ruby_name

      def class_name(name)
        name.sub(/^(.)/) { |m| m.upcase }.
          gsub(/[-_]([a-z])/i) { |m| m[1,1].upcase }
      end
      module_function :class_name

    end
  end
end
