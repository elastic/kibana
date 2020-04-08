## 3.1.4
  - Docs: Set the default_codec doc attribute.

## 3.1.3
  - Update gemspec summary

## 3.1.2
  - Fix some documentation issues

## 3.1.0
  - Use new 'concurrency :single' for concurrency
  - Use pipeline encoded codec for greater parallelism
  - Require Logstash 2.4+ (Plugin API 1.60.1+)
## 3.0.1
  - Republish all the gems under jruby.
## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 2.0.6
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.0.5
  - New dependency requirements for logstash-core for the 5.0 release
## 2.0.4
- Properly declare workers_not_supported

## 2.0.3
 - removed unused code to fix specs

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

# 1.1.0
  - Add basic test ot the project
