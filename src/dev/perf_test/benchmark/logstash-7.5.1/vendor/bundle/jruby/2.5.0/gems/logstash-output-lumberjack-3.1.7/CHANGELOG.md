## 3.1.7
  - Docs: Set the default_codec doc attribute.

## 3.1.6
  - Update gemspec summary

## 3.1.5
  - Fix some documentation issues

## 3.1.4
  - Docs: Add plugin description

## 3.1.3
  - Docs: Bump patch level for doc build

## 3.1.2
  - Fix logging

## 3.1.1
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.1.0
 - breaking,config: Remove deprecated config `window_size`. Please use `flush_size`

## 3.0.1
 - Republish all the gems under jruby.

## 3.0.0
 - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.0.6
 - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.5
 - New dependency requirements for logstash-core for the 5.0 release

## 2.0.4
 - Update `ruby-lumberjack` dependency to 0.0.26

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully, 
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

## 1.0.1
 - Force dependencies of `ruby-lumberjack` to **0.0.23**, This version make sure the Client verify the server certificate.
