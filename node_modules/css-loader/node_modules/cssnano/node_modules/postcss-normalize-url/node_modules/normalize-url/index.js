'use strict';
var url = require('url');
var punycode = require('punycode');
var queryString = require('query-string');
var prependHttp = require('prepend-http');
var sortKeys = require('sort-keys');
var objectAssign = require('object-assign');

var DEFAULT_PORTS = {
	'http:': 80,
	'https:': 443,
	'ftp:': 21
};

module.exports = function (str, opts) {
	opts = objectAssign({
		normalizeProtocol: true,
		stripFragment: true,
		stripWWW: true
	}, opts);

	if (typeof str !== 'string') {
		throw new TypeError('Expected a string');
	}

	var hasRelativeProtocol = str.indexOf('//') === 0;

	// prepend protocol
	str = prependHttp(str.trim()).replace(/^\/\//, 'http://');

	var urlObj = url.parse(str);

	// prevent these from being used by `url.format`
	delete urlObj.host;
	delete urlObj.query;

	// remove fragment
	if (opts.stripFragment) {
		delete urlObj.hash;
	}

	// remove default port
	var port = DEFAULT_PORTS[urlObj.protocol];
	if (Number(urlObj.port) === port) {
		delete urlObj.port;
	}

	// remove duplicate slashes
	urlObj.pathname = urlObj.pathname.replace(/\/{2,}/, '/');

	// resolve relative paths
	var domain = urlObj.protocol + '//' + urlObj.hostname;
	var relative = url.resolve(domain, urlObj.pathname);
	urlObj.pathname = relative.replace(domain, '');

	// IDN to Unicode
	urlObj.hostname = punycode.toUnicode(urlObj.hostname).toLowerCase();

	// remove `www.`
	if (opts.stripWWW) {
		urlObj.hostname = urlObj.hostname.replace(/^www\./, '');
	}

	// remove URL with empty query string
	if (urlObj.search === '?') {
		delete urlObj.search;
	}

	// sort query parameters
	urlObj.search = queryString.stringify(sortKeys(queryString.parse(urlObj.search)));

	// decode query parameters
	urlObj.search = decodeURIComponent(urlObj.search);

	// take advantage of many of the Node `url` normalizations
	str = url.format(urlObj);

	// remove ending `/`
	str = str.replace(/\/$/, '');

	// restore relative protocol, if applicable
	if (hasRelativeProtocol && !opts.normalizeProtocol) {
		str = str.replace(/^http:\/\//, '//');
	}

	return str;
};
