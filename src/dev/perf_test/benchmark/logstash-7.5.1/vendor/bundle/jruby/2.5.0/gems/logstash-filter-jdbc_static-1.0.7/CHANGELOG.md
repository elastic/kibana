## 1.0.7
 - Fixed issue with driver verification using Java 11 [#51](https://github.com/logstash-plugins/logstash-filter-jdbc_static/pull/51)

## 1.0.6
 - Added info to documentation to emphasize significance of table order [36](https://github.com/logstash-plugins/logstash-filter-jdbc_static/pull/36)

## 1.0.5
 - Fixed issue where overly restrictive dependency on rufus scheduler was stopping Logstash from upgrading this plugin. [35](https://github.com/logstash-plugins/logstash-filter-jdbc_static/pull/35)

## 1.0.4
 - Fixed pipeline reload thread leak by implementing the correct close method to release resources [#34](https://github.com/logstash-plugins/logstash-filter-jdbc_static/pull/34)
 - Fixed error caused by code removed in latest version of Rufus scheduler by pinning dependency [#34](https://github.com/logstash-plugins/logstash-filter-jdbc_static/pull/34)

## 1.0.3
 - Fix [jdbc_static filter - #25](https://github.com/logstash-plugins/logstash-filter-jdbc_static/issues/25) When index_columns is not specified, the create table statement has a syntax error.
## 1.0.2
 - Fix [jdbc_static filter - #22](https://github.com/logstash-plugins/logstash-filter-jdbc_static/issues/22) Support multiple driver libraries.
 - Fixes for [jdbc_static filter - #18](https://github.com/logstash-plugins/logstash-filter-jdbc_static/issues/18), [jdbc_static filter - #17](https://github.com/logstash-plugins/logstash-filter-jdbc_static/issues/17), [jdbc_static filter - #12](https://github.com/logstash-plugins/logstash-filter-jdbc_static/issues/12) Use Java classloader to load driver jar. Use system import from file to loader local database. Prevent locking errors when no records returned.
 - Fix [jdbc_static filter - #8](https://github.com/logstash-plugins/logstash-filter-jdbc_static/issues/8) loader_schedule now works as designed.

## 1.0.1
 - Docs: Edit documentation

## 1.0.0
 - Initial commit
