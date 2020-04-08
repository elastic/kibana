## 3.4.0
 - Added ability to directly convert from integer and float to boolean [#127](https://github.com/logstash-plugins/logstash-filter-mutate/pull/127)

## 3.3.4
 - Changed documentation to clarify execution order and to provide workaround 
 [#128](https://github.com/logstash-plugins/logstash-filter-mutate/pull/128)

## 3.3.3
 - Changed documentation to clarify use of `replace` config option [#125](https://github.com/logstash-plugins/logstash-filter-mutate/pull/125)

## 3.3.2
 - Fix: when converting to `float` and `float_eu`, explicitly support same range of inputs as their integer counterparts; eliminates a regression introduced in 3.3.1 in which support for non-string inputs was inadvertently removed.

## 3.3.1
 - Fix: Number strings using a **decimal comma** (e.g. 1,23), added convert support to specify integer_eu and float_eu.

## 3.3.0
 - feature: Added capitalize feature.

## 3.2.0
  - Support boolean to integer conversion #107

## 3.1.7
  - Update gemspec summary

## 3.1.6
  - Fix some documentation issues

## 3.1.4
 - feature: Allow to copy fields.

## 3.1.3
 - Don't create empty fields when lower/uppercasing a non-existant field

## 3.1.2
 - bugfix: split method was not working, #78

## 3.1.1
 - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.1.0
 - breaking,config: Remove deprecated config `remove`. Please use generic `remove_field` instead.

## 3.0.1
 - internal: Republish all the gems under jruby.

## 3.0.0
 - internal,deps: Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.0.6
 - internal,test: Temp fix for patterns path in tests

## 2.0.5
 - internal,deps: Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.4
 - internal,deps: New dependency requirements for logstash-core for the 5.0 release

## 2.0.3
 - internal,cleanup: Code cleanups and fix field assignments

## 2.0.0
 - internal: Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - internal,deps: Dependency on logstash-core update to 2.0

## 1.0.2
 - bugfix: Fix for uppercase and lowercase fail when value is already desired case
 - internal,test: Modify tests to prove bug and verify fix.

## 1.0.1
 - bugfix: Fix for uppercase and lowercase malfunction
 - internal,test: Specific test to prove bug and fix.
