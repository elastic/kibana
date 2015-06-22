'use strict';
var npmconf = require('npmconf');

module.exports = function (cb) {
	npmconf.load(function (err, conf) {
		if (err) {
			cb(err);
			return;
		}

		cb(null, conf.get('registry'));
	});
};
