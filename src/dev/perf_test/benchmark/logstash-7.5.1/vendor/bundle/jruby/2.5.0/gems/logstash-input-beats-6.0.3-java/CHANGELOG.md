## 6.0.3
 - Fixed configuration example in doc [#371](https://github.com/logstash-plugins/logstash-input-beats/pull/371)

## 6.0.2
 - Improved handling of invalid compressed content [#368](https://github.com/logstash-plugins/logstash-input-beats/pull/368)

## 6.0.1
 - Updated Jackson dependencies [#366](https://github.com/logstash-plugins/logstash-input-beats/pull/366)

## 6.0.0
 - Removed obsolete setting congestion_threshold and target_field_for_codec
 - Changed default value of `add_hostname` to false

## 5.1.8
 - Loosen jar-dependencies manager gem dependency to allow plugin to work with JRubies that include a later version.

## 5.1.7
 - Updated jar dependencies to reflect newer releases

## 5.1.6
 - Docs: Fixed broken link by removing extra space. [#347](https://github.com/logstash-plugins/logstash-input-beats/pull/347)

## 5.1.5
 - Docs: Fixed section ID that was causing doc build errors in the versioned
plugin docs. [#346](https://github.com/logstash-plugins/logstash-input-beats/pull/346)
 
## 5.1.4
 - Added `add_hostname` flag to enable/disable the population of the `host` field from the beats.hostname field [#340](https://github.com/logstash-plugins/logstash-input-beats/pull/340)

## 5.1.3
 - Fixed handling of batches where the sequence numbers do not start with 1 [#342](https://github.com/logstash-plugins/logstash-input-beats/pull/342)

## 5.1.2
 - Changed project to use gradle version 4.8.1. [#334](https://github.com/logstash-plugins/logstash-input-beats/pull/334)
   - This is an internal, non user-impacting, change to use a more modern version of gradle for building the plugin.

## 5.1.1
- Docs: Add more detail about creating versioned indexes for Beats data

## 5.1.0 
 - Added ssl_peer_metadata option. [#327](https://github.com/logstash-plugins/logstash-input-beats/pull/327) 
 - Fixed ssl_verify_mode => peer. [#326](https://github.com/logstash-plugins/logstash-input-beats/pull/326)

## 5.0.16
 - [#289](https://github.com/logstash-plugins/logstash-input-beats/pull/289#issuecomment-394072063) Re-initialise Netty worker group on plugin restart

## 5.0.15
  - [Ensure that context is available before trace is made](https://github.com/logstash-plugins/logstash-input-beats/pull/319/files)

## 5.0.14
  - Update jackson deps to 2.9.5

## 5.0.13
  - Fix broken 5.0.12 release

## 5.0.12
  - Docs: Set the default_codec doc attribute.

## 5.0.11
  - Ensure that the keep-alive is sent for ALL pending batches when the pipeline is blocked, not only the batches attempting to write to the queue. #310  
  
## 5.0.10
  - Update jackson deps to 2.9.4
  
## 5.0.9
  - Improvements to back pressure handling and memory management #299

## 5.0.8
  - Update jackson deps to 2.9.1

## 5.0.7
  - Docs: Deprecate `document_type` option

## 5.0.6
  - Re-order Netty pipeline to avoid NullPointerExceptions in KeepAliveHandler when Logstash is under load
  - Improve exception logging
  - Upgrade to Netty 4.1.18 with tcnative 2.0.7

## 5.0.5
  - Better handle case when remoteAddress is nil to reduce amount of warning messages in logs #269
  
## 5.0.4
  - Fix an issue with `close_wait` connection and making sure the keep alive are send back to the client all the time. #272

## 5.0.3
  - Update gemspec summary

## 5.0.2
  - Change IdleState strategy from `READER_IDLE` to `ALL_IDLE` #262
  - Additional context when logging from the BeatsHandler #261
  - Remove the `LoggingHandler` from the handler stack to reduce noise in the log.

## 5.0.1
  - Fix some documentation issues

## 5.0.0
 - Mark deprecated congestion_threshold and target_field_for_codec as obsolete

## 4.0.5
 - Additional default cipher PR#242
 - Fix logging from Java

## 4.0.4
 - Documentation fixes

## 4.0.3
 - Include remote ip_address in metadata. #180
 - Require Java 8 #221
 - Fix ability to set SSL protocols  #228

## 4.0.2
  - Relax version of concurrent-ruby to `~> 1.0` #216

## 4.0.1
 - Breaking change: Logstash will no longer start when multiline codec is used with the Beats input plugin #201

## 4.0.0
 - Version yanked from RubyGems for packaging issues

## 3.1.19 
   - Fix ability to set SSL protocols  #228
   
## 3.1.18
  - Relax version of concurrent-ruby to ~> 1.0 #216
  
## 3.1.17 
 - Docs: Add note indicating that the multiline codec should not be used with the Beats input plugin
 - Deprecate warning for multiline codec with the Beats input plugin

## 3.1.16
 - Version yanked from RubyGems for packaging issues

## 3.1.15
 - DEBUG: Add information about the remote when an exception is catched #192

## 3.1.14
 - Fix: Make sure idle connection are correctly close for the right client, #185, #178
 - Fix: remoge string interpolation for logging in critical path #184

## 3.1.13
 - Fix: remove monkeypatch from the main class to fix the documentation generator issues

## 3.1.12
  - Fix the Logger initialization in logstash 2.4.X #166

## 3.1.11
  - Uses SO_linger for the socket option to force the server to completely disconnect the idle clients https://github.com/elastic/logstash/issues/6300

## 3.1.10
  - Correctly send the client_inactivity_timeout to the Server classe #163
  - Mark congestion_threshold as deprecated, the java implementation now use a keep alive mechanism

## 3.1.9
  - Docs: Removed statement about intermediate CAs not being supported

## 3.1.8
  - Fix a typo in the default ciphers suite, added validations for the configured ciphers #156
  - validate the presence of `ssl_certificate_authorities` when `verify_mode` is set to FORCE_PEER or peer #155

## 3.1.7
  - Fix an issue when only the first CA found in the certificate authorities was taking into consideration to verify clients #153

## 3.1.6
   - Fix an issue with the `READER_IDLE` that was closing a connection in a middle of working on a batch #141
   - Fix an issue when the plugin did not accept a specific host to bind to. #146
   - Fix an issue when forcing a logstash shutdown that could result in an `InterruptedException` #145

## 3.1.5
   - Fix an issue when using a passphrase was raising a TypeError #138
   - Fix the filebeat integration suite to use the new `ssl` option instead of `tls`
   - Use correct log4j logger call to be compatible with 2.4

## 3.1.4
   - Add a note concerning the requirement of the PKCS8 format for the private key.

## 3.1.3
   - Use a relative path for the VERSION, this change is needed by the doc generation tool to read the gemspec.

## 3.1.2
   - Propagate SSL handshake error correctly
   - Move back to log4j 1, to make it work better under logstash 2.4

## 3.1.1
   - Remove the SSL Converter, Private Key must be in the PKCS8 format, which is the default of any newer OpenSSL library
   - Replace FileInputStream with File reference to let netty handle correctly the certificates
   - Tests now uses OpenSSL binary to convert PKCS7 Private generated from ruby to PKCS8
   - Remove dependency on bouncycastle
   - Fix an issue when the input could hang forever when stopping Logstash
   - [Doc changes] Add Logstash config example and clarify use of the `type` config option

## 3.1.0
   - Fix a NullPointer Exception https://github.com/elastic/logstash/issues/5756
   - Log4j ERROR will now be propagated upstream, IE: InvalidCertificate OR InvalidFrameType.
   - Relax constraints on multiline to make it work under 2.4

## 3.1.0.beta4
    - Fix a problem that would would make the server refuse concurrent connection to the server #111

## 3.1.0.beta3
    - Jars were missing from the latest release on rubygems

## 3.1.0.beta2
    - Better handling of connection timeout, added a new option to set the value for it, the default is 15 seconds #108
    - Make sure that incomplete SSL handshake doesn't take down the server #101
    - Sending Garbage data will now raise a specific exception `InvalidFrameProtocolException` #100
    - Adding assertions on the payload size and the fields count to make the parser more resilient to erronous frames #99

## 3.1.0.beta1
    - Rewrite of the beats input in Java using the Netty framewwork, this rewrite is meant to be backward compatible with the previous implementation

## 3.0.4
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99
    but should yield better throughput and memory usage. https://github.com/logstash-plugins/logstash-input-beats/pull/93

## 3.0.3

  - Fix an issue when parsing multiple frames received from a filebeat client using pipelining.

## 3.0.2

  - relax constrains of `logstash-devutils` see https://github.com/elastic/logstash-devutils/issues/48

## 3.0.1

  - Republish all the gems under jruby.

## 3.0.0

  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.2.8

  - Fix #73 Bug in EventTransformCommon#codec_name, use config_name
  - Add regression test for fix to #73
  - Non deterministic error for the LSF integration test
  - Make this plugin really a drop in replacement for the lumberjack input, so LSF can send their events to this plugin.

## 2.2.7

  - More robust test when using a random port #60
  - Fix LSF integration tests #52

## 2.2.6

  - Do not use the identity map if we don't explicitly use the `multiline` codec

## 2.2.5

  - Fix failing tests introduce by the `ssl_key_passphrase` changes.
  - Added an integration test for the `ssl_key_passphrase`
  - Add an optional parameter for `auto_flush`

## 2.2.4

  - Fix bug where using `ssl_key_passphrase` wouldn't work

## 2.2.2

  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.2.1

  - New dependency requirements for logstash-core for the 5.0 release

## 2.2.0

  - The server can now do client side verification by providing a list of certificate authorities and configuring the `ssl_verify_mode`,
    the server can use `peer`, if the client send a certificate it will be validated. Using `force_peer` will make sure the client provide a certificate
    and it will be validated with the know CA.  #8

## 2.1.4

  - Change the `logger#warn` for `logger.debug` when a peer get disconnected, keep alive check from proxy can generate a lot of logs  #46

## 2.1.3

  - Make sure we stop all the threads after running the tests #48

## 2.1.2

  - Catch the `java.lang.InterruptedException` in the events broker
  - Give a bit more time to the Thread to be started in the test #42

## 2.1.1

  - Release a new version of the gem that doesn't included any other gems, 2.1.0 is yanked from rubygems

## 2.1.0

  - Refactor of the code to make it easier to unit test
  - Fix a conncurrency error on high load on the SizeQueue #37
  - Drop the internal SizeQueue to rely on Java Synchronous Queue
  - Remove the majority of the nested blocks
  - Move the CircuitBreaker inside an internal namespace so it doesn't conflict with the input lumberjack
  - Add more debugging log statement
  - Flush the codec when a disconnect happen
  - Tag/Decorate the event when a shutdown occur.
  - The name of the threads managed by the input beat are now meaningful.

## 2.0.3

  - Reduce the size of the gem by removing vendor jars

## 2.0.2

  - Copy the `beat.hostname` field into the `host` field for better compatibility with the other Logstash plugins #28
  - Correctly merge multiple line with the multiline codec ref: #24

## 2.0.0

  - Add support for stream identity, the ID will be generated from beat.id+resource_id or beat.name + beat.source if not present #22 #13
    The identity allow the multiline codec to correctly merge string from multiples files.

## 0.9.6

  - Fix an issue with rogue events created by buffered codecs #19

## 0.9.5

  - Set concurrent-ruby to 0.9.1 see https://github.com/elastic/logstash/issues/4141

## 0.9.4

  - Correctly decorate the event with the `add_field` and `tags` option from the config #12

## 0.9.3

  - Connection#run should rescue `Broken Pipe Error` #5
  - Fix a `SystemCallErr` issue on windows when shutting down the server #9

## 0.9.2

  - fix an issue with the incorrectly calculated ack when the window_size was smaller than the ACK_RATIO see  https://github.com/logstash-plugins/logstash-input-beats/issues/3

## 0.9.1

  - Move the ruby-lumberjack library into the plugin

## 0.9
  - Created from `logstash-input-lumberjack` version 2.0.2 https://github.com/logstash-plugins/logstash-input-lumberjack
  - Use SSL off by default
