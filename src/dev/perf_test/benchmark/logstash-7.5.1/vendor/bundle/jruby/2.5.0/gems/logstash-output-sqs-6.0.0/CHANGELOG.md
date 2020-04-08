## 6.0.0
  - Removed obsolete fields `batch` and `batch_timeout`
  - Removed workaround to JRuby bug (see more [here](https://github.com/jruby/jruby/issues/3645))

## 5.1.2
  - Added the ability to send to a different account id's queue. [#30](https://github.com/logstash-plugins/logstash-output-sqs/pull/30)

## 5.1.1
  - Docs: Set the default_codec doc attribute.

## 5.1.0
  - Add documentation for endpoint, role_arn and role_session_name #29

## 5.0.2
  - Update gemspec summary

## 5.0.1
  - Fix some documentation issues

## 5.0.0
  - Breaking: mark deprecated `batch` and `batch_timeout` options as obsolete

## 4.0.1
  - Docs: Fix doc generation issue by removing extraneous comments.

## 4.0.0
  - Add unit and integration tests.
  - Adjust the sample IAM policy in the documentation, removing actions which are not actually required by the plugin. Specifically, the following actions are not required: `sqs:ChangeMessageVisibility`, `sqs:ChangeMessageVisibilityBatch`, `sqs:GetQueueAttributes` and `sqs:ListQueues`.
  - Dynamically adjust the batch message size. SQS allows up to 10 messages to be published in a single batch, however the total size of the batch is limited to 256KiB (see [Limits in Amazon SQS](http://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/limits-messages.html)). This plugin will now dynamically adjust the number of events included in each batch to ensure that the total batch size does not exceed `message_max_size`. Note that any single messages which exceeds the 256KiB size limit will be dropped.
  - Move to the new concurrency model, `:shared`.
  - The `batch_timeout` parameter has been deprecated because it no longer has any effect.
  - The individual (non-batch) mode of operation (i.e. `batch => false`) has been deprecated. Batch mode is vastly more performant and we do not believe that there are any use cases which require non-batch mode. You can emulate non-batch mode by setting `batch_events => 1`, although this will call `sqs:SendMessageBatch` with a batch size of 1 rather than calling `sqs:SendMessage`.
  - The plugin now implements `#multi_receive_encoded` and no longer uses `Stud::Buffer`.
  - Update the AWS SDK to version 2.

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
  - Republish all the gems under jruby.
## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 2.0.5
  - Add travis config and build status
  - Require the AWS mixin to be higher than 1.0.0
# 2.0.4
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.0.3
  - New dependency requirements for logstash-core for the 5.0 release
## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

