## 4.0.4
  - Update gemspec summary

## 4.0.3
  - Fix some documentation issues

## 4.0.1
  - fix racing condition that causes logstash to crash under heavy load conditions

## 4.0.0
  - Full reimplementation of the plugin. The plugin is now thread-safe and properly tracks past events.
  - Updated tests and added runtime dependencies

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
 - internal: Republish all the gems under jruby.

## 3.0.0
 - internal,deps: Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.0.4
 - internal,deps: Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.3
 - internal,deps: New dependency requirements for logstash-core for the 5.0 release

## 2.0.0
 - internal: Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully, 
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - internal,deps: Dependency on logstash-core update to 2.0
