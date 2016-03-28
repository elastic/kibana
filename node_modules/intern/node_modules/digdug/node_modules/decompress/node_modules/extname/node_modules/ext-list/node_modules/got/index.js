'use strict';
var urlLib = require('url');
var http = require('http');
var https = require('https');
var assign = require('object-assign');

module.exports = function (url, opts, cb) {
	var redirectCount = 0;

	var get = function (url, opts, cb) {
		if (typeof opts === 'function') {
			cb = opts;
			opts = {};
		}

		cb = cb || function () {};

		var parsedUrl = urlLib.parse(url);
		var fn = parsedUrl.protocol === 'https:' ? https : http;
		var arg = assign({}, parsedUrl, opts);

		fn.get(arg, function (res) {
			var ret = '';

			// redirect
			if (res.statusCode < 400 && res.statusCode >= 300 && res.headers.location) {
				res.destroy();

				if (++redirectCount > 10) {
					cb(new Error('Redirected 10 times. Aborting.'));
					return;
				}

				get(urlLib.resolve(url, res.headers.location), cb);
				return;
			}

			if (res.statusCode !== 200) {
				res.destroy();
				cb(res.statusCode);
				return;
			}

			res.setEncoding('utf8');

			res.on('data', function (data) {
				ret += data;
			});

			res.on('end', function () {
				cb(null, ret);
			});
		}).on('error', cb);
	};

	get(url, opts, cb);
};
