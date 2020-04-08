## 3.0.6
  - Docs: Set the default_codec doc attribute.

## 3.0.5
  - Update gemspec summary

## 3.0.4
  - Fix some documentation issues

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

# 3.0.1
  - Force encoding the gemspec of this plugin into utf-8 to make sure updating all the plugin works see https://github.com/elastic/logstash/issues/5468
  - Use oracle JDK8 for travis build
# 3.0.0
  - Use new Event API defined in Logstash 5.x (backwards incompatible change)
# 2.0.4
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.0.3
  - New dependency requirements for logstash-core for the 5.0 release
## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

## 0.1.0
* First version of the webhdfs plugin output
