## 3.0.10
  - Fixed [multiline codec - #32](https://github.com/logstash-plugins/logstash-codec-multiline/issues/32) `no method map_cleanup for nil class` error when shutting down.

## 3.0.9
  - Fixed concurrency issue causing random failures when multiline codec was used together with a multi-threaded input plugin

## 3.0.8
  - Update gemspec summary

## 3.0.7
  - Fix some documentation issues

## 3.0.6
  - Fix debug output for grok match

## 3.0.3
  - Docs: Add note indicating that the multiline codec should not be used with input plugins that support multiple hosts

## 3.0.2
  - Fix log levels

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
  - Republish all the gems under jruby.
## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 2.0.11
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.0.10
  - New dependency requirements for logstash-core for the 5.0 release
## 2.0.9
 - Fix for issue #30, eviction_timeout nil when cleaner thread is doing map cleanup.

## 2.0.8
 - Fix for issue #28, Memory leak when using cancel + execute on ScheduledTask.

## 2.0.7
 - Fix for issue #23, Thread deadlock on auto-flush when using multiple inputs with this codec. Use cancel + execute on ScheduledTask instead of reset.

## 2.0.6
 - Isolate spec helper classes in their own namespace.

## 2.0.5
 - Add auto_flush config option, with no default. If not set, no auto_flush is done.
 - Add evict method to identity_map_codec that allows for an input, when done with an identity, to auto_flush and remove the identity from the map.

## 2.0.4
 - Add constructional method to allow an eviction specific block to be set.

## 2.0.3
 - Add pseudo codec IdentityMapCodec.  Support class for identity based multiline processing.

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

