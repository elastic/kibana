# 3.0.4
  - Fixed regex to prevent Exception in sprintf call [#25](https://github.com/logstash-plugins/logstash-filter-prune/pull/25)
  - Changed testing to docker [#27](https://github.com/logstash-plugins/logstash-filter-prune/pull/27)
  - Added clarification in docs around whitelist_values
  - Changed tests from insist to expect

## 3.0.3
  - Update gemspec summary

## 3.0.2
  - Fix some documentation issues

## 3.0.0
 - internal: Bumped up logstash-core-plugin-api dependency to allow installation with Logstash 5.
 - doc: Clarify that pruning of subfields is unsupported.

## 2.0.6
 - doc: Documentation improvements.

## 2.0.5
 - doc: Documentation improvements.

## 2.0.4
 - internal,deps: Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.3
 - internal,deps: New dependency requirements for logstash-core for the 5.0 release

## 2.0.0
 - internal: Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - internal,deps: Dependency on logstash-core update to 2.0

