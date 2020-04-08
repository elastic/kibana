## 3.1.9
  - Update gemspec summary

## 3.1.8
  - Fix some documentation issues

## 3.1.6
  - Fix #97 With "ISO8601" format and timezone interpolation, Joda complains at plugin startup
  - Fix skipped DST test, caused by incorrect year guess logic, see comment in test spec/filters/date_spec.rb:540

## 3.1.5
  - Ignore cancelled events

## 3.1.4
  - Add metrics to track matches and failures

## 3.1.3
  - Fix bug where numbers from a JSON codec would result in a date parse failure. (#86, #89)

## 3.1.2
  - Docs: Fix date format used in examples

## 3.1.1
  - Fix problem in packaging of 3.1.0

## 3.1.0
  - Improved performance: 2.8x faster for common case (first pattern matches), 14x faster for events where multiple patterns are attempted.  (#74)

## 3.0.3
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.2
  - Add metrics to measure matches, failures and date patterns
## 3.0.1
  - Republish all the gems under jruby.
## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 2.1.6
  - bugfix: Fails to parse a timestamp without year that falls in DST switchover for CET #63 (fix for #62)
# 2.1.5
  - doc: Include formatting syntax documentation in match config #60 (fix for #38)
  - internal: correct dependencies scope
# 2.1.4
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
  - bugfix: Harmonize default date handling in different joda parsers #59 (fix for #57, #58)
# 2.1.3 (yanked)
  - New dependency requirements for logstash-core for the 5.0 release
## 2.1.2
  - Make tests less reliant on implementation details of LogStash::Event
## 2.1.1
  - Fix an issue with the expectation on `Time.now` and running the tests inside Logstash #52
## 2.1.0
 - New year rollover should be handled better now when a year is not present in
   the time format. If local time is December, and event time is January, the
   year will be set to next year. Similar for if local time is January and
   Event time is December, the year will be set to the previous year. This
   should help keep times correct in the upcoming year rollover. (#33, #4)
 - The `timezone` setting now supports sprintf format (#31)
 - use Event#tag, relax specs for Java Event, code cleanups

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

