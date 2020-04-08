## 3.0.8
  - Fixed deeplink to Elasticsearch Reference [#18](https://github.com/logstash-plugins/logstash-codec-es_bulk/pull/18)

## 3.0.7
  - Add documentation about use with http input

## 3.0.6
  - Update gemspec summary

## 3.0.5
  - Fix some documentation issues

## 3.0.3
  - Fixed issue with large bulk requests that were split into multiple chunks, which caused it to lose it's place in the decoding
  
## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

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

