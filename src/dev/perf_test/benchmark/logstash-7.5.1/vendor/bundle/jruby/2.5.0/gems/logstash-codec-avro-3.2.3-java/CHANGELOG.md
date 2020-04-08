## 3.2.3
  - Update gemspec summary

## 3.2.2
  - Fix some documentation issues

## 3.2.0
 - Fixed an issue with the encoding that prevented certain fields from being serialized in a way compatible with the Kafka plugins

## 3.1.0
 - Introduce `tag_on_failure` option to tag events with `_avroparsefailure` instead of throwing an exception when decoding

## 3.0.0
 - breaking: Update to new Event API

## 2.0.4
 - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.3
 - New dependency requirements for logstash-core for the 5.0 release

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully, 
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

