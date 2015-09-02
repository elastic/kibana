
/**
 * response.js
 *
 * Response class provides content decoding
 */

var http = require('http');
var convert = require('encoding').convert;

module.exports = Response;

/**
 * Response class
 *
 * @param   Stream  body  Readable stream
 * @param   Object  opts  Response options
 * @return  Void
 */
function Response(body, opts) {

	this.url = opts.url;
	this.status = opts.status;
	this.statusText = http.STATUS_CODES[this.status];
	this.headers = opts.headers;
	this.body = body;
	this.bodyUsed = false;
	this.size = opts.size;
	this.ok = this.status >= 200 && this.status < 300;
	this.timeout = opts.timeout;

}

/**
 * Decode response as json
 *
 * @return  Promise
 */
Response.prototype.json = function() {

	return this._decode().then(function(text) {
		return JSON.parse(text);
	});

}

/**
 * Decode response as text
 *
 * @return  Promise
 */
Response.prototype.text = function() {

	return this._decode();

}

/**
 * Decode buffers into utf-8 string
 *
 * @return  Promise
 */
Response.prototype._decode = function() {

	var self = this;

	if (this.bodyUsed) {
		return Response.Promise.reject(new Error('body used already for: ' + this.url));
	}

	this.bodyUsed = true;
	this._bytes = 0;
	this._abort = false;
	this._raw = [];

	return new Response.Promise(function(resolve, reject) {
		var resTimeout;

		// allow timeout on slow response body
		if (self.timeout) {
			resTimeout = setTimeout(function() {
				self._abort = true;
				reject(new Error('response timeout at ' + self.url + ' over limit: ' + self.timeout));
			}, self.timeout);
		}

		self.body.on('data', function(chunk) {
			if (self._abort || chunk === null) {
				return;
			}

			if (self.size && self._bytes + chunk.length > self.size) {
				self._abort = true;
				reject(new Error('content size at ' + self.url + ' over limit: ' + self.size));
				return;
			}

			self._bytes += chunk.length;
			self._raw.push(chunk);
		});

		self.body.on('end', function() {
			if (self._abort) {
				return;
			}

			clearTimeout(resTimeout);
			resolve(self._convert());
		});
	});

};

/**
 * Detect buffer encoding and convert to target encoding
 * ref: http://www.w3.org/TR/2011/WD-html5-20110113/parsing.html#determining-the-character-encoding
 *
 * @param   String  encoding  Target encoding
 * @return  String
 */
Response.prototype._convert = function(encoding) {

	encoding = encoding || 'utf-8';

	var charset = 'utf-8';
	var res, str;

	// header
	if (this.headers.has('content-type')) {
		res = /charset=([^;]*)/i.exec(this.headers.get('content-type'));
	}

	// no charset in content type, peek at response body
	if (!res && this._raw.length > 0) {
		str = this._raw[0].toString().substr(0, 1024);
	}

	// html5
	if (!res && str) {
		res = /<meta.+?charset=(['"])(.+?)\1/i.exec(str);
	}

	// html4
	if (!res && str) {
		res = /<meta[\s]+?http-equiv=(['"])content-type\1[\s]+?content=(['"])(.+?)\2/i.exec(str);

		if (res) {
			res = /charset=(.*)/i.exec(res.pop());
		}
	}

	// xml
	if (!res && str) {
		res = /<\?xml.+?encoding=(['"])(.+?)\1/i.exec(str);
	}

	// found charset
	if (res) {
		charset = res.pop();

		// prevent decode issues when sites use incorrect encoding
		// ref: https://hsivonen.fi/encoding-menu/
		if (charset === 'gb2312' || charset === 'gbk') {
			charset = 'gb18030';
		}
	}

	// turn raw buffers into utf-8 string
	return convert(
		Buffer.concat(this._raw)
		, encoding
		, charset
	).toString();

}

// expose Promise
Response.Promise = global.Promise;
