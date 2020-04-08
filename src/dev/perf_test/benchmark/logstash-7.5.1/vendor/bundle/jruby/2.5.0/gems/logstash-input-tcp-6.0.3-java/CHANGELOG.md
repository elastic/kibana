## 6.0.3
  - Skip empty lines while reading certificate files [#144](https://github.com/logstash-plugins/logstash-input-tcp/issues/144)

## 6.0.2
  - Fixed race condition where data would be accepted before queue was configured

## 6.0.1
  - Support multiple certificates per file [#140](https://github.com/logstash-plugins/logstash-input-tcp/pull/140)

## 6.0.0
  - Removed obsolete `data_timeout` and `ssl_cacert` options

## 5.2.0
  - Added support for pkcs1 and pkcs8 key formats [#122](https://github.com/logstash-plugins/logstash-input-tcp/issues/122)
  - Changed server-mode SSL to run on top of Netty [#122](https://github.com/logstash-plugins/logstash-input-tcp/issues/122)
  - Changed travis testing infra to use logstash tarballs [#122](https://github.com/logstash-plugins/logstash-input-tcp/issues/122)
  - Fixed certificate chain handling and validation [#124](https://github.com/logstash-plugins/logstash-input-tcp/issues/124)

## 5.1.0
 - Added new configuration option `dns_reverse_lookup_enabled` to allow users to disable costly DNS reverse lookups [#100](https://github.com/logstash-plugins/logstash-input-tcp/issues/100)

## 5.0.9
  - New configuration option to set TCP keep-alive [#16](https://github.com/logstash-plugins/logstash-input-tcp/pull/116)
  
## 5.0.8
  - Reorder shut down of the two event loops to prevent RejectedExecutionException

## 5.0.7
  - Fix broken 5.0.6 release

## 5.0.6
  - Docs: Set the default_codec doc attribute.

## 5.0.5
  - Restore SSLSUBJECT field when ssl_verify is enabled. #115

## 5.0.4
  - Update Netty/tc-native versions to match those in beats input #113

## 5.0.3
  - Fix bug where codec was not flushed when client disconnected
  - Restore INFO logging statement on startup
  - Fixed typo in @metadata tag
  - Update gemspec summary

## 5.0.2
  - Fix bug where this input would crash logstash during some socket reads when acting as an SSL server

## 5.0.1
  - Fix some documentation issues

## 5.0.0
  - Changed the behaviour of the `host` field to contain the resolved peer hostname for a connection instead of its peer IP
  - Mark deprecated :data_timeout and :ssl_cacert options as obsolete
  and moved the peer's IP to the new field `ip_address`

## 4.2.2
  - Fixed regression causing incoming connection host ips being accidentally resolved to hostnames
  - Implemented plain socket server in a non-blocking way improving performance and fixing issues for use cases with a large number of concurrent connections
  
## 4.2.1
  - Version yanked from RubyGems for accidental behaviour change causing unwanted reverse lookups on connections

## 4.2.0
  - Version yanked from RubyGems for packaging issues

## 4.1.2
  - Add documentation for how to use tcp input to accept log4j2 data.

## 4.1.0
  - Add support for proxy protocol

## 4.0.3
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 4.0.2
 - Change the log level of the SSLError for the handshake from **error** to **debug** https://github.com/logstash-plugins/logstash-input-tcp/pull/53
## 4.0.1
 - Republish all the gems under jruby.
## 4.0.0
 - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 3.0.5
 - Fixed a bug where using a certificate with a passphrase wouldn't work.
# 3.0.4
 - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 3.0.3
 - New dependency requirements for logstash-core for the 5.0 release
## 3.0.2
 - Fixed a bug where previous connection would accidentally be closed when accepting new socket connection
 - Fixed an issue with log message which used a closed socket's peer address 

## 3.0.1
 - properly convert sslsubject to string before assigning to event field, added specs, see https://github.com/logstash-plugins/logstash-input-tcp/pull/38

## 3.0.0
 - Deprecate ssl_cacert as it's confusing, does it job but when willing to add a chain of certificated the name and behaviour is a bit confusing.
 - Add ssl_extra_chain_certs that allows you to specify a list of certificates path that will be added to the CAStore.
 - Make ssl_verify=true as a default value, if using ssl and performing validation is not reasonable as security might be compromised.
 - Add tests to verify behaviour under different SSL connection circumstances.
 - Fixes #3 and #9.

## 2.1.0
 - Added the receiving port in the event payload, fixes #4

## 2.0.5
 - Fixed malformed SSL crashing Logstash, see https://github.com/logstash-plugins/logstash-input-tcp/pull/25

## 2.0.4
 - Dependency on logstash-core update to >= 2.0.0.beta2 < 3.0.0

## 2.0.3
 - removed usage of RSpec.configure, see https://github.com/logstash-plugins/logstash-input-tcp/pull/21

## 2.0.2
 - refactored & cleaned up plugin structure, see https://github.com/logstash-plugins/logstash-input-tcp/pull/18

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0
