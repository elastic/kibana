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
  class IAM

    # (see AWS::Core::Policy)
    class Policy < Core::Policy

      def to_h
        hash = super
        hash.delete('Id')
        hash['Statement'].each do |statement|
          statement.delete('Sid')
          statement.delete('Principal')
        end
        hash
      end

      class Statement < Core::Policy::Statement

        ACTION_MAPPING = { }

        protected
        def resource_arn resource
          case resource
          when User then resource.arn
          else super(resource)
          end
        end

      end

    end
  end
end
