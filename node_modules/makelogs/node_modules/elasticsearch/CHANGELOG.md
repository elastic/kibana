# elasticsearch-js changelog

## 8.2 (Sep 17 2015)
 - Added [`sniffedNodesProtocol`](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html#config-sniffed-nodes-protocol) configuration option
 - Fixed an issue which prevented promised from getting rejected if the `GET` verb was used with a request body ([#263](https://github.com/elastic/elasticsearch-js/issues/263))

## 8.1 (Sep 8 2015)
 - Added apiVersion `"2.x"`, which will semi-regularly be updated to match the latest development at [elastic/elasticsearch#2.x](https://github.com/elastic/elasticsearch/tree/2.x)
 - Removed node engine upper-bound, supporting 4.0 and versions beyond.

## 8.0 (Aug 26 2015)
 - apiVersion changed back to `"1.7"` until es 2.0 is actually released.

## ~~7.0 (Aug 26 2015)~~ unpublished
 - Added apiVersion `"2.0"`, which is now the default

## 6.1 (Aug 18 2015)
 - Added experimental support for apiVersion `"2.0"`
 - Added support for [many more status codes](https://github.com/elastic/elasticsearch-js/blob/ea6721127fb239951fb86ac3b386e182b26f683c/src/lib/errors.js#L94-L138) so that "unknown error" is far less likely.

## 6.0 (Aug 4 2015)
 - Added apiVersion `"1.7"`, which is now the default
 - Error objects resulting from a completed http request now have much more information about the request that caused them.

## 5.0 (Jun 9 2015)
 - Added apiVersion `"1.6"`, which is now the default

## 4.1 (May 19 2015)
 - Plugin configuration option added
 - Added support for object based error

## 4.0 (Mar 26 2015)
 - Added apiVersion `"1.5"`, which is now the default
 - Changed the default pingTimeout to 3 seconds, and made it configurable
 - Improved compatibility with node 0.12
 - Updated dependencies
 - Make the stream logger actually usable (thanks @falmp!)

## 3.1 (Jan 6 2015)
 - Added HTTPS/SSL configuration options and related errors
 - `client.scroll()` requests made without a body will use the `scrollId` param as the body to prevent #113 & #174
 - Updated bluebird to `v2.8.2` - [bluebird changelog](https://github.com/petkaantonov/bluebird/blob/master/changelog.md)
 - Added specific error message for 504 errors [#182](https://github.com/elastic/elasticsearch-js/pull/182)

## 3.0 (Nov 7 2014)
 - Added apiVersion `"1.4"`, which is now the default
 - Improved parsing of `host:` strings, [examples in the tests](https://github.com/elastic/elasticsearch-js/blob/165b7d7986b2184b2e4b73d33bf5803e61ce7a54/test/unit/specs/host.js#L71-L92)
 - The Angular version of the client now uses `angular.toJson()` ([1.2](https://code.angularjs.org/1.2.27/docs/api/ng/function/angular.toJson), [1.3](https://code.angularjs.org/1.3.5/docs/api/ng/function/angular.toJson)) to serialize requests, override with `serializer: "json"`
 - Angular requests are now being [aborted properly](https://github.com/elastic/elasticsearch-js/commit/4c106967d3e9ae208fae42ce013f0a21e1ace021)

## 2.4 (Jul 30 2014)
 - Added apiVersion `"1.3"`, which is now the default
 - Angular connector (when used with Basic Auth) no longer modifies Angular's default headers

## 2.3 (Jul 11 2014)
 - Added support for Node 0.11
 - Updated `bluebird`, which modified the [promise api](https://github.com/petkaantonov/bluebird/blob/v2.2.1/API.md) somewhat
 - moved the log generator into it's own package [makelogs](https://www.npmjs.org/package/makelogs)
 - [Lower the logging level of `Request complete`](https://github.com/elastic/elasticsearch-js/pull/122)

## 2.2 (Mar 27 2014)
- The default API version is now `'1.2'`
- Node clinet now supports master, 1.x, 1.2, 1.1, 1.0, and 0.90
- Browser client now supports versions 1.0, 1.1, and 1.2

## 2.1 (Mar 27 2014)
- The default API version is now `'1.1'`
- Errors generated in the browser will now have stack traces
- Clarified IE-support
- Improvements to the bundled log-generator

## 2.0 (Mar 27 2014)
- The default API version is now `'1.0'`
- Promises are now supported using the Bluebird module
- If you try to reuse a configuration object, an error will be thrown. https://github.com/elastic/elasticsearch-js/issues/33

## 1.5 (Feb 6 2014)
- Switched out `keepaliveagent` dependency with `forever-agent`, which is used in the ever popular `request` module, and is much simpler
- The option to use keep-alive is now all or nothing. `maxKeepAliveTime` and `maxKeepAliveRequests` config parameters have been replaced by `keepAlive`, which will keeps at least `minSockets` connections open forever. See: http://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html
- Closing the client with `keepAlive` turned on will allow the process to exit. https://github.com/elastic/elasticsearch-js/issues/40
- Fixed a bug that caused invalid param/type errors to not be reported properly, in the browser builds that use promises
- added the cat.threadPool to the master/1.0/1.x apis
- Enabled Basic auth in the Angular connector -- Thanks @jeff-french!
- Fixed a bug that was preventing index requests (and any other POST/PUT request) from using connections in the connection pool

## 1.4 (Jan 30 2014)
- The trace log messages will now diaplay the actual host connected to (without auth info) unless they are being written to a bash script
- API Updated with latest changes awaiting 1.0 release

## 1.2/1.3 (Jan 17 2014)
- `apiVersion` config parameter was added. Use this to specify which API the client should provide, we currently offer support for elasticsearch branches "0.90", "1.0", and "master"


## 1.1 (Dec 22 2013)
- Changed the resolution value of promises. Instead of being an object like `{body: ..., status: ...}` it is now
  just the response body


## 1.0 (Dec 17 2013)
- Initial Release


## pre 1.0
- Another module, now know as es on npm, used the elasticsearch module name. This module had several pre-1.0
  releases so we started at 1.0 to prevent collisions in exiting projects. The history for that project is available [here](https://github.com/ncb000gt/node-es)
