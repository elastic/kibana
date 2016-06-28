// Load modules

var Fs = require('fs');
var Http = require('http');
var Path = require('path');
var Zlib = require('zlib');
var Code = require('code');
var Hapi = require('..');
var Hoek = require('hoek');
var Lab = require('lab');
var Wreck = require('wreck');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('payload', function () {

    it('sets payload', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';

        var handler = function (request, reply) {

            expect(request.payload).to.exist();
            expect(request.payload.z).to.equal('3');
            expect(request.mime).to.equal('application/json');
            return reply(request.payload);
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/', config: { handler: handler } });

        server.inject({ method: 'POST', url: '/', payload: payload }, function (res) {

            expect(res.result).to.exist();
            expect(res.result.x).to.equal('1');
            done();
        });
    });

    it('handles request socket error', function (done) {

        var handler = function () {

            throw new Error('never called');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/', config: { handler: handler } });

        server.inject({ method: 'POST', url: '/', payload: 'test', simulate: { error: true, end: false } }, function (res) {

            expect(res.result).to.exist();
            expect(res.result.statusCode).to.equal(500);
            done();
        });
    });

    it('handles request socket close', function (done) {

        var handler = function () {

            throw new Error('never called');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/', config: { handler: handler } });

        server.once('response', function (request) {

            expect(request._isBailed).to.equal(true);
            done();
        });

        server.inject({ method: 'POST', url: '/', payload: 'test', simulate: { close: true, end: false } }, function (res) { });
    });

    it('handles aborted request', function (done) {

        var handler = function (request, reply) {

            return reply('Success');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/', config: { handler: handler, payload: { parse: false } } });

        server.start(function () {

            var options = {
                hostname: 'localhost',
                port: server.info.port,
                path: '/',
                method: 'POST',
                headers: {
                    'Content-Length': '10'
                }
            };

            var req = Http.request(options, function (res) {

            });

            req.write('Hello\n');

            req.on('error', function (err) {

                expect(err.code).to.equal('ECONNRESET');
                done();
            });

            setTimeout(function () {

                req.abort();
            }, 15);
        });
    });

    it('errors when payload too big', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';

        var handler = function (request, reply) {

            expect(request.payload.toString()).to.equal(payload);
            return reply(request.payload);
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/', config: { handler: handler, payload: { maxBytes: 10 } } });

        server.inject({ method: 'POST', url: '/', payload: payload, headers: { 'content-length': payload.length } }, function (res) {

            expect(res.statusCode).to.equal(400);
            expect(res.result).to.exist();
            expect(res.result.message).to.equal('Payload content length greater than maximum allowed: 10');
            done();
        });
    });

    it('returns 400 with response when payload is not consumed', function (done) {

        var payload = new Buffer(10 * 1024 * 1024).toString();

        var handler = function (request, reply) {

            return reply();
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/', config: { handler: handler, payload: { maxBytes: 1024 * 1024 } } });

        server.start(function () {

            var uri = 'http://localhost:' + server.info.port;

            Wreck.post(uri, { payload: payload }, function (err, res, body) {

                expect(err).to.not.exist();
                expect(res.statusCode).to.equal(400);
                expect(body.toString()).to.equal('{"statusCode":400,"error":"Bad Request","message":"Payload content length greater than maximum allowed: 1048576"}');

                done();
            });
        });
    });

    it('peeks at unparsed data', function (done) {

        var data = null;
        var ext = function (request, reply) {

            var chunks = [];
            request.on('peek', function (chunk) {

                chunks.push(chunk);
            });

            request.once('finish', function () {

                data = Buffer.concat(chunks);
            });

            return reply.continue();
        };

        var handler = function (request, reply) {

            return reply(data);
        };

        var server = new Hapi.Server();
        server.connection();
        server.ext('onRequest', ext);
        server.route({ method: 'POST', path: '/', config: { handler: handler, payload: { parse: false } } });

        var payload = '0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789';
        server.inject({ method: 'POST', url: '/', payload: payload }, function (res) {

            expect(res.result).to.equal(payload);
            done();
        });
    });

    it('handles gzipped payload', function (done) {

        var handler = function (request, reply) {

            return reply(request.payload);
        };

        var message = { 'msg': 'This message is going to be gzipped.' };
        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/', handler: handler });

        Zlib.gzip(JSON.stringify(message), function (err, buf) {

            var request = {
                method: 'POST',
                url: '/',
                headers: {
                    'content-type': 'application/json',
                    'content-encoding': 'gzip',
                    'content-length': buf.length
                },
                payload: buf
            };

            server.inject(request, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.deep.equal(message);
                done();
            });
        });
    });

    it('saves a file after content decoding', function (done) {

        var path = Path.join(__dirname, './file/image.jpg');
        var sourceContents = Fs.readFileSync(path);
        var stats = Fs.statSync(path);

        Zlib.gzip(sourceContents, function (err, compressed) {

            var handler = function (request, reply) {

                var receivedContents = Fs.readFileSync(request.payload.path);
                Fs.unlinkSync(request.payload.path);
                expect(receivedContents).to.deep.equal(sourceContents);
                return reply(request.payload.bytes);
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'POST', path: '/file', config: { handler: handler, payload: { output: 'file' } } });
            server.inject({ method: 'POST', url: '/file', payload: compressed, headers: { 'content-encoding': 'gzip' } }, function (res) {

                expect(res.result).to.equal(stats.size);
                done();
            });
        });
    });

    it('errors saving a file without parse', function (done) {

        var handler = function (request, reply) { };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/file', config: { handler: handler, payload: { output: 'file', parse: false, uploads: '/a/b/c/d/not' } } });
        server.inject({ method: 'POST', url: '/file', payload: 'abcde' }, function (res) {

            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('sets parse mode when route methos is * and request is POST', function (done) {

        var handler = function (request, reply) {

            return reply(request.payload.key);
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: '*', path: '/any', handler: handler });

        server.inject({ url: '/any', method: 'POST', payload: { key: '09876' } }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal('09876');
            done();
        });
    });

    it('returns an error on unsupported mime type', function (done) {

        var handler = function (request, reply) {

            return reply(request.payload.key);
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/', config: { handler: handler } });

        server.start(function () {

            var options = {
                hostname: 'localhost',
                port: server.info.port,
                path: '/?x=4',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/unknown',
                    'Content-Length': '18'
                }
            };

            var req = Http.request(options, function (res) {

                expect(res.statusCode).to.equal(415);
                done();
            });

            req.end('{ "key": "value" }');
        });
    });

    it('ignores unsupported mime type', function (done) {

        var handler = function (request, reply) {

            return reply(request.payload);
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/', config: { handler: handler, payload: { failAction: 'ignore' } } });

        server.inject({ method: 'POST', url: '/', payload: 'testing123', headers: { 'content-type': 'application/unknown' } }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.deep.equal({});
            done();
        });
    });

    it('returns 200 on octet mime type', function (done) {

        var handler = function (request, reply) {

            return reply('ok');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/', handler: handler });

        server.inject({ method: 'POST', url: '/', payload: 'testing123', headers: { 'content-type': 'application/octet-stream' } }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal('ok');
            done();
        });
    });

    it('returns 200 on text mime type', function (done) {

        var textHandler = function (request, reply) {

            return reply(request.payload + '+456');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/text', config: { handler: textHandler } });

        server.inject({ method: 'POST', url: '/text', payload: 'testing123', headers: { 'content-type': 'text/plain' } }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal('testing123+456');
            done();
        });
    });

    it('returns 200 on override mime type', function (done) {

        var handler = function (request, reply) {

            return reply(request.payload.key);
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/override', config: { handler: handler, payload: { override: 'application/json' } } });

        server.inject({ method: 'POST', url: '/override', payload: '{"key":"cool"}', headers: { 'content-type': 'text/plain' } }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal('cool');
            done();
        });
    });

    it('returns 200 on text mime type when allowed', function (done) {

        var textHandler = function (request, reply) {

            return reply(request.payload + '+456');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/textOnly', config: { handler: textHandler, payload: { allow: 'text/plain' } } });

        server.inject({ method: 'POST', url: '/textOnly', payload: 'testing123', headers: { 'content-type': 'text/plain' } }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal('testing123+456');
            done();
        });
    });

    it('returns 415 on non text mime type when disallowed', function (done) {

        var textHandler = function (request, reply) {

            return reply(request.payload + '+456');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/textOnly', config: { handler: textHandler, payload: { allow: 'text/plain' } } });

        server.inject({ method: 'POST', url: '/textOnly', payload: 'testing123', headers: { 'content-type': 'application/octet-stream' } }, function (res) {

            expect(res.statusCode).to.equal(415);
            done();
        });
    });

    it('returns 200 on text mime type when allowed (array)', function (done) {

        var textHandler = function (request, reply) {

            return reply(request.payload + '+456');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/textOnlyArray', config: { handler: textHandler, payload: { allow: ['text/plain'] } } });

        server.inject({ method: 'POST', url: '/textOnlyArray', payload: 'testing123', headers: { 'content-type': 'text/plain' } }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal('testing123+456');
            done();
        });
    });

    it('returns 415 on non text mime type when disallowed (array)', function (done) {

        var textHandler = function (request, reply) {

            return reply(request.payload + '+456');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/textOnlyArray', config: { handler: textHandler, payload: { allow: ['text/plain'] } } });

        server.inject({ method: 'POST', url: '/textOnlyArray', payload: 'testing123', headers: { 'content-type': 'application/octet-stream' } }, function (res) {

            expect(res.statusCode).to.equal(415);
            done();
        });
    });

    it('parses application/x-www-form-urlencoded with arrays', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                return reply(request.payload.x.y + request.payload.x.z);
            }
        });

        server.inject({ method: 'POST', url: '/', payload: 'x[y]=1&x[z]=2', headers: { 'content-type': 'application/x-www-form-urlencoded' } }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal('12');
            done();
        });
    });

    it('returns parsed multipart data', function (done) {

        var multipartPayload =
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'First\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'Second\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'Third\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="field1"\r\n' +
                '\r\n' +
                'Joe Blow\r\nalmost tricked you!\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="field1"\r\n' +
                '\r\n' +
                'Repeated name segment\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="pics"; filename="file1.txt"\r\n' +
                'Content-Type: text/plain\r\n' +
                '\r\n' +
                '... contents of file1.txt ...\r\r\n' +
                '--AaB03x--\r\n';

        var handler = function (request, reply) {

            var result = {};
            var keys = Object.keys(request.payload);
            for (var i = 0, il = keys.length; i < il; ++i) {
                var key = keys[i];
                var value = request.payload[key];
                result[key] = value._readableState ? true : value;
            }

            return reply(result);
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'POST', path: '/echo', config: { handler: handler } });

        server.inject({ method: 'POST', url: '/echo', payload: multipartPayload, headers: { 'content-type': 'multipart/form-data; boundary=AaB03x' } }, function (res) {

            expect(Object.keys(res.result).length).to.equal(3);
            expect(res.result.field1).to.exist();
            expect(res.result.field1.length).to.equal(2);
            expect(res.result.field1[1]).to.equal('Repeated name segment');
            expect(res.result.pics).to.exist();
            done();
        });
    });

    it('times out when client request taking too long', function (done) {

        var handler = function (request, reply) {

            return reply('fast');
        };

        var server = new Hapi.Server();
        server.connection({ routes: { payload: { timeout: 50 } } });
        server.route({ method: 'POST', path: '/fast', config: { handler: handler } });
        server.start(function () {

            var timer = new Hoek.Bench();
            var options = {
                hostname: '127.0.0.1',
                port: server.info.port,
                path: '/fast',
                method: 'POST'
            };

            var req = Http.request(options, function (res) {

                expect(res.statusCode).to.equal(408);
                expect(timer.elapsed()).to.be.at.least(45);
                done();
            });

            req.on('error', function (err) { });                    // Will error out, so don't allow error to escape test

            req.write('{}\n');
            var now = Date.now();
            setTimeout(function () {

                req.end();
            }, 100);
        });
    });

    it('times out when client request taking too long (route override)', function (done) {

        var handler = function (request, reply) {

            return reply('fast');
        };

        var server = new Hapi.Server();
        server.connection({ routes: { payload: { timeout: false } } });
        server.route({ method: 'POST', path: '/fast', config: { payload: { timeout: 50 }, handler: handler } });
        server.start(function () {

            var timer = new Hoek.Bench();
            var options = {
                hostname: '127.0.0.1',
                port: server.info.port,
                path: '/fast',
                method: 'POST'
            };

            var req = Http.request(options, function (res) {

                expect(res.statusCode).to.equal(408);
                expect(timer.elapsed()).to.be.at.least(45);
                done();
            });

            req.on('error', function (err) { });                    // Will error out, so don't allow error to escape test

            req.write('{}\n');
            var now = Date.now();
            setTimeout(function () {

                req.end();
            }, 100);
        });
    });

    it('returns payload when timeout is not triggered', function (done) {

        var handler = function (request, reply) {

            return reply('fast');
        };

        var server = new Hapi.Server();
        server.connection({ routes: { payload: { timeout: 50 } } });
        server.route({ method: 'POST', path: '/fast', config: { handler: handler } });
        server.start(function () {

            var options = {
                hostname: '127.0.0.1',
                port: server.info.port,
                path: '/fast',
                method: 'POST'
            };

            var req = Http.request(options, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });

            req.end();
        });
    });
});
