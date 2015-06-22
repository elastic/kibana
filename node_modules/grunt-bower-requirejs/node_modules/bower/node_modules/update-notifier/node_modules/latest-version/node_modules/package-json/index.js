'use strict';
var got = require('got');
var registryUrl = require('registry-url');

module.exports = function (name, version, cb) {
	if (typeof version !== 'string') {
		cb = version;
		version = '';
	}

	registryUrl(function (err, url) {
		if (err) {
			cb(err);
			return;
		}

		got(url + encodeURIComponent(name) + '/' + version, function (err, data) {
			if (err === 404) {
				cb(new Error('Package or version doesn\'t exist'));
				return;
			}

			if (err) {
				cb(err);
				return;
			}

			cb(null, JSON.parse(data));
		});
	});
};
