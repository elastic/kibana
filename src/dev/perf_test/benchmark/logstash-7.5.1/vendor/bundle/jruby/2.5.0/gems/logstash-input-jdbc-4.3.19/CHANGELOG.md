## 4.3.19
  - Fixed issue where paging settings in configuration were not being honored [#361](https://github.com/logstash-plugins/logstash-input-jdbc/pull/361)

## 4.3.18
  - Fix issue with driver loading [#356](https://github.com/logstash-plugins/logstash-input-jdbc/pull/356)

## 4.3.17
  - Added documentation to provide more info about jdbc driver loading [#352](https://github.com/logstash-plugins/logstash-input-jdbc/pull/352)

## 4.3.16
  - Add support for prepared statements [Issue 233](https://github.com/logstash-plugins/logstash-input-jdbc/issues/233)

## 4.3.15
  - Use atomic booleam to load drivers once
  - Added CHANGELOG entries

## 4.3.14
  - Added support for driver loading in JDK 9+ [Issue 331](https://github.com/logstash-plugins/logstash-input-jdbc/issues/331)
  - Gem released without CHANGELOG additions

## 4.3.13
  - Changed documentation to generalize the PATH location [#297](https://github.com/logstash-plugins/logstash-input-jdbc/pull/297)

## 4.3.12
  - Added check to prevent count sql syntax errors when debug logging [Issue #287](https://github.com/logstash-plugins/logstash-input-jdbc/issue/287) and [Pull Request #294](https://github.com/logstash-plugins/logstash-input-jdbc/pull/294)

## 4.3.11
  - Fixed crash that occurs when receiving string input that cannot be coerced to UTF-8 (such as BLOB data) [#291](https://github.com/logstash-plugins/logstash-input-jdbc/pull/291)

## 4.3.10
  - [#284](https://github.com/logstash-plugins/logstash-input-jdbc/pull/284) Swap out mysql for postgresql for testing

## 4.3.9
  - Docs: Set the default_codec doc attribute.

## 4.3.8
  - [#273](https://github.com/logstash-plugins/logstash-input-jdbc/issues/273) Clarify use of use_column_value. Make last_run_metadata_path reference in record_last_run entry clickable.

## 4.3.7
  - [#263](https://github.com/logstash-plugins/logstash-input-jdbc/issues/263) Load the driver with the system class loader. Fixes issue loading some JDBC drivers in Logstash 6.2+

## 4.3.6
  - [#274](https://github.com/logstash-plugins/logstash-input-jdbc/issues/274) Fix regression with 4.3.5 that can result in NULL :sql_last_value depending on timestamp format

## 4.3.5
  - [#140](https://github.com/logstash-plugins/logstash-input-jdbc/issues/140) Fix long standing bug where setting jdbc_default_timezone loses milliseconds. Force all usage of sql_last_value to be typed according to the settings.

## 4.3.4
  - [#261](https://github.com/logstash-plugins/logstash-input-jdbc/issues/261) Fix memory leak.

## 4.3.3
  - [#255](https://github.com/logstash-plugins/logstash-input-jdbc/issues/255) Fix thread and memory leak.

## 4.3.2
  - [#251](https://github.com/logstash-plugins/logstash-input-jdbc/issues/251) Fix connection and memory leak.

## 4.3.1
  - Update gemspec summary

## 4.3.0
  - [#147](https://github.com/logstash-plugins/logstash-input-jdbc/issues/147) Open and close connection for each query

## 4.2.4
  - [#220](https://github.com/logstash-plugins/logstash-input-jdbc/issues/220) Log exception when database connection test fails
  - Database reconnect: Mark old connection as dead even when clean disconnect fails.

## 4.2.3
  - Fix some documentation issues

## 4.2.1
 - Fix bug where failed healthchecks would not call a non-existant method and suppress the real error

## 4.2.0
 - Automatically reconnect on connection issues
 - Fix test failures
 - Explicitly load identifier mangling from Sequel to prevent
   warning logs

## 4.1.3
 - Fix part1 of #172, coerce SQL DATE to LS Timestamp

## 4.1.2
 - [internal] Removed docker dependencies for testing

## 4.1.1
 - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 4.1.0
 - Add an option to select the encoding data should be transform from,
   this will make sure all strings read from the jdbc connector are
   noremalized to be UTF-8 so no causing issues with later filters in LS.

## 4.0.1
 - Republish all the gems under jruby.

## 4.0.0
 - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

# 3.0.3
 - Added feature to read password from external file (#120)

# 3.0.2
 - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

# 3.0.1
 - New dependency requirements for logstash-core for the 5.0 release
 - feature: Added configurable support for retrying database connection
   failures.

## 3.0.0
 - [#57](https://github.com/logstash-plugins/logstash-input-jdbc/issues/57) New feature: Allow tracking by a column value rather than by last run time.  **This is a breaking change**, as users may be required to change from using `sql_last_start` to use `sql_last_value` in their queries.  No other changes are required if you've been using time-based queries.  See the documentation if you wish to use an incremental column value to track updates to your tables.

## 2.1.1
 - [#44](https://github.com/logstash-plugins/logstash-input-jdbc/issues/44) add option to control the lowercase or not, of the column names.

## 2.1.0
 - [#85](https://github.com/logstash-plugins/logstash-input-jdbc/issues/85) make the jdbc_driver_library accept a list of elements separated by commas as in some situations we might need to load more than one jar/lib.
 - [#89](https://github.com/logstash-plugins/logstash-input-jdbc/issues/89) Set application timezone for cases where time fields in data have no timezone.

## 2.0.5
 - [#77](https://github.com/logstash-plugins/logstash-input-jdbc/issues/77) Time represented as RubyTime and not as Logstash::Timestamp

## 2.0.4
 - [#70](https://github.com/logstash-plugins/logstash-input-jdbc/pull/70) prevents multiple queries from being run at the same time
 - [#69](https://github.com/logstash-plugins/logstash-input-jdbc/pull/69) pass password as string to Sequel

## 2.0.3
 - Added ability to configure timeout
 - Added catch-all configuration option for any other options that Sequel lib supports

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

## 1.0.0
 - Initial release
