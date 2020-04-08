## 5.0.1
 - Fixed minor doc and doc formatting issues [#107](https://github.com/logstash-plugins/logstash-input-http_poller/pull/107)

## 5.0.0
 - Removed obsolete field `interval`

## 4.0.6
  - Changed `schedule` entry to show that it is required
  [#102](https://github.com/logstash-plugins/logstash-input-http_poller/pull/102)

## 4.0.5
  - Docs: Set the default_codec doc attribute.

## 4.0.4
  - Update gemspec summary

## 4.0.3
  - Docs: Remove row in overview table to fix build error
  
## 4.0.2
  - Don't bleed URLs credentials on startup and on exception #82

## 4.0.1
  - Fix some documentation issues

## 4.0.0
 - Mark deprecated field `interval` as obsolete
 - bump dependency in logstash-mixin-http_client

## 3.3.0
 - Add top level user/password options that apply to all URLs by default.
 - Make user/password configurable per-URL nested at the top level without the extra auth hash
   to make them more consistent with the global opts
 - Bump mixin-http_client version

## 3.2.0
 - Use eager auth. This means the client will send any credentials in its first request
   rather than waiting for a 401 challenge

## 3.1.1
 - Handle empty bodies correctly
## 3.1.0
 - Use rufus-scheduler for more flexible scheduling. Many thanks to [@hummingV](https://github.com/hummingV) for this contribution. ([#58](https://github.com/logstash-plugins/logstash-input-http_poller/pull/58))

## 3.0.3
  - Require logstash-mixin-http_client 4.0.3 which fixes error messaging around key/trust-stores when no password supplied

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
  - Republish all the gems under jruby.

## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.0.5
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.4
  - New dependency requirements for logstash-core for the 5.0 release

## 2.0.2
 - Bump http_client mixin to use better stale check for keepalives

## 2.0.1
 - Bump http_client mixin to default to 1 retry for idempotent actions

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

* 1.1.2
  - Correctly default to zero connection retries
  - Revert old ineffective code for connection retries
* 1.1.1
  - Default to zero connection retries
* 1.1.0
  - Error metadata no longer '_' prefixed for kibana compat
  - HTTP metadata now normalized to prevent conflicts with ES schemas
* 1.0.2
  - Bug fix: Decorating the event before pushing it to the queue
* 1.0.1
  - Add 'target' option
* 1.0.0
  - Initial release
