## 3.1.7
  - Fixed numeric values, optimized @target verification, cleanups and specs [36](https://github.com/logstash-plugins/logstash-filter-split/pull/36)

## 3.1.6
  - Fix crash on arrays with null values

## 3.1.5
  - Update gemspec summary

## 3.1.4
  - Fix some documentation issues

## 3.1.3
  - Improved performance by no longer cloning the source field if it is the same as the target field
## 3.1.1
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.1.0
  - Log and tag attempts to split invalid types instead of crashing logstash
## 3.0.1
  - Republish all the gems under jruby.
## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 2.0.4
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.0.3
  - New dependency requirements for logstash-core for the 5.0 release
## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0
