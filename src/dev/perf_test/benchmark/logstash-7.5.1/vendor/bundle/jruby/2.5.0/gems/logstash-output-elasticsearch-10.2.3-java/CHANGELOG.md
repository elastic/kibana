## 10.2.3
  - Opened type removal logic for extension. This allows X-Pack Elasticsearch output to continue using types for special case `/_monitoring` bulk endpoint, enabling a fix for LogStash #11312. [#900](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/900)

## 10.2.2
  - Fixed 8.x type removal compatibility issue [#892](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/892)

## 10.2.1
  - Fixed wording and corrected option in documentation [#881](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/881) [#883](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/883)

## 10.2.0
  - Deprecation: Added warning about connecting a default Distribution of Logstash with an OSS version of ES [#875](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/875)
  - Added template for connecting to ES 8.x [#871](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/871)
  - Added sniffing support for ES 8.x [#878](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/878)

## 10.1.0
  - Added cluster id tracking through the plugin metadata registry [#857](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/857)

## 10.0.2
  - Fixed bug where index patterns in custom templates could be erroneously overwritten [#861](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/861)

## 10.0.1
  - Reverted `document_type` obsoletion [#844](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/844)

## 10.0.0 (yanked due to issues with document_type obsoletion)
  - Changed deprecated `document_type` option to obsolete [#824](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/824)
  - Remove support for parent child (still support join data type) since we don't support multiple document types any more
  - Removed obsolete `flush_size` and `idle_flush_time`
  - Added 'auto' setting for ILM with default of 'auto' [#838](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/838)

## 9.3.2
  - Fixed sniffing support for 7.x [#827](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/827)

## 9.3.1
  - Fixed issue with escaping index names which was causing writing aliases for ILM to fail [#831](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/831)

## 9.3.0
  - Adds support for Index Lifecycle Management for Elasticsearch 6.6.0 and above, running with at least a Basic License(Beta) [#805](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/805)

## 9.2.4
  - Fixed support for Elasticsearch 7.x [#812](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/812)

## 9.2.3
  - Tweaked logging statements to reduce verbosity

## 9.2.2
  - Fixed numerous issues relating to builds on Travis [#799](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/799)

## 9.2.1
  - Added text offering hosted Elasticsearch service

## 9.2.0
  - Added support for customizing HTTP headers [#782](https://github.com/logstash-plugins/logstash-output-elasticsearch/pull/782)

## 9.1.4
  - Log an error -- not a warning -- when ES raises an invalid\_index\_name\_exception.

## 9.1.3
  - Improve plugin behavior when Elasticsearch is down on startup #758

## 9.1.2
  - No user facing changes, removed unnecessary test dep.

## 9.1.1
  - Docs: Set the default_codec doc attribute.

## 9.1.0
  - Set number_of_shards to 1 and document_type to '_doc' for es 7.x clusters #741 #747
  - Fix usage of upsert and script when update action is interpolated #239
  - Add metrics to track bulk level and document level responses #585

## 9.0.3
  - Ignore master-only nodes when using sniffing

## 9.0.2
  - Ignore event's type field for the purpose of setting document `_type` if cluster is es 6.x or above

## 9.0.1
  - Update gemspec summary

### 9.0.0
  - Change default document type to 'doc' from 'logs' to align with beats and reflect the generic nature of logstash.
  - Deprecate 'document_type' option

### 8.2.2
  - Use `#response_body` instead of `#body` when debugging response from the server #679

## 8.2.1
  - Docs: Add DLQ policy section

## 8.2.0
  - Improved Elasticsearch version handling
  - Improved event error logging when DLQ is disabled in Logstash

## 8.1.1
  - Retry all non-200 responses of the bulk API indefinitely
  - Improve documentation on retry codes

## 8.1.0
  - Support Elasticsearch 6.x join field type
## 8.0.2
  - Fix bug where logging errors for bad response codes would raise an unhandled exception

## 8.0.1
  - Fix some documentation issues

## 8.0.0
 - Breaking: make deprecated options :flush_size and :idle_flush_time obsolete
 - Remove obsolete options :max_retries and :retry_max_items
 - Fix: handling of initial single big event
 - Fix: typo was enabling http compression by default this returns it back to false

## 7.3.7
 - Properly support characters needing escaping in users / passwords across multiple SafeURI implementions (pre/post LS 5.5.1)
 - Logstash 5.5.0 does NOT work with this release as it has a broken SafeURI implementation

## 7.3.6
 - Bump for doc gen

## 7.3.5
 - Fix incorrect variable reference when DLQing events

## 7.3.4
 - Fix incorrect handling of bulk_path containing ?s

## 7.3.3
 - Fix JRuby 9k incompatibilities and use new URI class that is JRuby 9k compatible

## 7.3.2
 - Fix error where a 429 would cause this output to crash
 - Wait for all inflight requests to complete before stopping

## 7.3.1
 - Fix the backwards compatibility layer used for detecting DLQ capabilities in logstash core

## 7.3.0
 - Log 429 errors as debug instead of error. These aren't actual errors and cause users undue concern.
   This status code is triggered when ES wants LS to backoff, which it does correctly (exponentially)

## 7.2.2
 - Docs: Add requirement to use version 6.2.5 or higher to support sending Content-Type headers.

## 7.2.1
 - Expose a `#post` method in the http client class to be use by other modules

## 7.2.0
 - Support 6.0.0-alpha1 version of Elasticsearch by adding a separate 6x template
 - Note: This version is backwards compatible w.r.t. config, but for ES 6.0.0, `_all` has been
    removed. This BWC issue only affects ES version 6.x; older versions
    can be used with this plugin as is.

## 7.1.0
 - Add support to compress requests using the new `http_compression` option.

## 7.0.0
- introduce customization of bulk, healthcheck and sniffing paths with the behaviour:
  - if not set: the default value will be used
  - if not set and path is also set: the default is appended to path
  - if set: the set value will be used, ignoring the default and path setting
- removes absolute_healthcheck_path and query_parameters

## 6.2.6
- Fixed: Change how the healthcheck_path is treated: either append it to any existing path (default) or replace any existing path
  Also ensures that the healthcheck url contains no query parameters regarless of hosts urls contains them or query_params being set. #554

## 6.2.5
- Send the Content-Type: application/json header that proper ES clients should send

## 6.2.4
- Fix bug where using escaped characters in the password field would attempt to show a warning but instead crash.
  The warning was also not necessary since escaped characters never worked there before.

## 6.2.3
- Fixed a bug introduced in 6.2.2 where passwords needing escapes were not actually sent to ES properly
  encoded.

## 6.2.2
- Fixed a bug that forced users to URL encode the `password` option.
  If you are currently manually escaping your passwords upgrading to this version
  will break authentication. You should unescape your password if you have implemented
  this workaround as it will otherwise be doubly encoded.
  URL escaping is STILL required for passwords inline with URLs in the `hosts` option.

## 6.2.1
- When an HTTP error is encountered, log the response body instead of the request.
  The request body will still be logged at debug level.

## 6.2.0
- Add version number / version conflict support

## 6.1.0
- Add option to use an absolute healthcheck path

## 6.0.0
- Proxies requiring auth now always work when a URL is specified
- It is no longer possible to specify a proxy as a hash due to security reasons
- Fix URL normalization logic to correctly apply all settings to sniffed hosts
- Proxies requiring auth now always work when a URL is specified
- Switch internals to new LogStash::Util::SafeURI type for more defensive approach to logging credentials

## 5.4.1
- Correctly sniff against ES 5.x clusters

## 5.4.0
- Perform healthcheck against hosts right after startup / sniffing
- Add support for custom query parameters

## 5.3.5
- Docs: Remove mention of using the elasticsearch_java output plugin because it is no longer supported

## 5.3.4
- Add `sprintf` or event dependent configuration when specifying ingest pipeline

## 5.3.3
- Hide user/password in connection pool

## 5.3.2
- Use byte size, not char count for bulk operation size checks

## 5.3.1
- depends on Adressable ~> 2.3.0 to satisfy development dependency of the core ([logstash/#6204](https://github.com/elastic/logstash/issues/6204))

## 5.3.0
- Bulk operations will now target 20MB chunks at a time to reduce heap usage

## 5.2.0
- Change default lang for scripts to be painless, inline with ES 5.0. Earlier there was no default.

## 5.1.2
- Hide credentials in exceptions and log messages ([#482](https://github.com/logstash-plugins/logstash-output-elasticsearch/issues/482))
- [internal] Remove dependency on longshoreman project

## 5.1.1
- Hide user and password from the URL logged during sniffing process.

## 5.1.0
- Add check_connection_timeout parameter (default 10m)
- Set default timeout to 60s

## 5.0.0
- Breaking Change: Index template for 5.0 has been changed to reflect Elasticsearch's mapping changes. Most importantly,
the subfield for string multi-fields has changed from `.raw` to `.keyword` to match ES default behavior. ([#386](https://github.com/logstash-plugins/logstash-output-elasticsearch/issues/386))

**Users installing ES 5.x and LS 5.x**
This change will not affect you and you will continue to use the ES defaults.

**Users upgrading from LS 2.x to LS 5.x with ES 5.x**
LS will not force upgrade the template, if `logstash` template already exists. This means you will still use
`.raw` for sub-fields coming from 2.x. If you choose to use the new template, you will have to reindex your data after
the new template is installed.

## 4.1.3
- Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 4.1.2

- Added a configuration called failure_type_logging_whitelist which takes a list of strings, that are error types from elasticsearch, so we prevent logging WARN if elasticsearch fails with that action. See https://github.com/logstash-plugins/logstash-output-elasticsearch/issues/423

## 4.1.1
- Fix bug where setting credentials would cause fatal errors. See https://github.com/logstash-plugins/logstash-output-elasticsearch/issues/441

## 4.1.0
- breaking,config: Removed obsolete config `host` and `port`. Please use the `hosts` config with the `[host:port]` syntax.
- breaking,config: Removed obsolete config `index_type`. Please use `document_type` instead.
- breaking,config: Set config `max_retries` and `retry_max_items` as obsolete

## 4.0.0
 - Make this plugin threadsafe. Workers no longer needed or supported
 - Add pool_max and pool_max_per_route options

## 3.0.2
 - Fix issues where URI based paths in 'hosts' would not function correctly

## 3.0.1
 - Republish all the gems under jruby.

## 3.0.0
 - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.7.0
 - Add `pipeline` configuration option for setting an ingest pipeline to run upon indexing


## 2.6.2
 - Fix bug where update index actions would not work with events with 'data' field

## 2.6.1
 - Add 'retry_on_conflict' configuration option which should have been here from the beginning

## 2.5.2
 - Fix bug with update document with doc_as_upsert and scripting (#364, #359)
 - Make error messages more verbose and easier to parse by humans
 - Retryable failures are now logged at the info level instead of warning. (issue #372)

## 2.5.1
 - Fix bug where SSL would sometimes not be enabled

## 2.5.0
 - Host settings now are more robust to bad input
 - Host settings can now take full URLs

## 2.4.2
 - Make flush_size actually cap the batch size in LS 2.2+

## 2.4.1
 - Used debug level instead of info when emitting flush log message
 - Updated docs about template

## 2.4.0
 - Scripted update support courtesy of @Da-Wei

## 2.3.2
 - Fix bug where max_retry_interval was not respected for HTTP error codes

## 2.3.1
 - Bump manticore dependenvy to 0.5.2

## 2.3.0
 - Now retry too busy and service unavailable errors infinitely.
 - Never retry conflict errors
 - Fix broken delete verb that would fail due to sending body with verb

## 2.2.0
 - Serialize access to the connection pool in es-ruby client
 - Add support for parent relationship

## 2.1.5
 - Sprintf style 'action' parameters no longer raise a LogStash::ConfigurationError

## 2.1.4
 - Improved the default template to disable fielddata on analyzed string fields. #309
 - Dependend on logstash-core 2.0.0 released version, rather than RC1

## 2.1.3
 - Improved the default template to use doc_values wherever possible.
 - Template contains example mappings for every numeric type. You must map your
   own fields to make use of anything other than long and double.

## 2.1.2
 - Fixed dependencies (#280)
 - Fixed an RSpec test (#281)

## 2.1.1
 - Made host config obsolete.

## 2.1.0
 - New setting: timeout. This lets you control the behavior of a slow/stuck
   request to Elasticsearch that could be, for example, caused by network,
   firewall, or load balancer issues.

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

## 2.0.0-beta2
 - Massive internal refactor of client handling
 - Background HTTP sniffing support
 - Reduced bulk request size to 500 from 5000 (better memory utilization)
 - Removed 'host' config option. Now use 'hosts'

## 2.0.0-beta
 - Only support HTTP Protocol
 - Removed support for node and transport protocols (now in logstash-output-elasticsearch_java)

## 1.0.7
 - Add update API support

## 1.0.6
 - Fix warning about Concurrent lib deprecation

## 1.0.4
 - Update to Elasticsearch 1.7

## 1.0.3
 - Add HTTP proxy support

## 1.0.2
 - Upgrade Manticore HTTP Client

## 1.0.1
 - Allow client certificates

## 0.2.9
 - Add 'path' parameter for ES HTTP hosts behind a proxy on a subpath

## 0.2.8 (June 12, 2015)
 - Add option to enable and disable SSL certificate verification during handshake (#160)
 - Doc improvements for clarifying round robin behavior using hosts config

## 0.2.7 (May 28, 2015)
 - Bump es-ruby version to 1.0.10

## 0.2.6 (May 28, 2015)
 - Disable timeouts when using http protocol which would cause bulk requests to fail (#103)
