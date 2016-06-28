// Load modules

var Code = require('code');
var Hapi = require('hapi');
var Hoek = require('hoek');
var Http = require('http');
var Https = require('https');
var Lab = require('lab');
var Wreck = require('wreck');

// Done for testing because Wreck is a singleton and every test run ads one event to it
Wreck.setMaxListeners(0);

var GoodReporter = require('./helper');


// Declare internals

var internals = {
    agent: new Https.Agent({ maxSockets: 6 })
};


// Test shortcuts

var lab = exports.lab = Lab.script();
var expect = Code.expect;
var describe = lab.describe;
var it = lab.it;


describe('Plugin', function () {

    it('emits ops data', function (done) {

        var server = new Hapi.Server();
        var options = {
            opsInterval: 100,
            httpAgents: new Http.Agent(),
            httpsAgents: new Https.Agent()
        };
        var one = new GoodReporter({ ops: '*' });
        options.reporters = [one];

        var plugin = {
           register: require('..'),
           options: options
        };

        server.register(plugin, function (err) {

            expect(err).to.not.exist();

            server.plugins.good.monitor.once('ops', function (event) {

                expect(event.osload).to.exist();
                expect(one.messages).to.have.length(1);

                var message = one.messages[0];

                expect(message.event).to.equal('ops');
                expect(message.host).to.exist();

                done();
            });
        });
    });

    it('tracks used sockets', function (done) {

        var server = new Hapi.Server();

        server.connection({ host: 'localhost' });

        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                Https.get({
                    hostname: 'www.google.com',
                    port: 433,
                    path: '/',
                    agent: internals.agent
                });
            }
        });

        var options = {
            opsInterval: 1000,
            httpsAgents: internals.agent
        };
        var one = new GoodReporter({ ops: '*' });
        options.reporters = [one];

        var plugin = {
            register: require('..'),
            options: options
        };

        server.register(plugin, function (err) {

            expect(err).to.not.exist();

            server.plugins.good.monitor.once('ops', function (event) {

                expect(event.host).to.exist();
                expect(event.sockets).to.exist();
                expect(event.sockets.https.total).to.equal(6);

                done();
            });

            for (var i = 0; i < 10; ++i) {
                server.inject({ url: '/' });
            }
        });
    });

    it('wreck data emits', function (done) {

        var server = new Hapi.Server();
        var tlsOptions = {
            labels: ['https'],
            port: 0,
            key: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0UqyXDCqWDKpoNQQK/fdr0OkG4gW6DUafxdufH9GmkX/zoKz\ng/SFLrPipzSGINKWtyMvo7mPjXqqVgE10LDI3VFV8IR6fnART+AF8CW5HMBPGt/s\nfQW4W4puvBHkBxWSW1EvbecgNEIS9hTGvHXkFzm4xJ2e9DHp2xoVAjREC73B7JbF\nhc5ZGGchKw+CFmAiNysU0DmBgQcac0eg2pWoT+YGmTeQj6sRXO67n2xy/hA1DuN6\nA4WBK3wM3O4BnTG0dNbWUEbe7yAbV5gEyq57GhJIeYxRvveVDaX90LoAqM4cUH06\n6rciON0UbDHV2LP/JaH5jzBjUyCnKLLo5snlbwIDAQABAoIBAQDJm7YC3pJJUcxb\nc8x8PlHbUkJUjxzZ5MW4Zb71yLkfRYzsxrTcyQA+g+QzA4KtPY8XrZpnkgm51M8e\n+B16AcIMiBxMC6HgCF503i16LyyJiKrrDYfGy2rTK6AOJQHO3TXWJ3eT3BAGpxuS\n12K2Cq6EvQLCy79iJm7Ks+5G6EggMZPfCVdEhffRm2Epl4T7LpIAqWiUDcDfS05n\nNNfAGxxvALPn+D+kzcSF6hpmCVrFVTf9ouhvnr+0DpIIVPwSK/REAF3Ux5SQvFuL\njPmh3bGwfRtcC5d21QNrHdoBVSN2UBLmbHUpBUcOBI8FyivAWJhRfKnhTvXMFG8L\nwaXB51IZAoGBAP/E3uz6zCyN7l2j09wmbyNOi1AKvr1WSmuBJveITouwblnRSdvc\nsYm4YYE0Vb94AG4n7JIfZLKtTN0xvnCo8tYjrdwMJyGfEfMGCQQ9MpOBXAkVVZvP\ne2k4zHNNsfvSc38UNSt7K0HkVuH5BkRBQeskcsyMeu0qK4wQwdtiCoBDAoGBANF7\nFMppYxSW4ir7Jvkh0P8bP/Z7AtaSmkX7iMmUYT+gMFB5EKqFTQjNQgSJxS/uHVDE\nSC5co8WGHnRk7YH2Pp+Ty1fHfXNWyoOOzNEWvg6CFeMHW2o+/qZd4Z5Fep6qCLaa\nFvzWWC2S5YslEaaP8DQ74aAX4o+/TECrxi0z2lllAoGAdRB6qCSyRsI/k4Rkd6Lv\nw00z3lLMsoRIU6QtXaZ5rN335Awyrfr5F3vYxPZbOOOH7uM/GDJeOJmxUJxv+cia\nPQDflpPJZU4VPRJKFjKcb38JzO6C3Gm+po5kpXGuQQA19LgfDeO2DNaiHZOJFrx3\nm1R3Zr/1k491lwokcHETNVkCgYBPLjrZl6Q/8BhlLrG4kbOx+dbfj/euq5NsyHsX\n1uI7bo1Una5TBjfsD8nYdUr3pwWltcui2pl83Ak+7bdo3G8nWnIOJ/WfVzsNJzj7\n/6CvUzR6sBk5u739nJbfgFutBZBtlSkDQPHrqA7j3Ysibl3ZIJlULjMRKrnj6Ans\npCDwkQKBgQCM7gu3p7veYwCZaxqDMz5/GGFUB1My7sK0hcT7/oH61yw3O8pOekee\nuctI1R3NOudn1cs5TAy/aypgLDYTUGQTiBRILeMiZnOrvQQB9cEf7TFgDoRNCcDs\nV/ZWiegVB/WY7H0BkCekuq5bHwjgtJTpvHGqQ9YD7RhE8RSYOhdQ/Q==\n-----END RSA PRIVATE KEY-----\n',
            cert: '-----BEGIN CERTIFICATE-----\nMIIDBjCCAe4CCQDvLNml6smHlTANBgkqhkiG9w0BAQUFADBFMQswCQYDVQQGEwJV\nUzETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50ZXJuZXQgV2lkZ2l0\ncyBQdHkgTHRkMB4XDTE0MDEyNTIxMjIxOFoXDTE1MDEyNTIxMjIxOFowRTELMAkG\nA1UEBhMCVVMxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoMGEludGVybmV0\nIFdpZGdpdHMgUHR5IEx0ZDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB\nANFKslwwqlgyqaDUECv33a9DpBuIFug1Gn8Xbnx/RppF/86Cs4P0hS6z4qc0hiDS\nlrcjL6O5j416qlYBNdCwyN1RVfCEen5wEU/gBfAluRzATxrf7H0FuFuKbrwR5AcV\nkltRL23nIDRCEvYUxrx15Bc5uMSdnvQx6dsaFQI0RAu9weyWxYXOWRhnISsPghZg\nIjcrFNA5gYEHGnNHoNqVqE/mBpk3kI+rEVzuu59scv4QNQ7jegOFgSt8DNzuAZ0x\ntHTW1lBG3u8gG1eYBMquexoSSHmMUb73lQ2l/dC6AKjOHFB9Ouq3IjjdFGwx1diz\n/yWh+Y8wY1Mgpyiy6ObJ5W8CAwEAATANBgkqhkiG9w0BAQUFAAOCAQEAoSc6Skb4\ng1e0ZqPKXBV2qbx7hlqIyYpubCl1rDiEdVzqYYZEwmst36fJRRrVaFuAM/1DYAmT\nWMhU+yTfA+vCS4tql9b9zUhPw/IDHpBDWyR01spoZFBF/hE1MGNpCSXXsAbmCiVf\naxrIgR2DNketbDxkQx671KwF1+1JOMo9ffXp+OhuRo5NaGIxhTsZ+f/MA4y084Aj\nDI39av50sTRTWWShlN+J7PtdQVA5SZD97oYbeUeL7gI18kAJww9eUdmT0nEjcwKs\nxsQT1fyKbo7AlZBY4KSlUMuGnn0VnAsB9b+LxtXlDfnjyM8bVQx1uAfRo0DO8p/5\n3J5DTjAU55deBQ==\n-----END CERTIFICATE-----\n'
        };

        server.connection({ tls: tlsOptions });
        server.connection({ port: 0, labels: ['http'] });

        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                reply('ok');
            }
        });

        server.select('http').route({
            method: 'GET',
            path: '/http',
            handler: function (request, reply) {

                reply('ok');
            }
        });

        var emitted;
        var options = {
            httpAgents: new Http.Agent(),
            httpsAgents: new Https.Agent()
        };
        options.reporters = [new GoodReporter({
            wreck: '*'
        }, null, function (event) {

            if (!emitted) {
                expect(event.event).to.equal('wreck');
                expect(event.request.protocol).to.equal('https:');
                expect(event.request.host).to.exist();
                expect(event.request.path).to.equal('/');
                emitted = true;
            }
            else {
                expect(event.event).to.equal('wreck');
                expect(event.request.protocol).to.equal('http:');
                expect(event.request.host).to.exist();
                expect(event.request.path).to.equal('/http');
                done();
            }
        })];

        var plugin = {
            register: require('..'),
            options: options
        };

        server.register(plugin, function (err) {

            expect(err).to.not.exist();

            server.start(function () {

                Wreck.get('https://127.0.0.1:' + server.connections[0].info.port + '/', { rejectUnauthorized: false }, function () {

                    Wreck.get('http://127.0.0.1:' + server.connections[1].info.port + '/http', Hoek.ignore);
                });
            });
        });
    });
});
