## 4.2.6
  - Removed JRuby check when using FIFOs [#75](https://github.com/logstash-plugins/logstash-output-file/pull/75)

## 4.2.5
  - Fix a bug introduced in v4.2.4 where events on low-volume pipelines could remain unflushed for long periods when `flush_interval` was non-zero [#70](https://github.com/logstash-plugins/logstash-output-file/pull/70)

## 4.2.4
  - Fix a bug where flush interval was being called for each event when enabled [#67](https://github.com/logstash-plugins/logstash-output-file/pull/67)

## 4.2.3
  - Docs: Set the default_codec doc attribute.

## 4.2.2
  - Add feature `write_behavior` to the documentation #58

## 4.2.1
  - Bugfix: Move require of flores into the spec file instead of main file.rb

## 4.2.0
  - New `write_behavior` feature. Value can be "append" (default) or
    "overwrite". If "append", events will be appended to the end of the file.
    If "overwrite", the file will only contain the last event written.

## 4.1.2
  - Update gemspec summary

## 4.1.1
  - Fix some documentation issues

## 4.1.0
  - Remove obsolete option `message_format`

## 4.0.1
  - Move one log message from info to debug to avoid noise

## 4.0.0
  - Make 'message_format' option obsolete
  - Use new Logsash 2.4/5.0 APIs for working batchwise and with shared concurrency

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
  - Republish all the gems under jruby.
## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 2.2.5
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.2.4
  - New dependency requirements for logstash-core for the 5.0 release
## 2.2.3
  - Rename Dir.exists? to Dir.exist? to fix deprecation warning
  - Allow setting dir and file permissions

## 2.2.1
 - Fixed specs to not depend on pipeline ordering

## 2.2.1
 - Fixed Time specs

## 2.2.0
 - Add support for codec, using **json_lines** as default codec to keep default behavior.
   Ref: https://github.com/logstash-plugins/logstash-output-file/pull/9

## 2.1.0
 - Add create_if_deleted option to create a destination file in case it
   was deleted by another agent in the machine. In case of being false
   the system will add the incomming messages to the failure file.

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0
