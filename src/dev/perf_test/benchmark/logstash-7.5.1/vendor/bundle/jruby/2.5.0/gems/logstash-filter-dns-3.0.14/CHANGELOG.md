## 3.0.14
  - Added documentation on the `nameserver` option for relying on `/etc/resolv.conf` to configure the resolver

## 3.0.13
  - Fixed JRuby resolver bug for versions after to 9.2.0.0 [#51](https://github.com/logstash-plugins/logstash-filter-dns/pull/51)

## 3.0.12
  - Fixed issue where unqualified domains would fail to resolve when running this plugin with Logstash 5.x [#48](https://github.com/logstash-plugins/logstash-filter-dns/pull/48)
  - Fixed crash that could occur when encountering certain classes of invalid inputs [#49](https://github.com/logstash-plugins/logstash-filter-dns/pull/49)

## 3.0.11
  - Fixed JRuby resolver bug for versions prior to 9.1.16.0 [#45](https://github.com/logstash-plugins/logstash-filter-dns/pull/45)

## 3.0.10
  - Log timeouts as warn instead of error #43
  - Allow concurrent queries when cache enabled #42

## 3.0.9
  - Logging improvement to include DNS resolution failure reason #36

## 3.0.8
  - Fix bug where forward lookups would not cache timeout errors

## 3.0.7
  - Update gemspec summary

## 3.0.6
  - Fix some documentation issues

## 3.0.4
  - Log a warning on missing resolve/reverse fields rather than crashing

## 3.0.3
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.2
  - Add support for International Domain Names e.g. müller.com. Fixes https://github.com/logstash-plugins/logstash-filter-dns/issues/22
  - Add support for custom hosts files (helps with testing but could be useful to some folks).

## 3.0.1
  - Republish all the gems under jruby.

## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.1.3
  - Fix spec early termination by removing an explicit return from a block

## 2.1.2
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.1.1
  - New dependency requirements for logstash-core for the 5.0 release

## 2.1.0
 - Add caches for failed and successful lookups
 - Lower default timeout value
 - Retry a maximum of :max_retries instead of failing immediately

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

