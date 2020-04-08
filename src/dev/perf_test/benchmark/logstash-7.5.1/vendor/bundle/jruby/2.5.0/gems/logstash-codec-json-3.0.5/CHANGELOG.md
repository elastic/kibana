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
# 2.1.4
  - Made 'Falling back to plain-text' log message an 'info' level log. This was
    'error' for versions v2.1.0 through v2.1.3 (and was 'info' before that).

# 2.1.3
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.1.2
  - New dependency requirements for logstash-core for the 5.0 release
## 2.1.1
 - Properly require 'logstash/event' for use in unit tests

## 2.1.0
 - Backward compatible support for `Event#from_json` method https://github.com/logstash-plugins/logstash-codec-json/pull/21

## 2.0.4
 - Reduce the size of the gem by removing the vendor files

## 2.0.3
 - fixed a spec, no change in functionality

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

## 1.1.0
  - Handle scalar types (string/number) and be more defensive about crashable errors

## 1.0.1
  - Handle JSON arrays at source root by emitting multiple events
