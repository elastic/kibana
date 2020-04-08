## 4.0.0
  - Make 'clones' a required option

## 3.0.6
  - Added a warning when 'clones' is empty since that results in a no-op https://github.com/logstash-plugins/logstash-filter-clone/issues/14

## 3.0.5
  - Update gemspec summary

## 3.0.4
  - Fix some documentation issues

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
  - Republish all the gems under jruby.
## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
## 2.0.6
 - internal,deps: Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.5
 - internal,deps: New dependency requirements for logstash-core for the 5.0 release

## 2.0.4
 - internal,test: fixed spec for UTF-8 encoding.

## 2.0.2
 - internal,test: Update tests to remove obsolete options

## 2.0.0
 - internal: Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - internal,deps: Dependency on logstash-core update to 2.0

