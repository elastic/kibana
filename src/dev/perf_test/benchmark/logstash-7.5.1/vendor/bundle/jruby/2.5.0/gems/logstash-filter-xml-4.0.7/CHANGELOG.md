## 4.0.7
  - Fixed creation of empty arrays when xpath failed [#59](https://github.com/logstash-plugins/logstash-filter-xml/pull/59)

## 4.0.6
  - Fixed force_array behavior with nested elements [#57](https://github.com/logstash-plugins/logstash-filter-xml/pull/57)

## 4.0.5
  - Update gemspec summary

## 4.0.4
  - Fix some documentation issues

## 4.0.2
  - Fix a bug that, when the plugin tried to report an invalid configuration, would report the following instead of the real error:
    translation missing: en.logstash.agent.configuration.invalid_plugin_register

## 4.0.1
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 4.0.0
  - breaking,config: New configuration `suppress_empty`. Default to true change default behaviour of the plugin in favor of avoiding mapping conflicts when reaching elasticsearch
  - config: New configuration `force_content`. By default the filter expands attributes differently from content in xml elements.
    This option allows you to force text content and attributes to always parse to a hash value.
  - config: Ensure that `target` is set when storing xml content in the event (`store_xml => true`)

## 3.0.1
  - Republish all the gems under jruby.

## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.1.4
  - Added setting to disable forcing single values to be added in arrays. Ref: https://github.com/logstash-plugins/logstash-filter-xml/pull/28.

## 2.1.3
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.1.2
  - New dependency requirements for logstash-core for the 5.0 release

## 2.1.1
 - Refactored field references, code cleanups

## 2.1.0
 - Support for namespace declarations to use parsing the XML document

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0
