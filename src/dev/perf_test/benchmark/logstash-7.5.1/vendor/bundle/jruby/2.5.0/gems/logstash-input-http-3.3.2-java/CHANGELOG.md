## 3.3.2
 - Update netty and tcnative dependency [#118](https://github.com/logstash-plugins/logstash-input-http/issues/118)

## 3.3.1
 - Added 201 to valid response codes [#114](https://github.com/logstash-plugins/logstash-input-http/issues/114)
 - Documented response\_code option

## 3.3.0
 - Added configurable response code option [#103](https://github.com/logstash-plugins/logstash-input-http/pull/103)
 - Added explanation about operation order of codec and additional_codecs [#104](https://github.com/logstash-plugins/logstash-input-http/pull/104)

## 3.2.4
 - Loosen jar-dependencies manager gem dependency to allow plugin to work with JRubies that include a later version.

## 3.2.3
  - Changed jar dependencies to reflect newer versions

## 3.2.2
  - Fix some edge cases of the verify\_mode+ssl\_verify\_mode options

## 3.2.1
  - Fix expensive SslContext creation per connection #93

## 3.2.0
  - Add `request_headers_target_field` and `remote_host_target_field` configuration options with default to `host` and `headers` respectively #68
  - Sanitize content-type header with getMimeType #87
  - Move most message handling code to java #85
  - Fix: respond with correct http protocol version #84

## 3.1.0
  - Replace Puma web server with Netty
  - Support crt/key certificates
  - Deprecates jks support

## 3.0.10
  - Docs: Set the default_codec doc attribute.

## 3.0.9
  - Make sure default codec is also cloned for thread safety. https://github.com/logstash-plugins/logstash-input-http/pull/80
  - Always flush codec after each request and codec decoding. https://github.com/logstash-plugins/logstash-input-http/pull/81

## 3.0.8
  - In the event that all webserver threads are busy this plugin will now return a 429, busy, error.

## 3.0.7
  - Update gemspec summary

## 3.0.6
  - Fix some documentation issues

## 3.0.4
  - Improve error logging to log more details, including stack trace, for true bugs.
    This makes debugging broken codecs much easier.
## 3.0.3
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99
## 3.0.2
  - Use a new class as redefined Puma::Server class as we need to mock one method and only need it for this plugin, but not for all parts using puma in logstash.Fixes https://github.com/logstash-plugins/logstash-input-http/issues/51.
## 3.0.1
  - Republish all the gems under jruby.
## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 2.2.2
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.2.1
  - New dependency requirements for logstash-core for the 5.0 release
## 2.2.0
 - Bump puma dependency to 2.16.0

## 2.1.1
 - Support for custom response headers

## 2.1.0
 - Support compressed and gziped requests (thanks dwapstra)

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

## 1.0.3 (September 2, 2015)
* Include remote host address to events (#25)

## 1.0.2 (July 28, 2015)
* Fix for missing base64 require which was crashing Logstash (#17)

## 1.0.0 (July 1, 2015)

* First version: New input to receive HTTP requests
* Added basic authentication and SSL support
