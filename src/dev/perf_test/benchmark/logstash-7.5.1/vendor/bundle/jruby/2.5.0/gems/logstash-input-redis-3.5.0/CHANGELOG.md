## 3.5.0
  - Updated redis client dependency to ~> 4

## 3.4.1
  - Changed `redis_type` to `data_type` in .rb file [#70](https://github.com/logstash-plugins/logstash-input-redis/issues/70) and asciidoc file [#71](https://github.com/logstash-plugins/logstash-input-redis/issues/71)

## 3.4.0
  - Added support for renamed redis commands [#29](https://github.com/logstash-plugins/logstash-input-redis/issues/29)

## 3.3.0
  - Add channel to the event #46

## 3.2.2
  - Docs: Set the default_codec doc attribute.

## 3.2.1
  - Docs: Fix broken asciidoc ID

## 3.2.0
  - Add support for SSL #61
  - Add support for Redis unix sockets #64

## 3.1.6
  - Update gemspec summary

## 3.1.5
  - Pin 'redis' gem dependency to major version range 3.x

## 3.1.4
  - Fix some documentation issues

## 3.1.2
  - use correct unsubscribe method for channel_listener data type

## 3.1.1
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.1.0
 - breaking,config: Remove deprecated config `queue`. Please use `key` and `data_type`.
 - breaking,config: Remove deprecated config `name`.

## 3.0.1
 - Republish all the gems under jruby.

## 3.0.0
 - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.0.6
 - make integration tests more reliable because of occasional travis failures

## 2.0.5
 - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.4
 - New dependency requirements for logstash-core for the 5.0 release

## 2.0.3
 - Changed default batch size to 125. Improve batch handling code. Add travis ci build with redis integration.

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

## 1.0.3
 - Fix typo in module name in test (Causing CI build failures)

## 1.0.2
 - Fix typo in module name (Causing the module to not be loaded)

## 1.0.1
 - Make teardown more reliable
 - Re-organise code and tests
