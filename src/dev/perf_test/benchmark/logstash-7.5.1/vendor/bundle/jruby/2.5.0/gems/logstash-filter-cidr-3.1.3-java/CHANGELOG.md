## 3.1.3
  - Support string arrays in network setting

## 3.1.2
  - Update gemspec summary

## 3.1.1
  - Fix some documentation issues

## 3.1.0
 - feature: New options 'network_path', 'separator', and
   'refresh_interval' used for optionally storing the list
   of networks in an auto-reloaded file.

## 3.0.0
 - breaking: Updated plugin to use new Java Event APIs

## 2.0.4
 - internal,deps: Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.3
 - internal,deps: New dependency requirements for logstash-core for the 5.0 release

## 2.0.0
 - internal: Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully, 
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - internal,deps: Dependency on logstash-core update to 2.0
