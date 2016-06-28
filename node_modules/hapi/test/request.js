// Load modules

var Http = require('http');
var Net = require('net');
var Stream = require('stream');
var Boom = require('boom');
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


describe('Request.Generator', function () {

    it('decorates request multiple times', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.decorate('request', 'x2', function () {

            return 2;
        });

        server.decorate('request', 'abc', 1);

        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply(request.x2() + request.abc);
            }
        });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal(3);
            done();
        });
    });
});

describe('Request', function () {

    it('sets client address', function (done) {

        var server = new Hapi.Server();
        server.connection();

        var handler = function (request, reply) {

            var expectedClientAddress = '127.0.0.1';
            if (Net.isIPv6(server.listener.address().address)) {
                expectedClientAddress = '::ffff:127.0.0.1';
            }

            expect(request.info.remoteAddress).to.equal(expectedClientAddress);
            expect(request.info.remoteAddress).to.equal(request.info.remoteAddress);
            return reply('ok');
        };

        server.route({ method: 'GET', path: '/', handler: handler });

        server.start(function () {

            Wreck.get('http://localhost:' + server.info.port, function (err, res, body) {

                expect(body.toString()).to.equal('ok');
                done();
            });
        });
    });

    it('sets referrer', function (done) {

        var server = new Hapi.Server();
        server.connection();

        var handler = function (request, reply) {

            expect(request.info.referrer).to.equal('http://site.com');
            return reply('ok');
        };

        server.route({ method: 'GET', path: '/', handler: handler });

        server.inject({ url: '/', headers: { referrer: 'http://site.com' } }, function (res) {

            expect(res.result).to.equal('ok');
            done();
        });
    });

    it('sets referer', function (done) {

        var server = new Hapi.Server();
        server.connection();

        var handler = function (request, reply) {

            expect(request.info.referrer).to.equal('http://site.com');
            return reply('ok');
        };

        server.route({ method: 'GET', path: '/', handler: handler });

        server.inject({ url: '/', headers: { referer: 'http://site.com' } }, function (res) {

            expect(res.result).to.equal('ok');
            done();
        });
    });

    it('sets headers', function (done) {

        var handler = function (request, reply) {

            return reply(request.headers['user-agent']);
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'GET', path: '/', handler: handler });

        server.inject('/', function (res) {

            expect(res.payload).to.equal('shot');
            done();
        });
    });

    it('generates unique request id', function (done) {

        var handler = function (request, reply) {

            return reply(request.id);
        };

        var server = new Hapi.Server();
        server.connection();
        server.connections[0]._requestCounter = { value: 10, min: 10, max: 11 };
        server.route({ method: 'GET', path: '/', handler: handler });
        server.inject('/', function (res1) {

            server.inject('/', function (res2) {

                server.inject('/', function (res3) {

                    expect(res1.result).to.match(/10$/);
                    expect(res2.result).to.match(/11$/);
                    expect(res3.result).to.match(/10$/);
                    done();
                });
            });
        });
    });

    describe('_execute()', function () {

        it('returns 400 on invalid path', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.inject('invalid', function (res) {

                expect(res.statusCode).to.equal(400);
                done();
            });
        });

        it('returns error response on ext error', function (done) {

            var handler = function (request, reply) {

                return reply('OK');
            };

            var server = new Hapi.Server();
            server.connection();

            var ext = function (request, reply) {

                return reply(Boom.badRequest());
            };

            server.ext('onPostHandler', ext);
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.result.statusCode).to.equal(400);
                done();
            });
        });

        it('handles aborted requests', { parallel: false }, function (done) {

            var handler = function (request, reply) {

                var TestStream = function () {

                    Stream.Readable.call(this);
                };

                Hoek.inherits(TestStream, Stream.Readable);

                TestStream.prototype._read = function (size) {

                    if (this.isDone) {
                        return;
                    }
                    this.isDone = true;

                    this.push('success');
                    this.emit('data', 'success');
                };

                var stream = new TestStream();
                return reply(stream);
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            server.start(function () {

                var total = 2;
                var createConnection = function () {

                    var client = Net.connect(server.info.port, function () {

                        client.write('GET / HTTP/1.1\r\n\r\n');
                        client.write('GET / HTTP/1.1\r\n\r\n');
                    });

                    client.on('data', function () {

                        total--;
                        client.destroy();
                    });
                };

                var check = function () {

                    if (total) {
                        createConnection();
                        setTimeout(check, 10);
                    }
                    else {
                        done();
                    }
                };

                check();
            });
        });

        it('returns empty params array when none present', function (done) {

            var handler = function (request, reply) {

                return reply(request.params);
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.result).to.deep.equal({});
                done();
            });
        });

        it('does not fail on abort', function (done) {

            var clientRequest;

            var handler = function (request, reply) {

                clientRequest.abort();

                setTimeout(function () {

                    reply(new Error('fail'));
                    setTimeout(done, 10);
                }, 10);
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            server.start(function () {

                clientRequest = Http.request({
                    hostname: 'localhost',
                    port: server.info.port,
                    method: 'GET'
                });

                clientRequest.on('error', function () { /* NOP */ });
                clientRequest.end();
            });
        });

        it('does not fail on abort with ext', function (done) {

            var clientRequest;

            var handler = function (request, reply) {

                clientRequest.abort();
                setTimeout(function () {

                    return reply(new Error('boom'));
                }, 10);
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            server.ext('onPreResponse', function (request, reply) {

                return reply.continue();
            });

            server.on('tail', function () {

                done();
            });

            server.start(function () {

                clientRequest = Http.request({
                    hostname: 'localhost',
                    port: server.info.port,
                    method: 'GET'
                });

                clientRequest.on('error', function () { /* NOP */ });
                clientRequest.end();
            });
        });
    });

    describe('_finalize()', function (done) {

        it('generate response event', function (done) {

            var handler = function (request, reply) {

                return reply('ok');
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', config: { handler: handler } });

            server.once('response', function (request) {

                expect(request.info.responded).to.be.min(request.info.received);
                done();
            });

            server.inject('/', function (res) { });
        });

        it('closes response after server timeout', function (done) {

            var handler = function (request, reply) {

                setTimeout(function () {

                    var stream = new Stream.Readable();
                    stream._read = function (size) {

                        this.push('value');
                        this.push(null);
                    };

                    stream.close = function () {

                        done();
                    };

                    return reply(stream);
                }, 10);
            };

            var server = new Hapi.Server();
            server.connection({ routes: { timeout: { server: 5 } } });
            server.route({
                method: 'GET',
                path: '/',
                handler: handler
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(503);
            });
        });

        it('does not attempt to close error response after server timeout', function (done) {

            var handler = function (request, reply) {

                setTimeout(function () {

                    return reply(new Error('after'));
                }, 10);
            };

            var server = new Hapi.Server();
            server.connection({ routes: { timeout: { server: 5 } } });
            server.route({
                method: 'GET',
                path: '/',
                handler: handler
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(503);
                done();
            });
        });

        it('emits request-error once', function (done) {

            var server = new Hapi.Server({ debug: false });
            server.connection();

            var errs = 0;
            var req = null;
            server.on('request-error', function (request, err) {

                errs++;
                expect(err).to.exist();
                expect(err.message).to.equal('boom2');
                req = request;
            });

            server.ext('onPreResponse', function (request, reply) {

                return reply(new Error('boom2'));
            });

            var handler = function (request, reply) {

                return reply(new Error('boom1'));
            };

            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                expect(res.result).to.exist();
                expect(res.result.message).to.equal('An internal server error occurred');
            });

            server.once('response', function () {

                expect(errs).to.equal(1);
                expect(req.getLog('error')[1].tags).to.deep.equal(['internal', 'error']);
                done();
            });
        });

        it('emits request-error on implementation error', function (done) {

            var server = new Hapi.Server({ debug: false });
            server.connection();

            var errs = 0;
            var req = null;
            server.on('request-error', function (request, err) {

                errs++;
                expect(err).to.exist();
                expect(err.message).to.equal('Uncaught error: boom');
                req = request;
            });

            var handler = function (request, reply) {

                throw new Error('boom');
            };

            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                expect(res.result).to.exist();
                expect(res.result.message).to.equal('An internal server error occurred');
            });

            server.once('response', function () {

                expect(errs).to.equal(1);
                expect(req.getLog('error')[0].tags).to.deep.equal(['internal', 'implementation', 'error']);
                done();
            });
        });

        it('does not emit request-error when error is replaced with valid response', function (done) {

            var server = new Hapi.Server({ debug: false });
            server.connection();

            var errs = 0;
            server.on('request-error', function (request, err) {

                errs++;
            });

            server.ext('onPreResponse', function (request, reply) {

                return reply('ok');
            });

            var handler = function (request, reply) {

                return reply(new Error('boom1'));
            };

            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('ok');
            });

            server.once('response', function () {

                expect(errs).to.equal(0);
                done();
            });
        });
    });

    describe('tail()', function () {

        it('generates tail event', function (done) {

            var handler = function (request, reply) {

                var t1 = request.addTail('t1');
                var t2 = request.addTail('t2');

                reply('Done');

                t1();
                t1();                           // Ignored
                setTimeout(t2, 10);
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            var result = null;

            server.once('tail', function () {

                expect(result).to.equal('Done');
                done();
            });

            server.inject('/', function (res) {

                result = res.result;
            });
        });

        it('generates tail event without name', function (done) {

            var handler = function (request, reply) {

                var tail = request.tail();
                reply('Done');
                tail();
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            var result = null;

            server.once('tail', function () {

                done();
            });

            server.inject('/', function (res) {

            });
        });
    });

    describe('setMethod()', function () {

        it('changes method with a lowercase version of the value passed in', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: function (request, reply) { } });

            server.ext('onRequest', function (request, reply) {

                request.setMethod('POST');
                return reply(request.method);
            });

            server.inject('/', function (res) {

                expect(res.payload).to.equal('post');
                done();
            });
        });

        it('errors on missing method', function (done) {

            var server = new Hapi.Server({ debug: false });
            server.connection();
            server.route({ method: 'GET', path: '/', handler: function (request, reply) { } });

            server.ext('onRequest', function (request, reply) {

                request.setMethod();
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('errors on invalid method type', function (done) {

            var server = new Hapi.Server({ debug: false });
            server.connection();
            server.route({ method: 'GET', path: '/', handler: function (request, reply) { } });

            server.ext('onRequest', function (request, reply) {

                request.setMethod(42);
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });
    });

    describe('setUrl()', function () {

        it('parses nested query string', function (done) {

            var handler = function (request, reply) {

                return reply(request.query);
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/?a[b]=5&d[ff]=ok', function (res) {

                expect(res.result).to.deep.equal({ a: { b: '5' }, d: { ff: 'ok' } });
                done();
            });
        });

        it('sets url, path, and query', function (done) {

            var url = 'http://localhost/page?param1=something';
            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: function (request, reply) { } });

            server.ext('onRequest', function (request, reply) {

                request.setUrl(url);
                return reply([request.url.href, request.path, request.query.param1].join('|'));
            });

            server.inject('/', function (res) {

                expect(res.payload).to.equal(url + '|/page|something');
                done();
            });
        });

        it('normalizes a path', function (done) {

            var rawPath = '/%0%1%2%3%4%5%6%7%8%9%a%b%c%d%e%f%10%11%12%13%14%15%16%17%18%19%1a%1b%1c%1d%1e%1f%20%21%22%23%24%25%26%27%28%29%2a%2b%2c%2d%2e%2f%30%31%32%33%34%35%36%37%38%39%3a%3b%3c%3d%3e%3f%40%41%42%43%44%45%46%47%48%49%4a%4b%4c%4d%4e%4f%50%51%52%53%54%55%56%57%58%59%5a%5b%5c%5d%5e%5f%60%61%62%63%64%65%66%67%68%69%6a%6b%6c%6d%6e%6f%70%71%72%73%74%75%76%77%78%79%7a%7b%7c%7d%7e%7f%80%81%82%83%84%85%86%87%88%89%8a%8b%8c%8d%8e%8f%90%91%92%93%94%95%96%97%98%99%9a%9b%9c%9d%9e%9f%a0%a1%a2%a3%a4%a5%a6%a7%a8%a9%aa%ab%ac%ad%ae%af%b0%b1%b2%b3%b4%b5%b6%b7%b8%b9%ba%bb%bc%bd%be%bf%c0%c1%c2%c3%c4%c5%c6%c7%c8%c9%ca%cb%cc%cd%ce%cf%d0%d1%d2%d3%d4%d5%d6%d7%d8%d9%da%db%dc%dd%de%df%e0%e1%e2%e3%e4%e5%e6%e7%e8%e9%ea%eb%ec%ed%ee%ef%f0%f1%f2%f3%f4%f5%f6%f7%f8%f9%fa%fb%fc%fd%fe%ff%0%1%2%3%4%5%6%7%8%9%A%B%C%D%E%F%10%11%12%13%14%15%16%17%18%19%1A%1B%1C%1D%1E%1F%20%21%22%23%24%25%26%27%28%29%2A%2B%2C%2D%2E%2F%30%31%32%33%34%35%36%37%38%39%3A%3B%3C%3D%3E%3F%40%41%42%43%44%45%46%47%48%49%4A%4B%4C%4D%4E%4F%50%51%52%53%54%55%56%57%58%59%5A%5B%5C%5D%5E%5F%60%61%62%63%64%65%66%67%68%69%6A%6B%6C%6D%6E%6F%70%71%72%73%74%75%76%77%78%79%7A%7B%7C%7D%7E%7F%80%81%82%83%84%85%86%87%88%89%8A%8B%8C%8D%8E%8F%90%91%92%93%94%95%96%97%98%99%9A%9B%9C%9D%9E%9F%A0%A1%A2%A3%A4%A5%A6%A7%A8%A9%AA%AB%AC%AD%AE%AF%B0%B1%B2%B3%B4%B5%B6%B7%B8%B9%BA%BB%BC%BD%BE%BF%C0%C1%C2%C3%C4%C5%C6%C7%C8%C9%CA%CB%CC%CD%CE%CF%D0%D1%D2%D3%D4%D5%D6%D7%D8%D9%DA%DB%DC%DD%DE%DF%E0%E1%E2%E3%E4%E5%E6%E7%E8%E9%EA%EB%EC%ED%EE%EF%F0%F1%F2%F3%F4%F5%F6%F7%F8%F9%FA%FB%FC%FD%FE%FF';
            var normPath = '/%0%1%2%3%4%5%6%7%8%9%a%b%c%d%e%f%10%11%12%13%14%15%16%17%18%19%1A%1B%1C%1D%1E%1F%20!%22%23$%25&\'()*+,-.%2F0123456789:;%3C=%3E%3F@ABCDEFGHIJKLMNOPQRSTUVWXYZ%5B%5C%5D%5E_%60abcdefghijklmnopqrstuvwxyz%7B%7C%7D~%7F%80%81%82%83%84%85%86%87%88%89%8A%8B%8C%8D%8E%8F%90%91%92%93%94%95%96%97%98%99%9A%9B%9C%9D%9E%9F%A0%A1%A2%A3%A4%A5%A6%A7%A8%A9%AA%AB%AC%AD%AE%AF%B0%B1%B2%B3%B4%B5%B6%B7%B8%B9%BA%BB%BC%BD%BE%BF%C0%C1%C2%C3%C4%C5%C6%C7%C8%C9%CA%CB%CC%CD%CE%CF%D0%D1%D2%D3%D4%D5%D6%D7%D8%D9%DA%DB%DC%DD%DE%DF%E0%E1%E2%E3%E4%E5%E6%E7%E8%E9%EA%EB%EC%ED%EE%EF%F0%F1%F2%F3%F4%F5%F6%F7%F8%F9%FA%FB%FC%FD%FE%FF%0%1%2%3%4%5%6%7%8%9%A%B%C%D%E%F%10%11%12%13%14%15%16%17%18%19%1A%1B%1C%1D%1E%1F%20!%22%23$%25&\'()*+,-.%2F0123456789:;%3C=%3E%3F@ABCDEFGHIJKLMNOPQRSTUVWXYZ%5B%5C%5D%5E_%60abcdefghijklmnopqrstuvwxyz%7B%7C%7D~%7F%80%81%82%83%84%85%86%87%88%89%8A%8B%8C%8D%8E%8F%90%91%92%93%94%95%96%97%98%99%9A%9B%9C%9D%9E%9F%A0%A1%A2%A3%A4%A5%A6%A7%A8%A9%AA%AB%AC%AD%AE%AF%B0%B1%B2%B3%B4%B5%B6%B7%B8%B9%BA%BB%BC%BD%BE%BF%C0%C1%C2%C3%C4%C5%C6%C7%C8%C9%CA%CB%CC%CD%CE%CF%D0%D1%D2%D3%D4%D5%D6%D7%D8%D9%DA%DB%DC%DD%DE%DF%E0%E1%E2%E3%E4%E5%E6%E7%E8%E9%EA%EB%EC%ED%EE%EF%F0%F1%F2%F3%F4%F5%F6%F7%F8%F9%FA%FB%FC%FD%FE%FF';

            var url = 'http://localhost' + rawPath + '?param1=something';

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: function (request, reply) { } });

            server.ext('onRequest', function (request, reply) {

                request.setUrl(url);
                return reply([request.url.href, request.path, request.query.param1].join('|'));
            });

            server.inject('/', function (res) {

                expect(res.payload).to.equal(url + '|' + normPath + '|something');
                done();
            });
        });

        it('allows missing path', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.ext('onRequest', function (request, reply) {

                request.setUrl('');
                return reply.continue();
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(400);
                done();
            });
        });

        it('strips trailing slash', function (done) {

            var handler = function (request, reply) {

                return reply();
            };

            var server = new Hapi.Server();
            server.connection({ router: { stripTrailingSlash: true } });
            server.route({ method: 'GET', path: '/test', handler: handler });
            server.inject('/test/', function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('does not strip trailing slash on /', function (done) {

            var handler = function (request, reply) {

                return reply();
            };

            var server = new Hapi.Server();
            server.connection({ router: { stripTrailingSlash: true } });
            server.route({ method: 'GET', path: '/', handler: handler });
            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('strips trailing slash with query', function (done) {

            var handler = function (request, reply) {

                return reply();
            };

            var server = new Hapi.Server();
            server.connection({ router: { stripTrailingSlash: true } });
            server.route({ method: 'GET', path: '/test', handler: handler });
            server.inject('/test/?a=b', function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('accepts querystring parser options', function (done) {

            var url = 'http://localhost/page?a=1&b=1&c=1&d=1&e=1&f=1&g=1&h=1&i=1&j=1&k=1&l=1&m=1&n=1&o=1&p=1&q=1&r=1&s=1&t=1&u=1&v=1&w=1&x=1&y=1&z=1';
            var qsParserOptions = {
                parameterLimit: 26
            };
            var server = new Hapi.Server();
            server.connection();
            server.ext('onRequest', function (request, reply) {

                request.setUrl(url, null, qsParserOptions);
                return reply(request.query);
            });

            server.inject('/', function (res) {

                expect(res.result).to.deep.equal({
                    a: '1', b: '1', c: '1', d: '1', e: '1', f: '1', g: '1', h: '1', i: '1',
                    j: '1', k: '1', l: '1', m: '1', n: '1', o: '1', p: '1', q: '1', r: '1',
                    s: '1', t: '1', u: '1', v: '1', w: '1', x: '1', y: '1', z: '1'
                });
                done();
            });
        });

        it('overrides qs settings', function (done) {

            var server = new Hapi.Server();
            server.connection({
                query: {
                    qs: {
                        parseArrays: false
                    }
                }
            });

            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.query);
                    }
                }
            });

            server.inject('/?a[0]=b&a[1]=c', function (res) {

                expect(res.result).to.deep.equal({ a: { 0: 'b', 1: 'c' } });
                done();
            });
        });
    });

    describe('log()', { parallel: false }, function () {

        it('outputs log data to debug console', function (done) {

            var handler = function (request, reply) {

                request.log(['implementation'], 'data');
                return reply();
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            var orig = console.error;
            console.error = function () {

                expect(arguments[0]).to.equal('Debug:');
                expect(arguments[1]).to.equal('implementation');
                expect(arguments[2]).to.equal('\n    data');
                console.error = orig;
                done();
            };

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
            });
        });

        it('emits a request event', function (done) {

            var handler = function (request, reply) {

                server.on('request', function (req, event, tags) {

                    expect(event).to.contain(['request', 'timestamp', 'tags', 'data', 'internal']);
                    expect(event.data).to.equal('data');
                    expect(event.internal).to.be.false();
                    expect(tags).to.deep.equal({ test: true });
                    return reply();
                });

                request.log(['test'], 'data');
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('outputs log to debug console without data', function (done) {

            var handler = function (request, reply) {

                request.log(['implementation']);
                return reply();
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            var orig = console.error;
            console.error = function () {

                expect(arguments[0]).to.equal('Debug:');
                expect(arguments[1]).to.equal('implementation');
                expect(arguments[2]).to.equal('');
                console.error = orig;
                done();
            };

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
            });
        });

        it('outputs log to debug console with error data', function (done) {

            var handler = function (request, reply) {

                request.log(['implementation'], new Error('boom'));
                return reply();
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            var orig = console.error;
            console.error = function () {

                expect(arguments[0]).to.equal('Debug:');
                expect(arguments[1]).to.equal('implementation');
                expect(arguments[2]).to.contain('Error: boom');
                console.error = orig;
                done();
            };

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
            });
        });

        it('handles invalid log data object stringify', function (done) {

            var handler = function (request, reply) {

                var obj = {};
                obj.a = obj;

                request.log(['implementation'], obj);
                return reply();
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            var orig = console.error;
            console.error = function () {

                console.error = orig;
                expect(arguments[0]).to.equal('Debug:');
                expect(arguments[1]).to.equal('implementation');
                expect(arguments[2]).to.equal('\n    [Cannot display object: Converting circular structure to JSON]');
                done();
            };

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
            });
        });

        it('adds a log event to the request', function (done) {

            var handler = function (request, reply) {

                request.log('1', 'log event 1', Date.now());
                request.log(['2'], 'log event 2', new Date(Date.now()));
                request.log(['3', '4']);
                request.log(['1', '4']);
                request.log(['2', '3']);
                request.log(['4']);
                request.log('4');

                return reply([request.getLog('1').length, request.getLog('4').length, request.getLog(['4']).length, request.getLog('0').length, request.getLog(['1', '2', '3', '4']).length, request.getLog().length >= 7].join('|'));
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.payload).to.equal('2|4|4|0|7|true');
                done();
            });
        });

        it('does not output events when debug disabled', function (done) {

            var server = new Hapi.Server({ debug: false });
            server.connection();

            var i = 0;
            var orig = console.error;
            console.error = function () {

                ++i;
            };

            var handler = function (request, reply) {

                request.log(['implementation']);
                return reply();
            };

            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                console.error('nothing');
                expect(i).to.equal(1);
                console.error = orig;
                done();
            });
        });

        it('does not output events when debug.request disabled', function (done) {

            var server = new Hapi.Server({ debug: { request: false } });
            server.connection();

            var i = 0;
            var orig = console.error;
            console.error = function () {

                ++i;
            };

            var handler = function (request, reply) {

                request.log(['implementation']);
                return reply();
            };

            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                console.error('nothing');
                expect(i).to.equal(1);
                console.error = orig;
                done();
            });
        });

        it('does not output non-implementation events by default', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var i = 0;
            var orig = console.error;
            console.error = function () {

                ++i;
            };

            var handler = function (request, reply) {

                request.log(['xyz']);
                return reply();
            };

            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                console.error('nothing');
                expect(i).to.equal(1);
                console.error = orig;
                done();
            });
        });
    });

    describe('_log()', { parallel: false }, function () {

        it('emits a request-internal event', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.once('request-internal', function (request, event, tags) {

                expect(tags.received).to.be.true();
                done();
            });

            server.inject('/', function (res) { });
        });
    });

    describe('getLog()', function () {

        it('returns the selected logs', function (done) {

            var handler = function (request, reply) {

                request._log('1');
                request.log('1');

                return reply([request.getLog('1').length, request.getLog('1', true).length, request.getLog('1', false).length, request.getLog(true).length, request.getLog(false).length, request.getLog().length].join('|'));
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.payload).to.equal('2|1|1|2|1|3');
                done();
            });
        });
    });

    describe('_setResponse()', function () {

        it('leaves the response open when the same response is set again', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.ext('onPostHandler', function (request, reply) {

                return reply(request.response);
            });

            var handler = function (request, reply) {

                var stream = new Stream.Readable();
                stream._read = function (size) {

                    this.push('value');
                    this.push(null);
                };

                return reply(stream);
            };

            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.result).to.equal('value');
                done();
            });
        });

        it('leaves the response open when the same response source is set again', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.ext('onPostHandler', function (request, reply) {

                return reply(request.response.source);
            });

            var handler = function (request, reply) {

                var stream = new Stream.Readable();
                stream._read = function (size) {

                    this.push('value');
                    this.push(null);
                };

                return reply(stream);
            };

            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.result).to.equal('value');
                done();
            });
        });
    });

    describe('timeout', { parallel: false }, function () {

        it('returns server error message when server taking too long', function (done) {

            var timeoutHandler = function (request, reply) { };

            var server = new Hapi.Server();
            server.connection({ routes: { timeout: { server: 50 } } });
            server.route({ method: 'GET', path: '/timeout', config: { handler: timeoutHandler } });

            var timer = new Hoek.Bench();

            server.inject('/timeout', function (res) {

                expect(res.statusCode).to.equal(503);
                expect(timer.elapsed()).to.be.at.least(45);
                done();
            });
        });

        it('returns server error message when server timeout happens during request execution (and handler yields)', function (done) {

            var slowHandler = function (request, reply) {

                setTimeout(function () {

                    return reply('Slow');
                }, 30);
            };

            var server = new Hapi.Server();
            server.connection({ routes: { timeout: { server: 2 } } });
            server.route({ method: 'GET', path: '/', config: { handler: slowHandler } });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(503);
                done();
            });
        });

        it('returns server error message when server timeout is short and already occurs when request executes', function (done) {

            var server = new Hapi.Server();
            server.connection({ routes: { timeout: { server: 2 } } });
            server.route({ method: 'GET', path: '/', config: { handler: function () { } } });
            server.ext('onRequest', function (request, reply) {

                setTimeout(function () {

                    return reply.continue();
                }, 10);
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(503);
                done();
            });
        });

        it('handles server handler timeout with onPreResponse ext', function (done) {

            var handler = function (request, reply) {

                setTimeout(reply, 20);
            };

            var server = new Hapi.Server();
            server.connection({ routes: { timeout: { server: 10 } } });
            server.route({ method: 'GET', path: '/', config: { handler: handler } });
            server.ext('onPreResponse', function (request, reply) {

                return reply.continue();
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(503);
                done();
            });
        });

        it('does not return an error response when server is slow but faster than timeout', function (done) {

            var slowHandler = function (request, reply) {

                setTimeout(function () {

                    return reply('Slow');
                }, 30);
            };

            var server = new Hapi.Server();
            server.connection({ routes: { timeout: { server: 50 } } });
            server.route({ method: 'GET', path: '/slow', config: { handler: slowHandler } });

            var timer = new Hoek.Bench();
            server.inject('/slow', function (res) {

                expect(timer.elapsed()).to.be.at.least(20);
                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('does not return an error when server is responding when the timeout occurs', function (done) {

            var respondingHandler = function (request, reply) {

                var s = new Stream.PassThrough();
                reply(s);

                for (var i = 10000; i > 0; --i) {
                    s.write(i.toString());
                }

                setTimeout(function () {

                    s.emit('end');
                }, 40);
            };

            var timer = new Hoek.Bench();

            var server = new Hapi.Server();
            server.connection({ routes: { timeout: { server: 50 } } });
            server.route({ method: 'GET', path: '/responding', config: { handler: respondingHandler } });
            server.start(function () {

                var options = {
                    hostname: '127.0.0.1',
                    port: server.info.port,
                    path: '/responding',
                    method: 'GET'
                };

                var req = Http.request(options, function (res) {

                    expect(timer.elapsed()).to.be.at.least(60);
                    expect(res.statusCode).to.equal(200);
                    done();
                });

                req.write('\n');
            });
        });

        it('does not return an error response when server is slower than timeout but response has started', function (done) {

            var streamHandler = function (request, reply) {

                var TestStream = function () {

                    Stream.Readable.call(this);
                };

                Hoek.inherits(TestStream, Stream.Readable);

                TestStream.prototype._read = function (size) {

                    var self = this;

                    if (this.isDone) {
                        return;
                    }
                    this.isDone = true;

                    setTimeout(function () {

                        self.push('Hello');
                    }, 30);

                    setTimeout(function () {

                        self.push(null);
                    }, 60);
                };

                return reply(new TestStream());
            };

            var server = new Hapi.Server();
            server.connection({ routes: { timeout: { server: 50 } } });
            server.route({ method: 'GET', path: '/stream', config: { handler: streamHandler } });
            server.start(function () {

                var options = {
                    hostname: '127.0.0.1',
                    port: server.info.port,
                    path: '/stream',
                    method: 'GET'
                };

                var req = Http.request(options, function (res) {

                    expect(res.statusCode).to.equal(200);
                    done();
                });
                req.end();
            });
        });

        it('does not return an error response when server takes less than timeout to respond', function (done) {

            var fastHandler = function (request, reply) {

                return reply('Fast');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { timeout: { server: 50 } } });
            server.route({ method: 'GET', path: '/fast', config: { handler: fastHandler } });

            server.inject('/fast', function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('handles race condition between equal client and server timeouts', function (done) {

            var timeoutHandler = function (request, reply) { };

            var server = new Hapi.Server();
            server.connection({ routes: { timeout: { server: 50 }, payload: { timeout: 50 } } });
            server.route({ method: 'POST', path: '/timeout', config: { handler: timeoutHandler } });

            server.start(function () {

                var timer = new Hoek.Bench();
                var options = {
                    hostname: '127.0.0.1',
                    port: server.info.port,
                    path: '/timeout',
                    method: 'POST'
                };

                var req = Http.request(options, function (res) {

                    expect([503, 408]).to.contain(res.statusCode);
                    expect(timer.elapsed()).to.be.at.least(45);
                    done();
                });

                req.on('error', function (err) {

                });

                req.write('\n');
                setTimeout(function () {

                    req.end();
                }, 100);
            });
        });
    });
});
