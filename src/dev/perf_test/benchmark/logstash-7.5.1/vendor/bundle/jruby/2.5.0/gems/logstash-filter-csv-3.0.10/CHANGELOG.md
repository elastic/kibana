## 3.0.10
  - Fix asciidoc formatting for example [#73](https://github.com/logstash-plugins/logstash-filter-csv/pull/73)

## 3.0.9
  - Document that the `autodetect_column_names` and `skip_header` options work only when the number of Logstash
  pipeline workers is set to `1`.
  
## 3.0.8
  - feature: Added support for tagging empty rows which users can reference to conditionally drop events

## 3.0.7
  - Update gemspec summary

## 3.0.6
  - Fix a bug where `[nested][field]` references were incorrectly used. (#24, #52)

## 3.0.5
  - Fix some documentation issues

## 3.0.3
  - generate Timestamp objects for correctly converted :date and :date_time fields with related specs.

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
  - Republish all the gems under jruby.
## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
## 2.1.3
 - internal,deps: Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.1.2
 - internal,deps: New dependency requirements for logstash-core for the 5.0 release

## 2.1.1
 - internal,cleanup: Fixed field references, refactors converters, code cleanups

## 2.1.0
 - feature: Added support for not parsing columns without a defined header.
 - feature: Added support for dropping columns that has no value
 - feature: Added support for type conversion within the filter
 - bugfix: Fix unnecessary source field mutation. Fixes #18
 - internal,test: Refactored specs to avoid using sample and insist in favor of rspec3
   helper methods.

## 2.0.0
 - internal: Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - internal,deps: Dependency on logstash-core update to 2.0
