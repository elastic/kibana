## 4.2.0
 -  Added: support for timeout_scope [#153](https://github.com/logstash-plugins/logstash-filter-grok/pull/153)

## 4.1.1
 - Fix formatting for code sample [#148](https://github.com/logstash-plugins/logstash-filter-grok/pull/148)

## 4.1.0
 - Changed timeout handling using the Timeout class [#147](https://github.com/logstash-plugins/logstash-filter-grok/pull/147)

## 4.0.4
  - Added info and link to documentation for logstash-filter-dissect as another option for extracting unstructured event data into fields
  [#144](https://github.com/logstash-plugins/logstash-filter-grok/issues/144)

## 4.0.3
  - Fixed memory leak when run on JRuby 1.x (Logstash 5.x) [#135](https://github.com/logstash-plugins/logstash-filter-grok/issues/135)
  
## 4.0.2
  - Fixed resource leak where this plugin might get double initialized during plugin reload, leaking a thread + some objects

## 4.0.1
  - Fix a potential race

## 4.0.0
  - Major performance improvements due to reduced locking

## 3.4.5
  - version yanked due to breaking changes within .patch release cause logstash crashes in < 5.6

## 3.4.4
  - Update gemspec summary

## 3.4.3
  - Fix some documentation issues

## 3.4.1
  - Fix subdirectories in a pattern folder causing an exception in some cases

## 3.4.0
  - Add option to define patterns inline in the filter using `pattern_definitions` configuration.

## 3.3.1
  - Docs: indicate that grok patterns are loaded when the pipeline is created

## 3.3.0
  - Allow timeout enforcer to be disabled by setting timeout_millis to nil
  - Change default timeout_millis to 30s

## 3.2.4
  - Fix mutex interruption bug that could crash logstash. See: https://github.com/logstash-plugins/logstash-filter-grok/issues/97

## 3.2.3
  - No longer use 'trace' log level as it breaks rspec
  - Fix race conditions in timeout enforcer

## 3.2.3
  - Move one log message from info to debug to avoid noise

## 3.2.1
  - Fix race condition in TimeoutEnforcer that could cause crashes
  - Fix shutdown code to close cleanly and properly close the enforcer

## 3.2.0
  - Add new timeout options to cancel grok execution if a threshold time is exceeded

## 3.1.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.1.1
 - Added metrics for failed, matched and number of patters per field.

## 3.1.0
 - breaking,config: Remove deprecated config `singles`.
 - breaking,config: Remove deprecated config `pattern`. Please use `match => { "message" => ""}` syntax.

## 3.0.1
 - internal: Republish all the gems under jruby.

## 3.0.0
 - internal,deps: Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.0.5
 - internal,deps: Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.4
 - internal,deps: New dependency requirements for logstash-core for the 5.0 release

## 2.0.3
 - internal: fix fieldref assignment to avoid assumption on mutable object

## 2.0.0
 - internal: Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - internal,deps: Dependency on logstash-core update to 2.0
