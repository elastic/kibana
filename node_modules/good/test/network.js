// Load modules

var Events = require('events');
var Http = require('http');
var Https = require('https');
var Stream = require('stream');
var Code = require('code');
var Hapi = require('hapi');
var Hoek = require('hoek');
var Items = require('items');
var Lab = require('lab');

var NetworkMonitor = require('../lib/network');



// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var expect = Code.expect;
var describe = lab.describe;
var it = lab.it;


describe('Network Monitor', function () {

    it('reports on network activity', function (done) {

        var server = new Hapi.Server();
        server.connection({ host: 'localhost' });
        server.connection({ host: 'localhost' });

        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                reply();
            }
        });

        var network = new NetworkMonitor.Monitor(server);
        var agent = new Http.Agent({ maxSockets: Infinity });
        var usedPorts = [];

        server.start(function () {

            server.connections.forEach(function (conn) {

                usedPorts.push(conn.info.port);

                for (var i = 0; i < 20; ++i) {
                    Http.get({
                        path: '/',
                        host: conn.info.host,
                        port: conn.info.port,
                        agent: agent
                    }, Hoek.ignore);
                }
            });

            setTimeout(function () {

                expect(network._requests).to.have.length(2);

                var port = usedPorts.shift();

                while (port) {

                    expect(network._requests[port]).to.exist();
                    expect(network._requests[port].total).to.equal(20);
                    expect(network._requests[port].statusCodes[200]).to.equal(20);
                    expect(network._responseTimes[port]).to.exist();
                    port = usedPorts.shift();
                }

                done();
            }, 500);
        });
    });

    it('resets stored statistics', function (done) {

        var server = new Hapi.Server();
        server.connection({ host: 'localhost' });

        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                reply();
            }
        });

        var network = new NetworkMonitor.Monitor(server);
        var agent = new Http.Agent({ maxSockets: Infinity });

        server.start(function () {

            for (var i = 0; i < 10; ++i) {
                Http.get({
                    path: '/',
                    host: server.info.host,
                    port: server.info.port,
                    agent: agent
                }, Hoek.ignore);
            }


            setTimeout(function () {

                var port = server.info.port;

                expect(network._requests[port]).to.exist();
                expect(network._requests[port].total).to.equal(10);
                expect(network._requests[port].statusCodes[200]).to.equal(10);

                expect(network._responseTimes[port]).to.exist();

                network.reset();

                expect(network._requests[port]).to.deep.equal({
                    total: 0,
                    disconnects: 0,
                    statusCodes: {}
                });

                expect(network._responseTimes[port]).to.deep.equal({
                    count: 0,
                    total: 0,
                    max: 0
                });

                done();
            }, 300);
        });
    });

    it('exposes stats via async calls', function (done) {

        var server = new Hapi.Server();
        server.connection({ host: 'localhost' });

        var network = new NetworkMonitor.Monitor(server);
        var httpAgent = new Http.Agent({ maxSockets: Infinity });
        var httpsAgent = new Https.Agent({ maxSockets: Infinity });

        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                Https.get({
                    hostname: 'www.google.com',
                    port: 433,
                    path: '/',
                    agent: httpsAgent
                });
            }
        });

        server.route({
            method: 'GET',
            path: '/foo',
            handler: function (request, reply) {

                setTimeout(function () {

                    reply().code(302);
                }, Math.floor(Math.random() * 10) + 1);
            }
        });

        server.start(function () {

            for (var i = 0; i < 10; ++i) {
                Http.get({
                    path: '/',
                    host: server.info.host,
                    port: server.info.port,
                    agent: httpAgent
                }, Hoek.ignore);

                Http.get({
                    path: '/foo',
                    host: server.info.host,
                    port: server.info.port,
                    agent: httpAgent
                }, Hoek.ignore);
            }


            setTimeout(function () {

                Items.parallel.execute({
                    requests: network.requests.bind(network),
                    concurrents: network.concurrents.bind(network),
                    response: network.responseTimes.bind(network),
                    sockets: network.sockets.bind(network, [httpAgent], [httpsAgent])
                }, function (err, results) {

                    var port = server.info.port;

                    expect(err).to.not.exist();
                    expect(results.requests[port]).to.exist();
                    expect(results.concurrents[port]).to.exist();

                    var requests = results.requests[port];

                    expect(requests).to.deep.equal({
                        total: 20,
                        disconnects: 0,
                        statusCodes: {
                            '302': 10
                        }
                    });


                    expect(results.sockets.http.total).to.be.at.least(10);
                    expect(results.sockets.https.total).to.be.at.least(10);

                    expect(results.response[port].avg).to.be.at.least(1);
                    expect(results.response[port].max).to.be.at.least(1);

                    done();
                });
            }, 300);
        });
    });

    it('tracks server disconnects', function (done) {

        var TestStream = function () {

            Stream.Readable.call(this);
        };

        Hoek.inherits(TestStream, Stream.Readable);

        TestStream.prototype._read = function () {

            var self = this;

            if (this.isDone) {
                return;
            }

            this.isDone = true;

            setTimeout(function () {

                self.push('Hello');
            }, 10);

            setTimeout(function () {

                self.push(null);
            }, 50);
        };

        var server = new Hapi.Server();
        server.connection({ host: 'localhost' });

        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                reply(new TestStream());
            }
        });

        var network = new NetworkMonitor.Monitor(server);

        server.start(function () {

            var options = {
                hostname: server.info.host,
                port: server.info.port,
                path: '/',
                method: 'POST'
            };

            var req = Http.request(options, function (res) {

                req.destroy();
            });

            req.end('{}');
        });

        setTimeout(function () {

            network.requests(function (err, result) {

                expect(err).to.not.exist();
                var requests = {};
                requests[server.info.port] = { total: 1, disconnects: 1, statusCodes: { '200': 1 } };

                expect(result).to.deep.equal(requests);
                server.stop(done);
            });
        }, 400);

    });

    it('error checks getConnections', function (done) {

        var ee = new Events.EventEmitter();
        ee.connections = [{
            listener: {
                getConnections: function (callback) {

                    callback(new Error('mock error'));
                }
            }
        }];
        ee.ext = Hoek.ignore;

        var network = new NetworkMonitor.Monitor(ee);

        network.concurrents(function (err) {

            expect(err.message).to.equal('mock error');
            done();
        });
    });

    it('does not throw if request.response is null', function (done) {

        var server = new Hapi.Server();
        server.connection({ host: 'localhost' });

        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                reply();
            }
        });

        // force response to be null to mimic client disconnect
        server.on('response', function (request) {

            request.response = null;
        });

        var network = new NetworkMonitor.Monitor(server);

        server.start(function () {

            Http.get({
                path: '/',
                host: server.info.host,
                port: server.info.port
            }, function () {

                expect(network._requests[server.info.port]).to.exist();
                expect(network._requests[server.info.port].total).to.equal(1);
                expect(network._requests[server.info.port].statusCodes).to.deep.equal({});
                done();
            });
        });
    });
});
