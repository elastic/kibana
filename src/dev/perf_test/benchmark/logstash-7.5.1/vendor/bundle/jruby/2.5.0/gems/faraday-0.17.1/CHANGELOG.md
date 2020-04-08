# Faraday Changelog

## v0.17.1

Final release before Faraday v1.0, with important fixes for Ruby 2.7.

Fixes:

* RaiseError response middleware raises exception if HTTP client returns a nil
  status. (#1042)

Misc:

* Fix Ruby 2.7 warnings (#1009)
* Add `Faraday::Deprecate` to warn about upcoming v1.0 changes. (#1054, #1059,
    #1076, #1077)
* Add release notes up to current in CHANGELOG.md (#1066)
* Port minimal rspec suite from main branch to run backported tests. (#1058)

## v0.17.0

This release is the same as v0.15.4. It was pushed to cover up releases
v0.16.0-v0.16.2.

## v0.15.4

* Expose `pool_size` as a option for the NetHttpPersistent adapter (#834)

## v0.15.3

* Make Faraday::Request serialisable with Marshal. (#803)
* Add DEFAULT_EXCEPTIONS constant to Request::Retry (#814)
* Add support for Ruby 2.6 Net::HTTP write_timeout (#824)

## v0.15.2

* Prevents `Net::HTTP` adapters to retry request internally by setting `max_retries` to 0 if available (Ruby 2.5+). (#799)
* Fixes `NestedParamsEncoder` handling of empty array values (#801)

## v0.15.1

* NetHttpPersistent adapter better reuse of SSL connections (#793)
* Refactor: inline cached_connection (#797)
* Logger middleware: use $stdout instead of STDOUT (#794)
* Fix: do not memoize/reuse Patron session (#796)

Also in this release:

* Allow setting min/max ssl version for Net::HTTP (#792)
* Allow setting min/max ssl version for Excon (#795)

## v0.15.0

Features:

* Added retry block option to retry middleware. (#770)
* Retry middleware improvements (honour Retry-After header, retry statuses) (#773)
* Improve response logger middleware output (#784)

Fixes:

* Remove unused class error (#767)
* Fix minor typo in README (#760)
* Reuse persistent connections when using net-http-persistent (#778)
* Fix Retry middleware documentation (#781)
* Returns the http response when giving up on retrying by status (#783)

## v0.14.0

Features:

* Allow overriding env proxy (#754)
* Remove legacy Typhoeus adapter (#715)
* External Typhoeus Adapter Compatibility (#748)
* Warn about missing adapter when making a request (#743)
* Faraday::Adapter::Test stubs now support entire urls (with host) (#741)

Fixes:

* If proxy is manually provided, this takes priority over `find_proxy` (#724)
* Fixes the behaviour for Excon's open_timeout (not setting write_timeout anymore) (#731)
* Handle all connection timeout messages in Patron (#687)

## v0.13.1

* Fixes an incompatibility with Addressable::URI being used as uri_parser

## v0.13.0

Features:

* Dynamically reloads the proxy when performing a request on an absolute domain (#701)
* Adapter support for Net::HTTP::Persistent v3.0.0 (#619)

Fixes:

* Prefer #hostname over #host. (#714)
* Fixes an edge-case issue with response headers parsing (missing HTTP header) (#719)

## v0.12.2

* Parse headers from aggregated proxy requests/responses (#681)
* Guard against invalid middleware configuration with warning (#685)
* Do not use :insecure option by default in Patron (#691)
* Fixes an issue with HTTPClient not raising a `Faraday::ConnectionFailed` (#702)
* Fixes YAML serialization/deserialization for `Faraday::Utils::Headers` (#690)
* Fixes an issue with Options having a nil value (#694)
* Fixes an issue with Faraday.default_connection not using Faraday.default_connection_options (#698)
* Fixes an issue with Options.merge! and Faraday instrumentation middleware (#710)

## v0.12.1

* Fix an issue with Patron tests failing on jruby
* Fix an issue with new `rewind_files` feature that was causing an exception when the body was not an Hash
* Expose wrapped_exception in all client errors
* Add Authentication Section to the ReadMe

## v0.12.0.1

* Hotfix release to address an issue with TravisCI deploy on Rubygems

## v0.12.0

Features:

* Proxy feature now relies on Ruby `URI::Generic#find_proxy` and can use `no_proxy` ENV variable (not compatible with ruby < 2.0)
* Adds support for `context` request option to pass arbitrary information to middlewares

Fixes:

* Fix an issue with options that was causing new options to override defaults ones unexpectedly
* Rewind `UploadIO`s on retry to fix a compatibility issue
* Make multipart boundary unique
* Improvements in `README.md`

## v0.11.0

Features:

* Add `filter` method to Logger middleware
* Add support for Ruby2.4 and Minitest 6
* Introduce block syntax to customise the adapter

Fixes:

* Fix an issue that was allowing to override `default_connection_options` from a connection instance
* Fix a bug that was causing newline escape characters ("\n") to be used when building the Authorization header

## v0.10.1

- Fix an issue with HTTPClient adapter that was causing the SSL to be reset on every request
- Rescue `IOError` instead of specific subclass
- `Faraday::Utils::Headers` can now be successfully serialised in YAML
- Handle `default_connection_options` set with hash

## v0.10.0

Breaking changes:
- Drop support for Ruby 1.8

Features:
- Include wrapped exception/reponse in ClientErrors
- Add `response.reason_phrase`
- Provide option to selectively skip logging request/response headers
- Add regex support for pattern matching in `test` adapter

Fixes:
- Add `Faraday.respond_to?` to find methods managed by `method_missing`
- em-http: `request.host` instead of `connection.host` should be taken for SSL validations
- Allow `default_connection_options` to be merged when options are passed as url parameter
- Improve splitting key-value pairs in raw HTTP headers

## v0.9.2

Adapters:
- Enable gzip compression for httpclient
- Fixes default certificate store for httpclient not having default paths.
- Make excon adapter compatible with 0.44 excon version
- Add compatibility with Patron 0.4.20
- Determine default port numbers in Net::HTTP adapters (Addressable compatibility)
- em-http: wrap "connection closed by server" as ConnectionFailed type
- Wrap Errno::ETIMEDOUT in Faraday::Error::TimeoutError

Utils:
- Add Rack-compatible support for parsing `a[][b]=c` nested queries
- Encode nil values in queries different than empty strings. Before: `a=`; now: `a`.
- Have `Faraday::Utils::Headers#replace` clear internal key cache
- Dup the internal key cache when a Headers hash is copied

Env and middleware:
- Ensure `env` stored on middleware response has reference to the response
- Ensure that Response properties are initialized during `on_complete` (VCR compatibility)
- Copy request options in Faraday::Connection#dup
- Env custom members should be copied by Env.from(env)
- Honour per-request `request.options.params_encoder`
- Fix `interval_randomness` data type for Retry middleware
- Add maximum interval option for Retry middleware

## v0.9.1

* Refactor Net:HTTP adapter so that with_net_http_connection can be overridden to allow pooled connections. (@Ben-M)
* Add configurable methods that bypass `retry_if` in the Retry request middleware.  (@mike-bourgeous)

## v0.9.0

* Add HTTPClient adapter (@hakanensari)
* Improve Retry handler (@mislav)
* Remove autoloading by default (@technoweenie)
* Improve internal docs (@technoweenie, @mislav)
* Respect user/password in http proxy string (@mislav)
* Adapter options are structs.  Reinforces consistent options across adapters
  (@technoweenie)
* Stop stripping trailing / off base URLs in a Faraday::Connection. (@technoweenie)
* Add a configurable URI parser. (@technoweenie)
* Remove need to manually autoload when using the authorization header helpers on `Faraday::Connection`. (@technoweenie)
* `Faraday::Adapter::Test` respects the `Faraday::RequestOptions#params_encoder` option. (@technoweenie)
