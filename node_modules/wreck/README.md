![wreck Logo](https://raw.github.com/hapijs/wreck/master/images/wreck.png)

HTTP Client Utilities

[![Build Status](https://secure.travis-ci.org/hapijs/wreck.png)](http://travis-ci.org/hapijs/wreck)

Lead Maintainer: [Wyatt Preul](https://github.com/geek)

## Usage

### Basic
```javascript
var Wreck = require('wreck');

Wreck.get('https://google.com/', function (err, res, payload) {
    /* do stuff */
});
```

### Advanced
```javascript
var Wreck = require('wreck');

var method = 'GET'; // GET, POST, PUT, DELETE
var uri    = 'https://google.com/';
var readableStream = Wreck.toReadableStream('foo=bar');

var wreck = Wreck.defaults({
    headers: { 'x-foo-bar': 123 }
});

// cascading example -- does not alter `wreck`
var wreckWithTimeout = wreck.defaults({
    timeout: 5
});

// all attributes are optional
var options = {
    baseUrl:   fully qualified uri string used as the base url. Most useful with `request.defaults`, for example when you want to do many requests to the same domain.
               If `baseUrl` is `https://example.com/api/`, then requesting `/end/point?test=true` will fetch `https://example.com/api/end/point?test=true`. Any
               querystring in the `baseUrl` will be overwritten with the querystring in the `uri` When `baseUrl` is given, `uri` must also be a string.
    payload:   readableStream || 'foo=bar' || new Buffer('foo=bar'),
    headers:   { /* http headers */ },
    redirects: 3,
    redirected: function (statusCode, location, req) {},
    timeout:   1000,    // 1 second, default: unlimited
    maxBytes:  1048576, // 1 MB, default: unlimited
    rejectUnauthorized: true || false,
    downstreamRes: null,
    agent: null,         // Node Core http.Agent
    secureProtocol: 'SSLv3_method' // The SSL method to use
};

var optionalCallback = function (err, res) {

    /* handle err if it exists, in which case res will be undefined */

    // buffer the response stream
    Wreck.read(res, null, function (err, body) {
        /* do stuff */
    });
};

var req = wreck.request(method, uri, options, optionalCallback);
```

### `defaults(options)`

Returns a *new* instance of Wreck which merges the provided `options` with those provided on a per-request basis. You can call defaults repeatedly to build up multiple http clients.
- `options` - Config object containing settings for both `request` and `read` operations.

### `request(method, uri, [options, [callback]])`

Initiate an HTTP request.
- `method` - A string specifying the HTTP request method, defaulting to 'GET'.
- `uri` - The URI of the requested resource.
- `options` - An optional configuration object. To omit this argument but still
  use a callback, pass `null` in this position. The options object supports the
  following optional keys:
    - `payload` - The request body as string, Buffer, or Readable Stream.
    - `headers` - An object containing request headers.
    - `rejectUnauthorized` - [TLS](http://nodejs.org/api/tls.html) flag indicating
      whether the client should reject a response from a server with invalid certificates.  This cannot be set at the
      same time as the `agent` option is set.
    - `redirects` - The maximum number of redirects to follow.
    - `redirected` - A callback function that is called when a redirect was triggered, using the signature `function (statusCode, location, req)` where:
      - `statusCode` - HTTP status code of the response that triggered the redirect.
      - `location` - The redirected location string.
      - `req` - The new [ClientRequest](http://nodejs.org/api/http.html#http_class_http_clientrequest) object which replaces the one initially returned.
    - `agent` - Node Core [http.Agent](http://nodejs.org/api/http.html#http_class_http_agent).
      Defaults to either `wreck.agents.http` or `wreck.agents.https`.  Setting to `false` disables agent pooling.
    - `timeout` - The number of milliseconds to wait without receiving a response
      before aborting the request. Defaults to unlimited.
    - `secureProtocol` - [TLS](http://nodejs.org/api/tls.html) flag indicating the SSL method to use, e.g. `SSLv3_method`
      to force SSL version 3. The possible values depend on your installation of OpenSSL. Read the official OpenSSL docs
      for possible [SSL_METHODS](http://www.openssl.org/docs/ssl/ssl.html#DEALING_WITH_PROTOCOL_METHODS).
- `callback` - The optional callback function using the signature `function (err, response)` where:
    - `err` - Any error that may have occurred during the handling of the request.
    - `response` - The [HTTP Incoming Message](http://nodejs.org/api/http.html#http_http_incomingmessage)
       object, which is also a readable stream.

Returns an instance of the node.js [ClientRequest](http://nodejs.org/api/http.html#http_class_http_clientrequest) object.


### `read(response, options, callback)`
- `response` - An HTTP Incoming Message object.
- `options` - `null` or a configuration object with the following optional keys:
    - `timeout` - The number of milliseconds to wait while reading data before
    aborting handling of the response. Defaults to unlimited.
    - `json` - A value indicating how to try to parse the payload as JSON. Defaults to `undefined` meaning no parse logic.
        - `true`, 'smart' - only try `JSON.parse` if the response indicates a JSON content-type.
        - `force` - try `JSON.parse` regardless of the content-type header.
    - `maxBytes` - The maximum allowed response payload size. Defaults to unlimited.
- `callback` - The callback function using the signature `function (err, payload)` where:
    - `err` - Any error that may have occurred while reading the response.
    - `payload` - The payload in the form of a Buffer or (optionally) parsed JavaScript object (JSON).


### `get(uri, [options], callback)`

Convenience method for GET operations.
- `uri` - The URI of the requested resource.
- `options` - Optional config object containing settings for both `request` and
  `read` operations.
- `callback` - The callback function using the signature `function (err, response, payload)` where:
    - `err` - Any error that may have occurred during handling of the request.
    - `response` - The [HTTP Incoming Message](http://nodejs.org/api/http.html#http_http_incomingmessage)
       object, which is also a readable stream.
    - `payload` - The payload in the form of a Buffer or (optionally) parsed JavaScript object (JSON).

Returns an instance of the node.js [ClientRequest](http://nodejs.org/api/http.html#http_class_http_clientrequest) object.


### `post(uri, [options], callback)`

Convenience method for POST operations.
- `uri` - The URI of the requested resource.
- `options` - Optional config object containing settings for both `request` and
  `read` operations.
- `callback` - The callback function using the signature `function (err, response, payload)` where:
    - `err` - Any error that may have occurred during handling of the request.
    - `response` - The [HTTP Incoming Message](http://nodejs.org/api/http.html#http_http_incomingmessage)
       object, which is also a readable stream.
    - `payload` - The payload in the form of a Buffer or (optionally) parsed JavaScript object (JSON).

Returns an instance of the node.js [ClientRequest](http://nodejs.org/api/http.html#http_class_http_clientrequest) object.

### `patch(uri, [options], callback)`

Convenience method for PATCH operations.
- `uri` - The URI of the requested resource.
- `options` - Optional config object containing settings for both `request` and
  `read` operations.
- `callback` - The callback function using the signature `function (err, response, payload)` where:
    - `err` - Any error that may have occurred during handling of the request.
    - `response` - The [HTTP Incoming Message](http://nodejs.org/api/http.html#http_http_incomingmessage)
       object, which is also a readable stream.
    - `payload` - The payload in the form of a Buffer or (optionally) parsed JavaScript object (JSON).

Returns an instance of the node.js [ClientRequest](http://nodejs.org/api/http.html#http_class_http_clientrequest) object.


### `put(uri, [options], callback)`

Convenience method for PUT operations.
- `uri` - The URI of the requested resource.
- `options` - Optional config object containing settings for both `request` and
  `read` operations.
- `callback` - The callback function using the signature `function (err, response, payload)` where:
    - `err` - Any error that may have occurred during handling of the request.
    - `response` - The [HTTP Incoming Message](http://nodejs.org/api/http.html#http_http_incomingmessage)
       object, which is also a readable stream.
    - `payload` - The payload in the form of a Buffer or (optionally) parsed JavaScript object (JSON).

Returns an instance of the node.js [ClientRequest](http://nodejs.org/api/http.html#http_class_http_clientrequest) object.


### `delete(uri, [options], callback)`

Convenience method for DELETE operations.
- `uri` - The URI of the requested resource.
- `options` - Optional config object containing settings for both `request` and
  `read` operations.
- `callback` - The callback function using the signature `function (err, response, payload)` where:
    - `err` - Any error that may have occurred during handling of the request.
    - `response` - The [HTTP Incoming Message](http://nodejs.org/api/http.html#http_http_incomingmessage)
       object, which is also a readable stream.
    - `payload` - The payload in the form of a Buffer or (optionally) parsed JavaScript object (JSON).

Returns an instance of the node.js [ClientRequest](http://nodejs.org/api/http.html#http_class_http_clientrequest) object.


### `toReadableStream(payload, [encoding])`

Creates a [readable stream](http://nodejs.org/api/stream.html#stream_class_stream_readable)
for the provided payload and encoding.
- `payload` - The Buffer or string to be wrapped in a readable stream.
- `encoding` - The encoding to use. Must be a valid Buffer encoding, such as 'utf8' or 'ascii'.

```javascript
var stream = Wreck.toReadableStream(new Buffer('Hello', 'ascii'), 'ascii');
var read = stream.read();
// read -> 'Hello'
```

### `parseCacheControl(field)`

Parses the provided *cache-control* request header value into an object containing
a property for each directive and it's value. Boolean directives, such as "private"
or "no-cache" will be set to the boolean `true`.
- `field` - The header cache control value to be parsed.

```javascript
var  result = Wreck.parseCacheControl('private, max-age=0, no-cache');
// result.private -> true
// result['max-age'] -> 0
// result['no-cache'] -> true
```

### `agents`

Object that contains the agents for pooling connections for `http` and `https`.  The properties are `http`, `https`, and
`httpsAllowUnauthorized` which is an `https` agent with `rejectUnauthorized` set to true.  All agents have `maxSockets`
configured to `Infinity`.  They are each instances of the node.js
[Agent](http://nodejs.org/api/http.html#http_class_http_agent) and expose the standard properties.

For example, the following code demonstrates changing `maxSockets` on the `http` agent.

 ```js
 var Wreck = require('wreck');

 Wreck.agents.http.maxSockets = 20;
 ```


### Events

#### `response`

The response event is always emitted for any request that *wreck* makes.  The handler should accept the following
arguments `(error, request, response, start, uri)` where:
  - `error` - a Boom error
  - `request` - the raw `ClientHttp` request object
  - `response` - the raw `IncomingMessage` response object
  - `start` - the time that the request was initiated
  - `uri` - the result of `Url.parse(uri)`. This will provide information about the resource requested.  Also includes
    the headers and method.

This event is useful for logging all requests that go through *wreck*.
The error and response arguments can be undefined depending on if an error occurs.  Please be aware that if multiple
modules are depending on the same cached *wreck* module that this event can fire for each request made across all
modules.  The start argument is the timestamp when the request was started.  This can be useful for determining how long
it takes *wreck* to get a response back and processed.
