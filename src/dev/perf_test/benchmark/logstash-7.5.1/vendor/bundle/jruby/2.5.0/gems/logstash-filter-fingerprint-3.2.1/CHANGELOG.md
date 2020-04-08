## 3.2.1
  - Fixed concurrent SHA fingerprinting by making the instances thread local

## 3.2.0
  - Added support for non-keyed, regular hash functions [#18](https://github.com/logstash-plugins/logstash-filter-fingerprint/issues/18)

## 3.1.2
  - Update gemspec summary

## 3.1.1
  - Fix some documentation issues

## 3.1.0
  - Add new setting `concatenate_all_fields`

## 3.0.4
  - Documentation improvements

## 3.0.3
  - improve documentation and register exception messaging

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
 - internal: Republish all the gems under jruby.

## 3.0.0
 - internal,deps: Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.0.5
 - internal,deps: Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.4
 - internal,deps: New dependency requirements for logstash-core for the 5.0 release

## 2.0.3
 - internal,cleanup: Eager loading of libraries, optimizations and cleanups https://github.com/logstash-plugins/logstash-filter-fingerprint/pull/10

## 2.0.0
 - internal: Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - internal,deps: Dependency on logstash-core update to 2.0

