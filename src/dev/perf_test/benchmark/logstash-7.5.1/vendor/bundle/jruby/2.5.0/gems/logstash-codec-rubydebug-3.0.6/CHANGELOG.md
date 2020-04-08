## 3.0.6
 - Fixes crash that could occur on startup if `$HOME` was unset or if `${HOME}/.aprc` was unreadable by pinning `awesome_print` dependency to a release before the bug was introduced.

## 3.0.5
  - Update gemspec summary

## 3.0.4
  - Asciidoc fixes
  
## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
  - Republish all the gems under jruby.
## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 2.0.7
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.0.6
  - New dependency requirements for logstash-core for the 5.0 release
## 2.0.5
 - monkey patch ActiveSupport in specs so awesome_print does not use a non existing method
## 2.0.4
 - remove LogStash::Timestamp coloring
## 2.0.3
 - Colorize LogStash::Timestamp as green
## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

