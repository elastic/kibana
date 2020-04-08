## 3.0.7
  - Docs: Set the default_codec doc attribute.

## 3.0.6
  - Update gemspec summary

## 3.0.5
  - Fix some documentation issues

## 3.0.3
  - Use new Logsash 2.4/5.0 APIs for working batchwise and with shared concurrency (fix for https://github.com/logstash-plugins/logstash-output-csv/issues/10)
  - this update aligns with its subclass logstash-output-file version 4.0.0, https://github.com/logstash-plugins/logstash-output-file

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
  - Republish all the gems under jruby.

## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.0.5
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.4
  - New dependency requirements for logstash-core for the 5.0 release

## 2.0.3
 - Escape rogue values by default, which can be interpreted by spreadsheet apps. Add option to turn it off

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0
