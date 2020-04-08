## 4.3.0
  - Drop strict value validation for region option #36
  - Add endpoint option to customize the endpoint uri #32
  - Allow user to provide a role to assume #27
  - Update aws-sdk dependency to '~> 2'

## 4.2.4
  - Minor config validation fixes

## 4.2.3
  - Fix some documentation issues

## 4.2.1
  - Add eu-west-2, us-east-2 and ca-central-1 regions

## 4.2.0
  - Add region ap-south-1

## 4.1.0
  - Update aws-sdk to ~> 2.3.0

## 4.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 4.0.1
  - Republish all the gems under jruby.
## 4.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 2.0.4
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.0.3
  - New dependency requirements for logstash-core for the 5.0 release
## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully, 
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

# 1.0.1
  * Correctly set proxy options on V2 of the aws-sdk

# 1.0.0
  * Allow to use either V1 or V2 of the `AWS-SDK` in your plugins. Fixes: https://github.com/logstash-plugins/logstash-mixin-aws/issues/8
