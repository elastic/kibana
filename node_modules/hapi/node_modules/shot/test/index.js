// Load modules

var Util = require('util');
var Stream = require('stream');
var Fs = require('fs');
var Zlib = require('zlib');
var Lab = require('lab');
var Shot = require('../lib');
var Code = require('code');

// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('inject()', function () {

    it('returns non-chunked payload', function (done) {

        var output = 'example.com:8080|/hello';

        var dispatch = function (req, res) {

            res.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Length': output.length });
            res.end(req.headers.host + '|' + req.url);
        };

        Shot.inject(dispatch, 'http://example.com:8080/hello', function (res) {

            expect(res.headers.date).to.exist();
            expect(res.headers.connection).to.exist();
            expect(res.headers['transfer-encoding']).to.not.exist();
            expect(res.payload).to.equal(output);
            expect(res.rawPayload.toString()).to.equal('example.com:8080|/hello');
            done();
        });
    });

    it('returns single buffer payload', function (done) {

        var dispatch = function (req, res) {

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(req.headers.host + '|' + req.url);
        };

        Shot.inject(dispatch, { url: 'http://example.com:8080/hello' }, function (res) {

            expect(res.headers.date).to.exist();
            expect(res.headers.connection).to.exist();
            expect(res.headers['transfer-encoding']).to.equal('chunked');
            expect(res.payload).to.equal('example.com:8080|/hello');
            expect(res.rawPayload.toString()).to.equal('example.com:8080|/hello');
            done();
        });
    });

    it('passes headers', function (done) {

        var dispatch = function (req, res) {

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(req.headers.super);
        };

        Shot.inject(dispatch, { method: 'get', url: 'http://example.com:8080/hello', headers: { Super: 'duper' } }, function (res) {

            expect(res.payload).to.equal('duper');
            done();
        });
    });

    it('optionally accepts an object as url', function (done) {

        var output = 'example.com:8080|/hello?test=1234';

        var dispatch = function (req, res) {

            res.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Length': output.length });
            res.end(req.headers.host + '|' + req.url);
        };

        var url = {
            protocol: 'http',
            hostname: 'example.com',
            port: '8080',
            pathname: 'hello',
            query: {
                test: '1234'
            }
        };

        Shot.inject(dispatch, { url: url }, function (res) {

            expect(res.headers.date).to.exist();
            expect(res.headers.connection).to.exist();
            expect(res.headers['transfer-encoding']).to.not.exist();
            expect(res.payload).to.equal(output);
            done();
        });
    });

    it('leaves user-agent unmodified', function (done) {

        var dispatch = function (req, res) {

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(req.headers['user-agent']);
        };

        Shot.inject(dispatch, { method: 'get', url: 'http://example.com:8080/hello', headers: { 'user-agent': 'duper' } }, function (res) {

            expect(res.payload).to.equal('duper');
            done();
        });
    });

    it('returns chunked payload', function (done) {

        var dispatch = function (req, res) {

            res.writeHead(200, 'OK');
            res.write('a');
            res.write('b');
            res.end();
        };

        Shot.inject(dispatch, { method: 'get', url: '/' }, function (res) {

            expect(res.headers.date).to.exist();
            expect(res.headers.connection).to.exist();
            expect(res.headers['transfer-encoding']).to.equal('chunked');
            expect(res.payload).to.equal('ab');
            done();
        });
    });

    it('returns chunked payload with trailer', function (done) {

        var dispatch = function (req, res) {

            res.setHeader('Trailer', 'Server-Authorization');
            res.setHeader('Transfer-Encoding', 'chunked');
            res.writeHead(200, 'OK');
            res.write('a');
            res.write('b');
            res.addTrailers({ 'Test': 123 });
            res.end();
        };

        Shot.inject(dispatch, { method: 'get', url: '/' }, function (res) {

            expect(res.payload).to.equal('ab');
            expect(res.headers.test).to.equal('123');
            done();
        });
    });

    it('parses zipped payload', function (done) {

        var dispatch = function (req, res) {

            res.writeHead(200, 'OK');
            var stream = Fs.createReadStream('./package.json');
            stream.pipe(Zlib.createGzip()).pipe(res);
        };

        Shot.inject(dispatch, { method: 'get', url: '/' }, function (res) {

            Fs.readFile('./package.json', { encoding: 'utf-8' }, function (err, file) {

                Zlib.unzip(res.rawPayload, function (err, unzipped) {

                    expect(err).to.not.exist();
                    expect(unzipped.toString('utf-8')).to.deep.equal(file);
                    done();
                });
            });
        });
    });

    it('returns multi buffer payload', function (done) {

        var dispatch = function (req, res) {

            res.writeHead(200);
            res.write('a');
            res.write(new Buffer('b'));
            res.end();
        };

        Shot.inject(dispatch, { method: 'get', url: '/' }, function (res) {

            expect(res.payload).to.equal('ab');
            done();
        });
    });

    it('returns null payload', function (done) {

        var dispatch = function (req, res) {

            res.writeHead(200, { 'Content-Length': 0 });
            res.end();
        };

        Shot.inject(dispatch, { method: 'get', url: '/' }, function (res) {

            expect(res.payload).to.equal('');
            done();
        });
    });

    it('allows ending twice', function (done) {

        var dispatch = function (req, res) {

            res.writeHead(200, { 'Content-Length': 0 });
            res.end();
            res.end();
        };

        Shot.inject(dispatch, { method: 'get', url: '/' }, function (res) {

            expect(res.payload).to.equal('');
            done();
        });
    });

    it('identifies injection object', function (done) {

        var dispatch = function (req, res) {

            expect(Shot.isInjection(req)).to.equal(true);
            expect(Shot.isInjection(res)).to.equal(true);

            res.writeHead(200, { 'Content-Length': 0 });
            res.end();
        };

        Shot.inject(dispatch, { method: 'get', url: '/' }, function (res) {

            done();
        });
    });

    it('pipes response', function (done) {

        var Read = function () {

            Stream.Readable.call(this);
        };

        Util.inherits(Read, Stream.Readable);

        Read.prototype._read = function (size) {

            this.push('hi');
            this.push(null);
        };

        var finished = false;
        var dispatch = function (req, res) {

            res.writeHead(200);
            var stream = new Read();

            res.on('finish', function () {

                finished = true;
            });

            stream.pipe(res);
        };

        Shot.inject(dispatch, { method: 'get', url: '/' }, function (res) {

            expect(finished).to.equal(true);
            expect(res.payload).to.equal('hi');
            done();
        });
    });

    it('pipes response with old stream', function (done) {

        var Read = function () {

            Stream.Readable.call(this);
        };

        Util.inherits(Read, Stream.Readable);

        Read.prototype._read = function (size) {

            this.push('hi');
            this.push(null);
        };

        var finished = false;
        var dispatch = function (req, res) {

            res.writeHead(200);
            var stream = new Read();
            stream.pause();
            var stream2 = new Stream.Readable().wrap(stream);
            stream.resume();

            res.on('finish', function () {

                finished = true;
            });

            stream2.pipe(res);
        };

        Shot.inject(dispatch, { method: 'get', url: '/' }, function (res) {

            expect(finished).to.equal(true);
            expect(res.payload).to.equal('hi');
            done();
        });
    });

    it('echos object payload', function (done) {

        var dispatch = function (req, res) {

            res.writeHead(200, { 'content-type': req.headers['content-type'] });
            req.pipe(res);
        };

        Shot.inject(dispatch, { method: 'post', url: '/test', payload: { a: 1 } }, function (res) {

            expect(res.headers['content-type']).to.equal('application/json');
            expect(res.payload).to.equal('{"a":1}');
            done();
        });
    });

    it('echos buffer payload', function (done) {

        var dispatch = function (req, res) {

            res.writeHead(200, { 'content-type': req.headers['content-type'] });
            req.pipe(res);
        };

        Shot.inject(dispatch, { method: 'post', url: '/test', payload: new Buffer('test!') }, function (res) {

            expect(res.payload).to.equal('test!');
            done();
        });
    });

    it('echos object payload with non-english utf-8 string', function (done) {

        var dispatch = function (req, res) {

            res.writeHead(200, { 'content-type': req.headers['content-type'] });
            req.pipe(res);
        };

        Shot.inject(dispatch, { method: 'post', url: '/test', payload: { a: '½½א' } }, function (res) {

            expect(res.headers['content-type']).to.equal('application/json');
            expect(res.payload).to.equal('{"a":"½½א"}');
            done();
        });
    });

    it('echos object payload without payload', function (done) {

        var dispatch = function (req, res) {

            res.writeHead(200);
            req.pipe(res);
        };

        Shot.inject(dispatch, { method: 'post', url: '/test' }, function (res) {

            expect(res.payload).to.equal('');
            done();
        });
    });

    it('retains content-type header', function (done) {

        var dispatch = function (req, res) {

            res.writeHead(200, { 'content-type': req.headers['content-type'] });
            req.pipe(res);
        };

        Shot.inject(dispatch, { method: 'post', url: '/test', payload: { a: 1 }, headers: { 'content-type': 'something' } }, function (res) {

            expect(res.headers['content-type']).to.equal('something');
            expect(res.payload).to.equal('{"a":1}');
            done();
        });
    });

    it('adds a content-length header if none set when payload specified', function (done) {

        var dispatch = function (req, res) {

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(req.headers['content-length']);
        };

        Shot.inject(dispatch, { method: 'post', url: '/test', payload: { a: 1 } }, function (res) {

            expect(res.payload).to.equal('{"a":1}'.length.toString());
            done();
        });

    });

    it('retains a content-length header when payload specified', function (done) {

        var dispatch = function (req, res) {

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(req.headers['content-length']);
        };

        Shot.inject(dispatch, { method: 'post', url: '/test', payload: '', headers: { 'content-length': '10' } }, function (res) {

            expect(res.payload).to.equal('10');
            done();
        });

    });
});

