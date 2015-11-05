
/**
 * index.js
 *
 * a request API compatible with window.fetch
 */

var parse_url = require('url').parse;
var resolve_url = require('url').resolve;
var http = require('http');
var https = require('https');
var zlib = require('zlib');
var stream = require('stream');

var Response = require('./lib/response');
var Headers = require('./lib/headers');
var Request = require('./lib/request');

module.exports = Fetch;

/**
 * Fetch class
 *
 * @param   Mixed    url   Absolute url or Request instance
 * @param   Object   opts  Fetch options
 * @return  Promise
 */
function Fetch(url, opts) {

	// allow call as function
	if (!(this instanceof Fetch))
		return new Fetch(url, opts);

	// allow custom promise
	if (!Fetch.Promise) {
		throw new Error('native promise missing, set Fetch.Promise to your favorite alternative');
	}

	Response.Promise = Fetch.Promise;

	var self = this;

	// wrap http.request into fetch
	return new Fetch.Promise(function(resolve, reject) {
		// build request object
		var options;
		try {
			options = new Request(url, opts);
		} catch (err) {
			reject(err);
			return;
		}

		var send;
		if (options.protocol === 'https:') {
			send = https.request;
		} else {
			send = http.request;
		}

		// normalize headers
		var headers = new Headers(options.headers);

		if (options.compress) {
			headers.set('accept-encoding', 'gzip,deflate');
		}

		if (!headers.has('user-agent')) {
			headers.set('user-agent', 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)');
		}

		if (!headers.has('connection')) {
			headers.set('connection', 'close');
		}

		if (!headers.has('accept')) {
			headers.set('accept', '*/*');
		}

		// detect form data input from form-data module, this hack avoid the need to pass multipart header manually
		if (!headers.has('content-type') && options.body && typeof options.body.getBoundary === 'function') {
			headers.set('content-type', 'multipart/form-data; boundary=' + options.body.getBoundary());
		}

		// bring node-fetch closer to browser behavior by setting content-length automatically for POST, PUT, PATCH requests when body is empty or string
		if (!headers.has('content-length') && options.method.substr(0, 1).toUpperCase() === 'P') {
			if (typeof options.body === 'string') {
				headers.set('content-length', Buffer.byteLength(options.body));
			// this is only necessary for older nodejs releases (before iojs merge)
			} else if (options.body === undefined || options.body === null) {
				headers.set('content-length', '0');
			}
		}

		options.headers = headers.raw();

		// http.request only support string as host header, this hack make custom host header possible
		if (options.headers.host) {
			options.headers.host = options.headers.host[0];
		}

		// send request
		var req = send(options);
		var reqTimeout;

		if (options.timeout) {
			req.once('socket', function(socket) {
				reqTimeout = setTimeout(function() {
					req.abort();
					reject(new Error('network timeout at: ' + options.url));
				}, options.timeout);
			});
		}

		req.on('error', function(err) {
			clearTimeout(reqTimeout);
			reject(new Error('request to ' + options.url + ' failed, reason: ' + err.message));
		});

		req.on('response', function(res) {
			clearTimeout(reqTimeout);

			// handle redirect
			if (self.isRedirect(res.statusCode)) {
				if (options.counter >= options.follow) {
					reject(new Error('maximum redirect reached at: ' + options.url));
					return;
				}

				if (!res.headers.location) {
					reject(new Error('redirect location header missing at: ' + options.url));
					return;
				}

				// per fetch spec, for POST request with 301/302 response, or any request with 303 response, use GET when following redirect
				if (res.statusCode === 303
					|| ((res.statusCode === 301 || res.statusCode === 302) && options.method === 'POST'))
				{
					options.method = 'GET';
					delete options.body;
					delete options.headers['content-length'];
				}

				options.counter++;

				resolve(Fetch(resolve_url(options.url, res.headers.location), options));
				return;
			}

			// handle compression
			var body = res.pipe(new stream.PassThrough());
			var headers = new Headers(res.headers);

			if (options.compress && headers.has('content-encoding')) {
				var name = headers.get('content-encoding');

				if (name == 'gzip' || name == 'x-gzip') {
					body = body.pipe(zlib.createGunzip());
				} else if (name == 'deflate' || name == 'x-deflate') {
					body = body.pipe(zlib.createInflate());
				}
			}

			// response object
			var output = new Response(body, {
				url: options.url
				, status: res.statusCode
				, headers: headers
				, size: options.size
				, timeout: options.timeout
			});

			resolve(output);
		});

		// accept string or readable stream as body
		if (typeof options.body === 'string') {
			req.write(options.body);
			req.end();
		} else if (typeof options.body === 'object' && options.body.pipe) {
			options.body.pipe(req);
		} else {
			req.end();
		}
	});

};

/**
 * Redirect code matching
 *
 * @param   Number   code  Status code
 * @return  Boolean
 */
Fetch.prototype.isRedirect = function(code) {
	return code === 301 || code === 302 || code === 303 || code === 307 || code === 308;
}

// expose Promise
Fetch.Promise = global.Promise;
Fetch.Response = Response;
Fetch.Headers = Headers;
Fetch.Request = Request;
