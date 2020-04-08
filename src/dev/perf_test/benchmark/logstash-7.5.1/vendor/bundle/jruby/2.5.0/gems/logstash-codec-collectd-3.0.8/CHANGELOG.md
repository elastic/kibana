## 3.0.8
  - Update gemspec summary

## 3.0.7
  - Fix some documentation issues

## 3.0.6
  - Return types.db to the list of items to be included in the gem

## 3.0.5
  - Minor documentation changes for better flow and understanding

## 3.0.4
  - Make this plugins compatible with JRuby 9 by using the OpenSSL::HMAC class and keep it backward compatible with JRuby 1.7.25 (Issue #24)

## 3.0.3
  - Fix log levels

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
  - Republish all the gems under jruby.
## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 2.0.4
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.0.3
  - New dependency requirements for logstash-core for the 5.0 release
## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully, 
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

# 2.0.0
  * synchronize access to OpenSSL::Cipher (not thread-safe)
  * use Digest for digests instead of OpenSSL::Digest and OpenSSL::HMAC (not thread-safe)
  * fix collectd packet mangling under high load conditions
# 1.0.1
  * Bug fix release including the necessary vendored files.
# 0.1.10
  * Ensure that notifications make it through.  Reported in #10
