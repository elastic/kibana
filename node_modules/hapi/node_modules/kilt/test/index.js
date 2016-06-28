// Load modules

var Events = require('events');
var Lab = require('lab');
var Kilt = require('..');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;


describe('Kilt', function () {

    it('combines multiple sources', function (done) {

        var source1 = new Events.EventEmitter();
        var source2 = new Events.EventEmitter();

        var kilt = new Kilt();
        kilt.addEmitter(source1);
        kilt.addEmitter(source2);

        var counter = 0;
        kilt.on('test', function (a, b, c) {

            expect(a).to.equal(1);
            expect(b).to.equal(2);
            expect(c).to.equal(3);

            if (++counter === 2) {
                done();
            }
        });

        source1.emit('test', 1, 2, 3);
        source2.emit('test', 1, 2, 3);
    });

    it('combines multiple sources in constructor', function (done) {

        var source1 = new Events.EventEmitter();
        var source2 = new Events.EventEmitter();

        var kilt = new Kilt([source1, source2]);

        var counter = 0;
        kilt.on('test', function (a, b, c) {

            expect(a).to.equal(1);
            expect(b).to.equal(2);
            expect(c).to.equal(3);

            if (++counter === 2) {
                done();
            }
        });

        source1.emit('test', 1, 2, 3);
        source2.emit('test', 1, 2, 3);
    });

    it('combines multiple sources in constructor in multiple arguments', function (done) {

        var source1 = new Events.EventEmitter();
        var source2 = new Events.EventEmitter();

        var kilt = new Kilt(source1, [source2]);

        var counter = 0;
        kilt.on('test', function (a, b, c) {

            expect(a).to.equal(1);
            expect(b).to.equal(2);
            expect(c).to.equal(3);

            if (++counter === 2) {
                done();
            }
        });

        source1.emit('test', 1, 2, 3);
        source2.emit('test', 1, 2, 3);
    });

    it('combines multiple sources in constructor and after', function (done) {

        var source1 = new Events.EventEmitter();
        var source2 = new Events.EventEmitter();

        var kilt = new Kilt(source1);
        kilt.addEmitter(source2);

        var counter = 0;
        kilt.on('test', function (a, b, c) {

            expect(a).to.equal(1);
            expect(b).to.equal(2);
            expect(c).to.equal(3);

            if (++counter === 2) {
                done();
            }
        });

        source1.emit('test', 1, 2, 3);
        source2.emit('test', 1, 2, 3);
    });

    it('combines multiple sources with own emit', function (done) {

        var source1 = new Events.EventEmitter();
        var source2 = new Events.EventEmitter();

        var kilt = new Kilt();
        kilt.addEmitter(source1);
        kilt.addEmitter(source2);

        var counter = 0;
        kilt.on('test', function (a, b, c) {

            expect(a).to.equal(1);
            expect(b).to.equal(2);
            expect(c).to.equal(3);

            if (++counter === 3) {
                done();
            }
        });

        source1.emit('test', 1, 2, 3);
        kilt.emit('test', 1, 2, 3);
        source2.emit('test', 1, 2, 3);
    });

    it('adds sources after listeners', function (done) {

        var source1 = new Events.EventEmitter();
        var source2 = new Events.EventEmitter();

        var kilt = new Kilt();

        var counter = 0;
        kilt.on('test', function (a, b, c) {

            expect(a).to.equal(1);
            expect(b).to.equal(2);
            expect(c).to.equal(3);

            if (++counter === 2) {
                done();
            }
        });

        kilt.addEmitter(source1);
        kilt.addEmitter(source2);

        source1.emit('test', 1, 2, 3);
        source2.emit('test', 1, 2, 3);
    });

    it('subscribed multiple times', function (done) {

        var source1 = new Events.EventEmitter();
        var source2 = new Events.EventEmitter();

        var kilt = new Kilt();

        var counter = 0;
        kilt.on('test', function () {

            ++counter;
        });

        kilt.on('test', function () {

            counter = counter * 4;
        });

        kilt.addEmitter(source1);
        kilt.addEmitter(source2);

        source1.emit('test');
        source2.emit('test');

        expect(counter).to.equal(20);
        done();
    });

    it('removes listener after once', function (done) {

        var source1 = new Events.EventEmitter();
        var source2 = new Events.EventEmitter();

        var kilt = new Kilt();
        kilt.addEmitter(source1);
        kilt.addEmitter(source2);

        var counter = 0;
        kilt.once('test', function () {

            ++counter;
        });

        expect(source1.listeners('test').length).to.equal(1);
        expect(source2.listeners('test').length).to.equal(1);
        expect(kilt.listeners('test').length).to.equal(1);

        source1.emit('test');

        expect(source1.listeners('test').length).to.equal(0);
        expect(source2.listeners('test').length).to.equal(0);
        expect(kilt.listeners('test').length).to.equal(0);

        source2.emit('test');

        expect(counter).to.equal(1);
        done();
    });

    it('removes listener', function (done) {

        var source1 = new Events.EventEmitter();
        var source2 = new Events.EventEmitter();

        var kilt = new Kilt();
        kilt.addEmitter(source1);
        kilt.addEmitter(source2);

        var counter = 0;
        var onTest = function () {

            ++counter;
        };

        kilt.on('test', onTest);
        kilt.removeListener('test', onTest);

        source1.emit('test');
        source2.emit('test');

        expect(counter).to.equal(0);
        done();
    });

    it('removes all listeners of given type', function (done) {

        var source1 = new Events.EventEmitter();
        var source2 = new Events.EventEmitter();

        var kilt = new Kilt();
        kilt.addEmitter(source1);
        kilt.addEmitter(source2);

        var counter = 0;
        var onTest = function () {

            ++counter;
        };

        kilt.on('test', onTest);

        expect(source1.listeners('test').length).to.equal(1);
        expect(source2.listeners('test').length).to.equal(1);
        expect(kilt.listeners('test').length).to.equal(1);

        kilt.removeAllListeners('test');

        expect(source1.listeners('test').length).to.equal(0);
        expect(source2.listeners('test').length).to.equal(0);
        expect(kilt.listeners('test').length).to.equal(0);

        source1.emit('test');
        source2.emit('test');

        expect(counter).to.equal(0);
        done();
    });

    it('removes all listeners', function (done) {

        var source1 = new Events.EventEmitter();
        var source2 = new Events.EventEmitter();

        var kilt = new Kilt();
        kilt.addEmitter(source1);
        kilt.addEmitter(source2);

        var counter = 0;
        var onTest = function () {

            ++counter;
        };

        kilt.on('test', onTest);

        expect(source1.listeners('test').length).to.equal(1);
        expect(source2.listeners('test').length).to.equal(1);
        expect(kilt.listeners('test').length).to.equal(1);

        kilt.removeAllListeners();

        expect(source1.listeners('test').length).to.equal(0);
        expect(source2.listeners('test').length).to.equal(0);
        expect(kilt.listeners('test').length).to.equal(0);

        source1.emit('test');
        source2.emit('test');

        expect(counter).to.equal(0);
        done();
    });

    it('removes all listeners of an unknown type', function (done) {

        var source1 = new Events.EventEmitter();
        var source2 = new Events.EventEmitter();

        var kilt = new Kilt();
        kilt.addEmitter(source1);
        kilt.addEmitter(source2);

        var counter = 0;
        var onTest = function () {

            ++counter;
        };

        kilt.on('test', onTest);
        kilt.removeAllListeners('test1');

        source1.emit('test');
        source2.emit('test');

        expect(counter).to.equal(2);
        done();
    });
});

