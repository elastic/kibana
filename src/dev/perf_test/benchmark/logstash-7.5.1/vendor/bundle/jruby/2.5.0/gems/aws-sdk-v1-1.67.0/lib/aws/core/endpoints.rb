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

require 'json'

module AWS
  module Core
    # Provides a read-only interface to the bundled endpoints.json file.
    module Endpoints

      def hostname(region, endpoint_prefix)
        region = endpoints["regions"][region] || {}
        endpoint = region[endpoint_prefix] || {}
        endpoint["hostname"]
      end
      module_function :hostname

      def endpoints
        @endpoints ||= begin
          JSON.parse(File.read(File.join(AWS::ROOT, 'endpoints.json')))
        end
      end
      module_function :endpoints

    end
  end
end
