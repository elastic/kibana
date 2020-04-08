## 3.3.0
  - Updated library to gelfd2 [#48](https://github.com/logstash-plugins/logstash-input-gelf/pull/48)

## 3.2.0
  - Fixed shutdown handling, robustness in socket closing and restarting, json parsing, code DRYing and cleanups [62](https://github.com/logstash-plugins/logstash-input-gelf/pull/62)

## 3.1.1
  - Docs: Set the default_codec doc attribute.

## 3.1.0
  - Add support for listening on TCP socket

## 3.0.7
  - Update gemspec summary

## 3.0.6
  - Fix some documentation issues

## 3.0.5
  - No user impact: bump development/testing dependency 'gelf' to v3.0.0

## 3.0.4
  - Docs: Update doc examples to use new event API syntax 

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
  - Republish all the gems under jruby.
## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
## 2.0.8
  - Make the `Event.from_json` return a single element instead of an array and make this plugin works under 5.0
## 2.0.7
  - Fix failing test caused by reverting Java Event back to Ruby Event
## 2.0.6
  - Fix plugin crash when Logstash::Json fails to parse a message, https://github.com/logstash-plugins/logstash-input-gelf/pull/27
## 2.0.5
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
## 2.0.4
  - New dependency requirements for logstash-core for the 5.0 release
## 2.0.3
 - Fix Timestamp coercion to preserve upto microsecond precision, https://github.com/logstash-plugins/logstash-input-gelf/pull/35
## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0
