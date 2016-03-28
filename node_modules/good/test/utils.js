// Load modules

var Code = require('code');
var Lab = require('lab');
var Utils = require('../lib/utils');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var expect = Code.expect;
var describe = lab.describe;
var it = lab.it;


describe('utils', function () {

    describe('makeContinuation()', function () {

        it('successfully creates a continuation function', function (done) {

            var method = Utils.makeContinuation(function () {

                return true;
            });

            method(function (err, value) {

                expect(err).to.not.exist();
                expect(value).to.be.true();
                done();
            });
        });
    });

    describe('GreatWreck()', function () {

        it('handles a null request and response', function (done) {

            var greatWreck = new Utils.GreatWreck();
            expect(greatWreck.request).to.exist();
            expect(greatWreck.response).to.exist();
            done();
        });

        it('reports on errors', function (done) {

            var error = new Error('my error');
            var greatWreck = new Utils.GreatWreck(error);

            expect(greatWreck.error.message).to.equal('my error');
            done();
        });

        it('contains the current pid', function (done) {

            var greatWreck = new Utils.GreatWreck();

            expect(greatWreck.pid).to.equal(process.pid);
            done();
        });
    });

    describe('GreatResponse()', function () {

        var generateGreatResponse = function (requestPayload, responsePayload, nullResponse) {

            var filterRules = {
                password: 'censor'
            };

            var options = {
                requestHeaders: true,
                requestPayload: true,
                responsePayload: true
            };

            var request = {
                id: '1429974169154:localhost:10578:i8x5ousn:10000',
                raw: {
                    req: {
                        headers: {
                            'user-agent': 'Paw/2.2.1 (Macintosh; OS X/10.10.3) GCDHTTPRequest'
                        }
                    },
                    res: {
                        statusCode: 200
                    }
                },
                info: {
                    received: 1429974169154,
                    remoteAddress: '127.0.0.1'
                },
                method: 'POST',
                path: '/',
                query: {},
                responseTime: 123,
                connection: {
                    settings: {
                        labels: []
                    },
                    info: {
                        uri: 'http://localhost:3000'
                    }
                },
                payload: requestPayload,
                response: nullResponse ? null : {
                    source: responsePayload
                },
                getLog: function () {

                    return {};
                }
            };
            return new Utils.GreatResponse(request, options, filterRules);
        };

        it('handles empty request payloads', function (done) {

            var sampleResponsePayload = { message: 'test' };
            generateGreatResponse(null, sampleResponsePayload);
            generateGreatResponse({}, sampleResponsePayload);
            generateGreatResponse(undefined, sampleResponsePayload);
            generateGreatResponse('string payload', sampleResponsePayload);
            generateGreatResponse('', sampleResponsePayload);
            done();
        });

        it('handles empty response payloads', function (done) {

            var sampleRequestPayload = { message: 'test' };
            generateGreatResponse(sampleRequestPayload, null);
            generateGreatResponse(sampleRequestPayload, {});
            generateGreatResponse(sampleRequestPayload, undefined);
            generateGreatResponse(sampleRequestPayload, 'string payload');
            generateGreatResponse(sampleRequestPayload, '');
            generateGreatResponse(sampleRequestPayload, null, true);
            done();
        });

        it('handles response payloads with a toString() function', function (done) {

            var samplePayload = {
                message: 'test',
                toString: function () {

                }
            };

            generateGreatResponse(samplePayload, '');
            generateGreatResponse('', samplePayload);
            done();
        });
    });
});
