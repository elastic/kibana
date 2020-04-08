## 4.0.7
  - Docs: Set the default_codec doc attribute.

## 4.0.6
  - Update gemspec summary

## 4.0.5
  - Fix some documentation issues

## 4.0.3
  - Mark this output as thread safe to allow concurrent connections to AWS.

## 4.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 4.0.1
  - Republish all the gems under jruby.
## 4.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 3.0.4
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 3.0.3
  - New dependency requirements for logstash-core for the 5.0 release
## 3.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

# 1.0.1
  * Properly trim messages for AWS without breaking unicode byte boundaries

# 1.0.0
  * Full refactor.
  * This plugin now uses codecs for all formatting. The 'format' option has now been removed. Please use a codec.
# 0.1.5
  * If no `subject` are specified fallback to the %{host} key (https://github.com/logstash-plugins/logstash-output-sns/pull/2)
  * Migrate the SNS Api to use the AWS-SDK v2