describe('writeHead()', function () {

    it('returns single buffer payload', function (done) {

        var reply = 'Hello World';
        var dispatch = function (req, res) {

            res.writeHead(200, 'OK', { 'Content-Type': 'text/plain', 'Content-Length': reply.length });
            res.end(reply);
        };

        Shot.inject(dispatch, { method: 'get', url: '/' }, function (res) {

            expect(res.payload).to.equal(reply);
            done();
        });
    });
});

describe('_read()', function () {

    it('plays payload', function (done) {

        var dispatch = function (req, res) {

            var buffer = '';
            req.on('readable', function () {

                buffer += req.read() || '';
            });

            req.on('error', function (err) {
            });

            req.on('close', function () {
            });

            req.on('end', function () {

                res.writeHead(200, { 'Content-Length': 0 });
                res.end(buffer);
                req.destroy();
            });
        };

        var body = 'something special just for you';
        Shot.inject(dispatch, { method: 'get', url: '/', payload: body }, function (res) {

            expect(res.payload).to.equal(body);
            done();
        });
    });

    it('simulates split', function (done) {

        var dispatch = function (req, res) {

            var buffer = '';
            req.on('readable', function () {

                buffer += req.read() || '';
            });

            req.on('error', function (err) {
            });

            req.on('close', function () {
            });

            req.on('end', function () {

                res.writeHead(200, { 'Content-Length': 0 });
                res.end(buffer);
                req.destroy();
            });
        };

        var body = 'something special just for you';
        Shot.inject(dispatch, { method: 'get', url: '/', payload: body, simulate: { split: true } }, function (res) {

            expect(res.payload).to.equal(body);
            done();
        });
    });

    it('simulates error', function (done) {

        var dispatch = function (req, res) {

            req.on('readable', function () {
            });

            req.on('error', function (err) {

                res.writeHead(200, { 'Content-Length': 0 });
                res.end('error');
            });
        };

        var body = 'something special just for you';
        Shot.inject(dispatch, { method: 'get', url: '/', payload: body, simulate: { error: true } }, function (res) {

            expect(res.payload).to.equal('error');
            done();
        });
    });

    it('simulates no end without payload', function (done) {

        var end = false;
        var dispatch = function (req, res) {

            req.resume();
            req.on('end', function () {

                end = true;
            });
        };

        var replied = false;
        Shot.inject(dispatch, { method: 'get', url: '/', simulate: { end: false } }, function (res) {

            replied = true;
        });

        setTimeout(function () {

            expect(end).to.equal(false);
            expect(replied).to.equal(false);
            done();
        }, 10);
    });

    it('simulates no end with payload', function (done) {

        var end = false;
        var dispatch = function (req, res) {

            req.resume();
            req.on('end', function () {

                end = true;
            });
        };

        var replied = false;
        Shot.inject(dispatch, { method: 'get', url: '/', payload: '1234567', simulate: { end: false } }, function (res) {

            replied = true;
        });

        setTimeout(function () {

            expect(end).to.equal(false);
            expect(replied).to.equal(false);
            done();
        }, 10);
    });

    it('simulates close', function (done) {

        var dispatch = function (req, res) {

            var buffer = '';
            req.on('readable', function () {

                buffer += req.read() || '';
            });

            req.on('error', function (err) {
            });

            req.on('close', function () {

                res.writeHead(200, { 'Content-Length': 0 });
                res.end('close');
            });

            req.on('end', function () {
            });
        };

        var body = 'something special just for you';
        Shot.inject(dispatch, { method: 'get', url: '/', payload: body, simulate: { close: true } }, function (res) {

            expect(res.payload).to.equal('close');
            done();
        });
    });
});
