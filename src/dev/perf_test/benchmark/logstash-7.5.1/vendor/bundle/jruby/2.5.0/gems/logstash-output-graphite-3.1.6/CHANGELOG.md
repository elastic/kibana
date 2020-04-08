## 3.1.6
  - Fixed exception handling during socket writing to prevent logstash termination [#33](https://github.com/logstash-plugins/logstash-output-graphite/pull/33)

## 3.1.5
  - Docs: Set the default_codec doc attribute.

## 3.1.4
  - Update gemspec summary

## 3.1.3
  - Fix some documentation issues

## 3.1.1
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.1.0
 - breaking,config: Remove deprecated config `debug`.

## 3.0.1
 - Republish all the gems under jruby.

## 3.0.0
 - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.0.5
 - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.4
 - New dependency requirements for logstash-core for the 5.0 release

## 2.0.3
 - Fixed empty/nil messages handling

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

## 1.0.2
 - Added support for sprintf in field formatting

## 1.0.1
 - Added support for nested hashes as values
 