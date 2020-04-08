## 3.2.4
 - Added support for OS regular expressions that use backreferences [#59](https://github.com/logstash-plugins/logstash-filter-useragent/pull/59)

## 3.2.3
 - Update source mapping to latest from uap-core ([#53](https://github.com/logstash-plugins/logstash-filter-useragent/issues/53))

## 3.2.2
  - Update gemspec summary

## 3.2.1
  - Fix some documentation issues

## 3.2.0
  - Update regex source with more recent modifications

## 3.1.3
  - Fixed an issue where concurrent event parsing failed randomly

## 3.1.2
  - Yanked because of broken Gem release missing a file

## 3.1.1
  - Fixed an issue preventing the plugin from working with a custom regex yaml file.

## 3.1.0
  - Parser performance increase of a factor of about 2.5 by moving core parser logic from Ruby to Java
  - Lower memory footprint of Java implementation allowed for increasing the default parser cache size from 1k to 100k
    without an increase in memory consumption

## 3.0.3
  - Move one log message from info to debug to avoid noise

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
  - Republish all the gems under jruby.
## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 2.0.8
  - Revert addition of Mutex. This plugin now depends on jruby having threadsafe regexps
# 2.0.7
  - Add Mutex to help on non-threadsafe JRuby versions
# 2.0.6
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.0.5
  - New dependency requirements for logstash-core for the 5.0 release
## 2.0.4
 - Refactored field references, fixed specs and some cleanups

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

## 2.0.1
  - Add ability to replace source with target

## 1.1.0
  - Add LRU cache
