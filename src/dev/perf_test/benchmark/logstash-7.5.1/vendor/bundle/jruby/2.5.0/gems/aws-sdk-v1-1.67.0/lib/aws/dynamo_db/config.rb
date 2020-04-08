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

AWS::Core::Configuration.module_eval do

  add_service 'DynamoDB', 'dynamo_db', 'dynamodb'

  add_option :dynamo_db_retry_throughput_errors, true, :boolean => true

  add_option :dynamo_db_big_decimals, true, :boolean => true

  add_option :dynamo_db_crc32, true, :boolean => true

end
