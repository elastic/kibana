'use strict';
var http = require('http');
var https = require('https');
var urlLib = require('url');
var zlib = require('zlib');
var objectAssign = require('object-assign');
var agent = require('infinity-agent');
var duplexify = require('duplexify');
var isStream = require('is-stream');
var read = require('read-all-stream');
var timeout = require('timed-out');
var prependHttp = require('prepend-http');
var lowercaseKeys = require('lowercase-keys');
var status = require('statuses');

function got(url, opts, cb) {
	if (typeof opts === 'function') {
		cb = opts;
		opts = {};
	} else if (!opts) {
		opts = {};
	}

	opts = objectAssign({}, opts);

	opts.headers = objectAssign({
		'user-agent': 'https://github.com/sindresorhus/got',
		'accept-encoding': 'gzip,deflate'
	}, lowercaseKeys(opts.headers));

	var encoding = opts.encoding;
	var body = opts.body;
	var proxy;
	var redirectCount = 0;

	delete opts.encoding;
	delete opts.body;

	if (body) {
		opts.method = opts.method || 'POST';
	}

	// returns a proxy stream to the response
	// if no callback has been provided
	if (!cb) {
		proxy = duplexify();

		// forward errors on the stream
		cb = function (err) {
			proxy.emit('error', err);
		};
	}

	function get(url, opts, cb) {
		var parsedUrl = urlLib.parse(prependHttp(url));
		var fn = parsedUrl.protocol === 'https:' ? https : http;
		var arg = objectAssign({}, parsedUrl, opts);

		// TODO: remove this when Node 0.10 will be deprecated
		if (arg.agent === undefined) {
			arg.agent = agent(arg);
		}

		var req = fn.request(arg, function (response) {
			var statusCode = response.statusCode;
			var res = response;

			// redirect
			if (status.redirect[statusCode] && 'location' in res.headers) {
				res.resume(); // Discard response

				if (++redirectCount > 10) {
					cb(new Error('Redirected 10 times. Aborting.'), undefined, res);
					return;
				}

				get(urlLib.resolve(url, res.headers.location), opts, cb);
				return;
			}

			if (['gzip', 'deflate'].indexOf(res.headers['content-encoding']) !== -1) {
				var unzip = zlib.createUnzip();
				res.pipe(unzip);
				res = unzip;
			}

			if (statusCode < 200 || statusCode > 299) {
				read(res, encoding, function (error, data) {
					var err = error || new Error(url + ' response code is ' + statusCode + ' (' + status[statusCode] + ')');
					err.code = statusCode;
					cb(err, data, response);
				});
				return;
			}

			// pipe the response to the proxy if in proxy mode
			if (proxy) {
				proxy.setReadable(res);
				return;
			}

			read(res, encoding, function (err, data) {
				 cb.call(null, err, data, response);
			});
		}).once('error', cb);

		if (opts.timeout) {
			timeout(req, opts.timeout);
		}

		if (!proxy) {
			if (isStream.readable(body)) {
				body.pipe(req);
			} else {
				req.end(body);
			}

			return;
		}

		if (body) {
			proxy.write = function () {
				throw new Error('got\'s stream is not writable when options.body is used');
			};

			if (isStream.readable(body)) {
				body.pipe(req);
			} else {
				req.end(body);
			}

			return;
		}

		if (opts.method === 'POST' || opts.method === 'PUT' || opts.method === 'PATCH') {
			proxy.setWritable(req);
			return;
		}

		req.end();
	}

	get(url, opts, cb);
	return proxy;
}

[
	'get',
	'post',
	'put',
	'patch',
	'head',
	'delete'
].forEach(function (el) {
	got[el] = function (url, opts, cb) {
		opts = opts || {};
		opts.method = el.toUpperCase();
		return got(url, opts, cb);
	};
});

module.exports = got;
