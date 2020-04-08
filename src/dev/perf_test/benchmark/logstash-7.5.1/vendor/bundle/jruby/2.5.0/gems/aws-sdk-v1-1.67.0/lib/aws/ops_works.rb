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
require 'aws/ops_works/config'

module AWS

  class OpsWorks

    autoload :Client, 'aws/ops_works/client'
    autoload :Errors, 'aws/ops_works/errors'

    include Core::ServiceInterface

    endpoint_prefix 'opsworks'

  end
end
