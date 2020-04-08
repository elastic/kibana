## 1.0.10
  - Fixed driver loading [#35](https://github.com/logstash-plugins/logstash-filter-jdbc_streaming/pull/35)

## 1.0.9
  - Added support for prepared statements [PR 32](https://github.com/logstash-plugins/logstash-filter-jdbc_streaming/pull/32)
  - Added support for `sequel_opts` to pass options to the 3rd party Sequel library.

## 1.0.8
  - Added support for driver loading in JDK 9+ [Issue 25](https://github.com/logstash-plugins/logstash-filter-jdbc_streaming/issues/25)
  - Added support for multiple driver jars [Issue #21](https://github.com/logstash-plugins/logstash-filter-jdbc_streaming/issues/21)

## 1.0.7
  - Fixed formatting in documentation [#17](https://github.com/logstash-plugins/logstash-filter-jdbc_streaming/pull/17) and [#28](https://github.com/logstash-plugins/logstash-filter-jdbc_streaming/pull/28)

## 1.0.6
  - Fixes connection leak in pipeline reloads by properly disconnecting on plugin close

## 1.0.5
   - [#11](https://github.com/logstash-plugins/logstash-filter-jdbc_streaming/pull/11) Swap out mysql for postgresql for testing

## 1.0.4
   - [JDBC input - #263](https://github.com/logstash-plugins/logstash-input-jdbc/issues/263) Load the driver with the system class loader. Fixes issue loading some JDBC drivers in Logstash 6.2+

## 1.0.3
  - Update gemspec summary

## 1.0.2
  - Fix some documentation issues

## 1.0.0
 - Initial release
 - Added LRU + TTL Cache
