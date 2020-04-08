## 3.1.2
  - Added support for multiple events inside same message from SQS [#48](https://github.com/logstash-plugins/logstash-input-sqs/pull/48/files) 

## 3.1.1
  - Docs: Set the default_codec doc attribute.

## 3.1.0
  - Add documentation for endpoint, role_arn and role_session_name #46
  - Fix sample IAM policy to match to match the documentation #32

## 3.0.6
  - Update gemspec summary

## 3.0.5
  - Fix some documentation issues

## 3.0.3
  - Monkey-patch the AWS-SDK to prevent "uninitialized constant" errors.

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
  - Republish all the gems under jruby.
## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 2.0.5
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.0.4
  - New dependency requirements for logstash-core for the 5.0 release
## 2.0.3
 - Fixes #22, wrong key use on the stats object
## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully, 
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

# 1.1.0
- AWS ruby SDK v2 upgrade
- Replaces aws-sdk dependencies with mixin-aws
- Removes unnecessary de-allocation
- Move the code into smaller methods to allow easier mocking and testing
- Add the option to configure polling frequency
- Adding a monkey patch to make sure `LogStash::ShutdownSignal` doesn't get catch by AWS RetryError.
