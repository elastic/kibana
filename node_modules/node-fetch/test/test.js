
// test tools
var chai = require('chai');
var cap = require('chai-as-promised');
chai.use(cap);
var expect = chai.expect;
var bluebird = require('bluebird');
var then = require('promise');
var spawn = require('child_process').spawn;
var stream = require('stream');
var resumer = require('resumer');
var FormData = require('form-data');

var TestServer = require('./server');

// test subjects
var fetch = require('../index.js');
var Headers = require('../lib/headers.js');
var Response = require('../lib/response.js');
var Request = require('../lib/request.js');
// test with native promise on node 0.11, and bluebird for node 0.10
fetch.Promise = fetch.Promise || bluebird;

var url, opts, local, base;

describe('node-fetch', function() {

	before(function(done) {
		local = new TestServer();
		base = 'http://' + local.hostname + ':' + local.port;
		local.start(done);
	});

	after(function(done) {
		local.stop(done);
	});

	it('should return a promise', function() {
		url = 'http://example.com/';
		var p = fetch(url);
		expect(p).to.be.an.instanceof(fetch.Promise);
		expect(p).to.have.property('then');
	});

	it('should allow custom promise', function() {
		url = 'http://example.com/';
		var old = fetch.Promise;
		fetch.Promise = then;
		expect(fetch(url)).to.be.an.instanceof(then);
		expect(fetch(url)).to.not.be.an.instanceof(bluebird);
		fetch.Promise = old;
	});

	it('should throw error when no promise implementation are found', function() {
		url = 'http://example.com/';
		var old = fetch.Promise;
		fetch.Promise = undefined;
		expect(function() {
			fetch(url)
		}).to.throw(Error);
		fetch.Promise = old;
	});

	it('should expose Headers, Response and Request constructors', function() {
		expect(fetch.Headers).to.equal(Headers);
		expect(fetch.Response).to.equal(Response);
		expect(fetch.Request).to.equal(Request);
	});

	it('should reject with error if url is protocol relative', function() {
		url = '//example.com/';
		return expect(fetch(url)).to.eventually.be.rejectedWith(Error);
	});

	it('should reject with error if url is relative path', function() {
		url = '/some/path';
		return expect(fetch(url)).to.eventually.be.rejectedWith(Error);
	});

	it('should reject with error if protocol is unsupported', function() {
		url = 'ftp://example.com/';
		return expect(fetch(url)).to.eventually.be.rejectedWith(Error);
	});

	it('should reject with error on network failure', function() {
		url = 'http://localhost:50000/';
		return expect(fetch(url)).to.eventually.be.rejectedWith(Error);
	});

	it('should resolve into response', function() {
		url = base + '/hello';
		return fetch(url).then(function(res) {
			expect(res).to.be.an.instanceof(Response);
			expect(res.headers).to.be.an.instanceof(Headers);
			expect(res.body).to.be.an.instanceof(stream.Transform);
			expect(res.bodyUsed).to.be.false;

			expect(res.url).to.equal(url);
			expect(res.ok).to.be.true;
			expect(res.status).to.equal(200);
			expect(res.statusText).to.equal('OK');
		});
	});

	it('should accept plain text response', function() {
		url = base + '/plain';
		return fetch(url).then(function(res) {
			expect(res.headers.get('content-type')).to.equal('text/plain');
			return res.text().then(function(result) {
				expect(res.bodyUsed).to.be.true;
				expect(result).to.be.a('string');
				expect(result).to.equal('text');
			});
		});
	});

	it('should accept html response (like plain text)', function() {
		url = base + '/html';
		return fetch(url).then(function(res) {
			expect(res.headers.get('content-type')).to.equal('text/html');
			return res.text().then(function(result) {
				expect(res.bodyUsed).to.be.true;
				expect(result).to.be.a('string');
				expect(result).to.equal('<html></html>');
			});
		});
	});

	it('should accept json response', function() {
		url = base + '/json';
		return fetch(url).then(function(res) {
			expect(res.headers.get('content-type')).to.equal('application/json');
			return res.json().then(function(result) {
				expect(res.bodyUsed).to.be.true;
				expect(result).to.be.an('object');
				expect(result).to.deep.equal({ name: 'value' });
			});
		});
	});

	it('should send request with custom headers', function() {
		url = base + '/inspect';
		opts = {
			headers: { 'x-custom-header': 'abc' }
		};
		return fetch(url, opts).then(function(res) {
			return res.json();
		}).then(function(res) {
			expect(res.headers['x-custom-header']).to.equal('abc');
		});
	});

	it('should accept headers instance', function() {
		url = base + '/inspect';
		opts = {
			headers: new Headers({ 'x-custom-header': 'abc' })
		};
		return fetch(url, opts).then(function(res) {
			return res.json();
		}).then(function(res) {
			expect(res.headers['x-custom-header']).to.equal('abc');
		});
	});

	it('should accept custom host header', function() {
		url = base + '/inspect';
		opts = {
			headers: {
				host: 'example.com'
			}
		};
		return fetch(url, opts).then(function(res) {
			return res.json();
		}).then(function(res) {
			expect(res.headers['host']).to.equal('example.com');
		});
	});

	it('should follow redirect code 301', function() {
		url = base + '/redirect/301';
		return fetch(url).then(function(res) {
			expect(res.url).to.equal(base + '/inspect');
			expect(res.status).to.equal(200);
			expect(res.ok).to.be.true;
		});
	});

	it('should follow redirect code 302', function() {
		url = base + '/redirect/302';
		return fetch(url).then(function(res) {
			expect(res.url).to.equal(base + '/inspect');
			expect(res.status).to.equal(200);
		});
	});

	it('should follow redirect code 303', function() {
		url = base + '/redirect/303';
		return fetch(url).then(function(res) {
			expect(res.url).to.equal(base + '/inspect');
			expect(res.status).to.equal(200);
		});
	});

	it('should follow redirect code 307', function() {
		url = base + '/redirect/307';
		return fetch(url).then(function(res) {
			expect(res.url).to.equal(base + '/inspect');
			expect(res.status).to.equal(200);
		});
	});

	it('should follow redirect code 308', function() {
		url = base + '/redirect/308';
		return fetch(url).then(function(res) {
			expect(res.url).to.equal(base + '/inspect');
			expect(res.status).to.equal(200);
		});
	});

	it('should follow redirect chain', function() {
		url = base + '/redirect/chain';
		return fetch(url).then(function(res) {
			expect(res.url).to.equal(base + '/inspect');
			expect(res.status).to.equal(200);
		});
	});

	it('should follow POST request redirect code 301 with GET', function() {
		url = base + '/redirect/301';
		opts = {
			method: 'POST'
			, body: 'a=1'
		};
		return fetch(url, opts).then(function(res) {
			expect(res.url).to.equal(base + '/inspect');
			expect(res.status).to.equal(200);
			return res.json().then(function(result) {
				expect(result.method).to.equal('GET');
				expect(result.body).to.equal('');
			});
		});
	});

	it('should follow POST request redirect code 302 with GET', function() {
		url = base + '/redirect/302';
		opts = {
			method: 'POST'
			, body: 'a=1'
		};
		return fetch(url, opts).then(function(res) {
			expect(res.url).to.equal(base + '/inspect');
			expect(res.status).to.equal(200);
			return res.json().then(function(result) {
				expect(result.method).to.equal('GET');
				expect(result.body).to.equal('');
			});
		});
	});

	it('should follow redirect code 303 with GET', function() {
		url = base + '/redirect/303';
		opts = {
			method: 'PUT'
			, body: 'a=1'
		};
		return fetch(url, opts).then(function(res) {
			expect(res.url).to.equal(base + '/inspect');
			expect(res.status).to.equal(200);
			return res.json().then(function(result) {
				expect(result.method).to.equal('GET');
				expect(result.body).to.equal('');
			});
		});
	});

	it('should obey maximum redirect', function() {
		url = base + '/redirect/chain';
		opts = {
			follow: 1
		}
		return expect(fetch(url, opts)).to.eventually.be.rejectedWith(Error);
	});

	it('should allow not following redirect', function() {
		url = base + '/redirect/301';
		opts = {
			follow: 0
		}
		return expect(fetch(url, opts)).to.eventually.be.rejectedWith(Error);
	});

	it('should follow redirect code 301 and keep existing headers', function() {
		url = base + '/redirect/301';
		opts = {
			headers: new Headers({ 'x-custom-header': 'abc' })
		};
		return fetch(url, opts).then(function(res) {
			expect(res.url).to.equal(base + '/inspect');
			return res.json();
		}).then(function(res) {
			expect(res.headers['x-custom-header']).to.equal('abc');
		});
	});

	it('should reject broken redirect', function() {
		url = base + '/error/redirect';
		return expect(fetch(url)).to.eventually.be.rejectedWith(Error);
	});

	it('should handle client-error response', function() {
		url = base + '/error/400';
		return fetch(url).then(function(res) {
			expect(res.headers.get('content-type')).to.equal('text/plain');
			expect(res.status).to.equal(400);
			expect(res.statusText).to.equal('Bad Request');
			expect(res.ok).to.be.false;
			return res.text().then(function(result) {
				expect(res.bodyUsed).to.be.true;
				expect(result).to.be.a('string');
				expect(result).to.equal('client error');
			});
		});
	});

	it('should handle server-error response', function() {
		url = base + '/error/500';
		return fetch(url).then(function(res) {
			expect(res.headers.get('content-type')).to.equal('text/plain');
			expect(res.status).to.equal(500);
			expect(res.statusText).to.equal('Internal Server Error');
			expect(res.ok).to.be.false;
			return res.text().then(function(result) {
				expect(res.bodyUsed).to.be.true;
				expect(result).to.be.a('string');
				expect(result).to.equal('server error');
			});
		});
	});

	it('should handle network-error response', function() {
		url = base + '/error/reset';
		return expect(fetch(url)).to.eventually.be.rejectedWith(Error);
	});

	it('should reject invalid json response', function() {
		url = base + '/error/json';
		return fetch(url).then(function(res) {
			expect(res.headers.get('content-type')).to.equal('application/json');
			return expect(res.json()).to.eventually.be.rejectedWith(Error);
		});
	});

	it('should handle empty response', function() {
		url = base + '/empty';
		return fetch(url).then(function(res) {
			expect(res.status).to.equal(204);
			expect(res.statusText).to.equal('No Content');
			expect(res.ok).to.be.true;
			return res.text().then(function(result) {
				expect(result).to.be.a('string');
				expect(result).to.be.empty;
			});
		});
	});

	it('should decompress gzip response', function() {
		url = base + '/gzip';
		return fetch(url).then(function(res) {
			expect(res.headers.get('content-type')).to.equal('text/plain');
			return res.text().then(function(result) {
				expect(result).to.be.a('string');
				expect(result).to.equal('hello world');
			});
		});
	});

	it('should decompress deflate response', function() {
		url = base + '/deflate';
		return fetch(url).then(function(res) {
			expect(res.headers.get('content-type')).to.equal('text/plain');
			return res.text().then(function(result) {
				expect(result).to.be.a('string');
				expect(result).to.equal('hello world');
			});
		});
	});

	it('should skip decompression if unsupported', function() {
		url = base + '/sdch';
		return fetch(url).then(function(res) {
			expect(res.headers.get('content-type')).to.equal('text/plain');
			return res.text().then(function(result) {
				expect(result).to.be.a('string');
				expect(result).to.equal('fake sdch string');
			});
		});
	});

	it('should reject if response compression is invalid', function() {
		url = base + '/invalid-content-encoding';
		return fetch(url).then(function(res) {
			expect(res.headers.get('content-type')).to.equal('text/plain');
			return expect(res.text()).to.eventually.be.rejectedWith(Error);
		});
	});

	it('should allow disabling auto decompression', function() {
		url = base + '/gzip';
		opts = {
			compress: false
		};
		return fetch(url, opts).then(function(res) {
			expect(res.headers.get('content-type')).to.equal('text/plain');
			return res.text().then(function(result) {
				expect(result).to.be.a('string');
				expect(result).to.not.equal('hello world');
			});
		});
	});

	it('should allow custom timeout', function() {
		this.timeout(500);
		url = base + '/timeout';
		opts = {
			timeout: 100
		};
		return expect(fetch(url, opts)).to.eventually.be.rejectedWith(Error);
	});

	it('should allow custom timeout on response body', function() {
		this.timeout(500);
		url = base + '/slow';
		opts = {
			timeout: 100
		};
		return fetch(url, opts).then(function(res) {
			expect(res.ok).to.be.true;
			return expect(res.text()).to.eventually.be.rejectedWith(Error);
		});
	});

	it('should clear internal timeout on fetch response', function (done) {
		this.timeout(1000);
		spawn('node', ['-e', 'require("./")("' + base + '/hello", { timeout: 5000 })'])
			.on('exit', function () {
				done();
			});
	});

	it('should clear internal timeout on fetch redirect', function (done) {
		this.timeout(1000);
		spawn('node', ['-e', 'require("./")("' + base + '/redirect/301", { timeout: 5000 })'])
			.on('exit', function () {
				done();
			});
	});

	it('should clear internal timeout on fetch error', function (done) {
		this.timeout(1000);
		spawn('node', ['-e', 'require("./")("' + base + '/error/reset", { timeout: 5000 })'])
			.on('exit', function () {
				done();
			});
	});

	it('should allow POST request', function() {
		url = base + '/inspect';
		opts = {
			method: 'POST'
		};
		return fetch(url, opts).then(function(res) {
			return res.json();
		}).then(function(res) {
			expect(res.method).to.equal('POST');
			expect(res.headers['transfer-encoding']).to.be.undefined;
			expect(res.headers['content-length']).to.equal('0');
		});
	});

	it('should allow POST request with string body', function() {
		url = base + '/inspect';
		opts = {
			method: 'POST'
			, body: 'a=1'
		};
		return fetch(url, opts).then(function(res) {
			return res.json();
		}).then(function(res) {
			expect(res.method).to.equal('POST');
			expect(res.body).to.equal('a=1');
			expect(res.headers['transfer-encoding']).to.be.undefined;
			expect(res.headers['content-length']).to.equal('3');
		});
	});

	it('should allow POST request with readable stream as body', function() {
		url = base + '/inspect';
		opts = {
			method: 'POST'
			, body: resumer().queue('a=1').end()
		};
		return fetch(url, opts).then(function(res) {
			return res.json();
		}).then(function(res) {
			expect(res.method).to.equal('POST');
			expect(res.body).to.equal('a=1');
			expect(res.headers['transfer-encoding']).to.equal('chunked');
			expect(res.headers['content-length']).to.be.undefined;
		});
	});

	it('should allow POST request with form-data as body', function() {
		var form = new FormData();
		form.append('a','1');

		url = base + '/multipart';
		opts = {
			method: 'POST'
			, body: form
		};
		return fetch(url, opts).then(function(res) {
			return res.json();
		}).then(function(res) {
			expect(res.method).to.equal('POST');
			expect(res.headers['content-type']).to.contain('multipart/form-data');
			expect(res.body).to.equal('a=1');
		});
	});

	it('should allow POST request with form-data as body and custom headers', function() {
		var form = new FormData();
		form.append('a','1');

		var headers = form.getHeaders();
		headers['b'] = '2';

		url = base + '/multipart';
		opts = {
			method: 'POST'
			, body: form
			, headers: headers
		};
		return fetch(url, opts).then(function(res) {
			return res.json();
		}).then(function(res) {
			expect(res.method).to.equal('POST');
			expect(res.headers['content-type']).to.contain('multipart/form-data');
			expect(res.headers.b).to.equal('2');
			expect(res.body).to.equal('a=1');
		});
	});

	it('should allow PUT request', function() {
		url = base + '/inspect';
		opts = {
			method: 'PUT'
			, body: 'a=1'
		};
		return fetch(url, opts).then(function(res) {
			return res.json();
		}).then(function(res) {
			expect(res.method).to.equal('PUT');
			expect(res.body).to.equal('a=1');
		});
	});

	it('should allow DELETE request', function() {
		url = base + '/inspect';
		opts = {
			method: 'DELETE'
		};
		return fetch(url, opts).then(function(res) {
			return res.json();
		}).then(function(res) {
			expect(res.method).to.equal('DELETE');
		});
	});

	it('should allow PATCH request', function() {
		url = base + '/inspect';
		opts = {
			method: 'PATCH'
			, body: 'a=1'
		};
		return fetch(url, opts).then(function(res) {
			return res.json();
		}).then(function(res) {
			expect(res.method).to.equal('PATCH');
			expect(res.body).to.equal('a=1');
		});
	});

	it('should allow HEAD request', function() {
		url = base + '/hello';
		opts = {
			method: 'HEAD'
		};
		return fetch(url, opts).then(function(res) {
			expect(res.status).to.equal(200);
			expect(res.statusText).to.equal('OK');
			expect(res.headers.get('content-type')).to.equal('text/plain');
			expect(res.body).to.be.an.instanceof(stream.Transform);
		});
	});

	it('should reject decoding body twice', function() {
		url = base + '/plain';
		return fetch(url).then(function(res) {
			expect(res.headers.get('content-type')).to.equal('text/plain');
			return res.text().then(function(result) {
				expect(res.bodyUsed).to.be.true;
				return expect(res.text()).to.eventually.be.rejectedWith(Error);
			});
		});
	});

	it('should support maximum response size, multiple chunk', function() {
		url = base + '/size/chunk';
		opts = {
			size: 5
		};
		return fetch(url, opts).then(function(res) {
			expect(res.status).to.equal(200);
			expect(res.headers.get('content-type')).to.equal('text/plain');
			return expect(res.text()).to.eventually.be.rejectedWith(Error);
		});
	});

	it('should support maximum response size, single chunk', function() {
		url = base + '/size/long';
		opts = {
			size: 5
		};
		return fetch(url, opts).then(function(res) {
			expect(res.status).to.equal(200);
			expect(res.headers.get('content-type')).to.equal('text/plain');
			return expect(res.text()).to.eventually.be.rejectedWith(Error);
		});
	});

	it('should support encoding decode, xml dtd detect', function() {
		url = base + '/encoding/euc-jp';
		return fetch(url).then(function(res) {
			expect(res.status).to.equal(200);
			return res.text().then(function(result) {
				expect(result).to.equal('<?xml version="1.0" encoding="EUC-JP"?><title>日本語</title>');
			});
		});
	});

	it('should support encoding decode, content-type detect', function() {
		url = base + '/encoding/shift-jis';
		return fetch(url).then(function(res) {
			expect(res.status).to.equal(200);
			return res.text().then(function(result) {
				expect(result).to.equal('<div>日本語</div>');
			});
		});
	});

	it('should support encoding decode, html5 detect', function() {
		url = base + '/encoding/gbk';
		return fetch(url).then(function(res) {
			expect(res.status).to.equal(200);
			return res.text().then(function(result) {
				expect(result).to.equal('<meta charset="gbk"><div>中文</div>');
			});
		});
	});

	it('should support encoding decode, html4 detect', function() {
		url = base + '/encoding/gb2312';
		return fetch(url).then(function(res) {
			expect(res.status).to.equal(200);
			return res.text().then(function(result) {
				expect(result).to.equal('<meta http-equiv="Content-Type" content="text/html; charset=gb2312"><div>中文</div>');
			});
		});
	});

	it('should default to utf8 encoding', function() {
		url = base + '/encoding/utf8';
		return fetch(url).then(function(res) {
			expect(res.status).to.equal(200);
			expect(res.headers.get('content-type')).to.be.null;
			return res.text().then(function(result) {
				expect(result).to.equal('中文');
			});
		});
	});

	it('should support uncommon content-type order, charset in front', function() {
		url = base + '/encoding/order1';
		return fetch(url).then(function(res) {
			expect(res.status).to.equal(200);
			return res.text().then(function(result) {
				expect(result).to.equal('中文');
			});
		});
	});

	it('should support uncommon content-type order, end with qs', function() {
		url = base + '/encoding/order2';
		return fetch(url).then(function(res) {
			expect(res.status).to.equal(200);
			return res.text().then(function(result) {
				expect(result).to.equal('中文');
			});
		});
	});

	it('should allow piping response body as stream', function(done) {
		url = base + '/hello';
		fetch(url).then(function(res) {
			expect(res.body).to.be.an.instanceof(stream.Transform);
			res.body.on('data', function(chunk) {
				if (chunk === null) {
					return;
				}
				expect(chunk.toString()).to.equal('world');
			});
			res.body.on('end', function() {
				done();
			});
		});
	});

	it('should allow get all responses of a header', function() {
		url = base + '/cookie';
		return fetch(url).then(function(res) {
			expect(res.headers.get('set-cookie')).to.equal('a=1');
			expect(res.headers.get('Set-Cookie')).to.equal('a=1');
			expect(res.headers.getAll('set-cookie')).to.deep.equal(['a=1', 'b=1']);
			expect(res.headers.getAll('Set-Cookie')).to.deep.equal(['a=1', 'b=1']);
		});
	});

	it('should allow deleting header', function() {
		url = base + '/cookie';
		return fetch(url).then(function(res) {
			res.headers.delete('set-cookie');
			expect(res.headers.get('set-cookie')).to.be.null;
			expect(res.headers.getAll('set-cookie')).to.be.empty;
		});
	});

	it('should ignore unsupported attributes while reading headers', function() {
		var FakeHeader = function() {};
		// prototypes are ignored
		FakeHeader.prototype.z = 'fake';

		var res = new FakeHeader;
		// valid
		res.a = 'string';
		res.b = ['1','2'];
		res.c = '';
		res.d = [];
		// common mistakes, normalized
		res.e = 1;
		res.f = [1, 2];
		// invalid, ignored
		res.g = { a:1 };
		res.h = undefined;
		res.i = null;
		res.j = NaN;
		res.k = true;
		res.l = false;

		var h1 = new Headers(res);

		expect(h1._headers['a']).to.include('string');
		expect(h1._headers['b']).to.include('1');
		expect(h1._headers['b']).to.include('2');
		expect(h1._headers['c']).to.include('');
		expect(h1._headers['d']).to.be.undefined;

		expect(h1._headers['e']).to.include('1');
		expect(h1._headers['f']).to.include('1');
		expect(h1._headers['f']).to.include('2');

		expect(h1._headers['g']).to.be.undefined;
		expect(h1._headers['h']).to.be.undefined;
		expect(h1._headers['i']).to.be.undefined;
		expect(h1._headers['j']).to.be.undefined;
		expect(h1._headers['k']).to.be.undefined;
		expect(h1._headers['l']).to.be.undefined;

		expect(h1._headers['z']).to.be.undefined;
	});

	it('should wrap headers', function() {
		var h1 = new Headers({
			a: '1'
		});

		var h2 = new Headers(h1);
		h2.set('b', '1');

		var h3 = new Headers(h2);
		h3.append('a', '2');

		expect(h1._headers['a']).to.include('1');
		expect(h1._headers['a']).to.not.include('2');
		expect(h1._headers['b']).to.not.include('1');

		expect(h2._headers['a']).to.include('1');
		expect(h2._headers['a']).to.not.include('2');
		expect(h2._headers['b']).to.include('1');

		expect(h3._headers['a']).to.include('1');
		expect(h3._headers['a']).to.include('2');
		expect(h3._headers['b']).to.include('1');
	});

	it('should support fetch with Request instance', function() {
		url = base + '/hello';
		var req = new Request(url);
		return fetch(req).then(function(res) {
			expect(res.url).to.equal(url);
			expect(res.ok).to.be.true;
			expect(res.status).to.equal(200);
		});
	});

	it('should support wrapping Request instance', function() {
		url = base + '/hello';
		var r1 = new Request(url, {
			method: 'POST'
			, follow: 1
		});
		var r2 = new Request(r1, {
			follow: 2
		})
		expect(r2.url).to.equal(url);
		expect(r2.method).to.equal('POST');
		expect(r1.follow).to.equal(1);
		expect(r2.follow).to.equal(2);
	});

	it('should support overwrite Request instance', function() {
		url = base + '/inspect';
		var req = new Request(url, {
			method: 'POST'
			, headers: {
				a: '1'
			}
		});
		return fetch(req, {
			method: 'GET'
			, headers: {
				a: '2'
			}
		}).then(function(res) {
			return res.json();
		}).then(function(body) {
			expect(body.method).to.equal('GET');
			expect(body.headers.a).to.equal('2');
		});
	});

	it('should support empty options in Response constructor', function() {
		var body = resumer().queue('a=1').end();
		body = body.pipe(new stream.PassThrough());
		var res = new Response(body);
		return res.text().then(function(result) {
			expect(result).to.equal('a=1');
		});
	});

	it('should support parsing headers in Response constructor', function() {
		var body = resumer().queue('a=1').end();
		body = body.pipe(new stream.PassThrough());
		var res = new Response(body, {
			headers: {
				a: '1'
			}
		});
		expect(res.headers.get('a')).to.equal('1');
		return res.text().then(function(result) {
			expect(result).to.equal('a=1');
		});
	});

	it('should support parsing headers in Request constructor', function() {
		url = base;
		var req = new Request(url, {
			headers: {
				a: '1'
			}
		});
		expect(req.url).to.equal(url);
		expect(req.headers.get('a')).to.equal('1');
	});

	it('should support https request', function() {
		this.timeout(5000);
		url = 'https://github.com/';
		opts = {
			method: 'HEAD'
		};
		return fetch(url, opts).then(function(res) {
			expect(res.status).to.equal(200);
			expect(res.ok).to.be.true;
		});
	});

});
