// Load modules

var Code = require('code');
var Heavy = require('..');
var Lab = require('lab');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('Heavy', { parallel: false }, function () {

    it('requires load interval when maxEventLoopDelay is set', function (done) {

        var heavy = new Heavy({ sampleInterval: 0 });
        expect(function () {

            heavy.policy({ maxEventLoopDelay: 10, maxHeapUsedBytes: 0, maxRssBytes: 0 });
        }).to.throw('Load sample interval must be set to enable load limits');
        done();
    });

    it('requires load interval when maxHeapUsedBytes is set', function (done) {

        var heavy = new Heavy({ sampleInterval: 0 });
        expect(function () {

            heavy.policy({ maxEventLoopDelay: 0, maxHeapUsedBytes: 10, maxRssBytes: 0 });
        }).to.throw('Load sample interval must be set to enable load limits');
        done();
    });

    it('requires load interval when maxRssBytes is set', function (done) {

        var heavy = new Heavy({ sampleInterval: 0 });
        expect(function () {

            heavy.policy({ maxEventLoopDelay: 0, maxHeapUsedBytes: 0, maxRssBytes: 10 });
        }).to.throw('Load sample interval must be set to enable load limits');
        done();
    });

    var sleep = function (msec) {

        var start = Date.now();
        while (Date.now() - start < msec) {}
    };

    it('measures load', function (done) {

        var heavy = new Heavy({ sampleInterval: 4 });
        heavy.start();

        expect(heavy.load.eventLoopDelay).to.equal(0);
        sleep(5);
        setImmediate(function () {

            sleep(5);
            expect(heavy.load.eventLoopDelay).to.be.above(0);

            setImmediate(function () {

                sleep(5);

                expect(heavy.load.eventLoopDelay).to.be.above(0);
                expect(heavy.load.heapUsed).to.be.above(1024 * 1024);
                expect(heavy.load.rss).to.be.above(1024 * 1024);
                heavy.stop();
                done();
            });
        });
    });

    it('throws when process not started', function (done) {

        var heavy = new Heavy({ sampleInterval: 5 });
        var policy = heavy.policy({ maxRssBytes: 1 });

        expect(function () {

            policy.check();
        }).to.throw('Cannot check load when sampler is not started');
        done();
    });

    it('fails check due to high rss load', function (done) {

        var heavy = new Heavy({ sampleInterval: 5 });
        var policy = heavy.policy({ maxRssBytes: 1 });

        heavy.start();
        expect(policy.check()).to.equal(null);

        setTimeout(function () {

            expect(policy.check().message).to.equal('Server under heavy load (rss)');
            expect(heavy.load.rss).to.be.above(10000);
            heavy.stop();
            done();
        }, 10);
    });

    it('fails check due to high heap load', function (done) {

        var heavy = new Heavy({ sampleInterval: 5 });
        var policy = heavy.policy({ maxHeapUsedBytes: 1 });

        heavy.start();
        expect(policy.check()).to.equal(null);

        setTimeout(function () {

            expect(policy.check().message).to.equal('Server under heavy load (heap)');
            expect(heavy.load.heapUsed).to.be.above(0);
            heavy.stop();
            done();
        }, 10);
    });

    it('fails check due to high event loop delay load', function (done) {

        var heavy = new Heavy({ sampleInterval: 1 });
        var policy = heavy.policy({ maxEventLoopDelay: 5 });

        heavy.start();

        expect(policy.check()).to.equal(null);
        expect(heavy.load.eventLoopDelay).to.equal(0);
        setImmediate(function () {

            sleep(10);

            setImmediate(function () {

                expect(policy.check().message).to.equal('Server under heavy load (event loop)');
                expect(heavy.load.eventLoopDelay).to.be.above(0);
                heavy.stop();
                done();
            });
        });
    });

    it('fails check due to high event loop delay load (delayed measure)', function (done) {

        var heavy = new Heavy({ sampleInterval: 1 });
        var policy = heavy.policy({ maxEventLoopDelay: 5 });

        heavy.start();

        expect(policy.check()).to.equal(null);
        expect(heavy.load.eventLoopDelay).to.equal(0);
        sleep(10);

        expect(policy.check().message).to.equal('Server under heavy load (event loop)');
        expect(heavy.load.eventLoopDelay).to.be.above(0);
        heavy.stop();
        done();
    });

    it('disabled by default', function (done) {

        var heavy = new Heavy();
        var policy = heavy.policy();

        heavy.start();
        setImmediate(function () {

            expect(heavy.load.rss).to.equal(0);
            expect(policy.check()).to.equal(null);
            heavy.stop();
            done();
        });
    });
});
