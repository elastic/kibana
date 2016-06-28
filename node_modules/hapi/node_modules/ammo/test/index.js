// Load modules

var Stream = require('stream');
var Ammo = require('..');
var Code = require('code');
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


describe('header()', function () {

    it('parses header (start)', function (done) {

        expect(Ammo.header('bytes=0-4', 10)).to.deep.equal([{ from: 0, to: 4 }]);
        done();
    });

    it('parses header (middle)', function (done) {

        expect(Ammo.header('bytes=1-5', 10)).to.deep.equal([{ from: 1, to: 5 }]);
        done();
    });

    it('parses header (-to)', function (done) {

        expect(Ammo.header('bytes=-5', 10)).to.deep.equal([{ from: 5, to: 9 }]);
        done();
    });

    it('parses header (from-)', function (done) {

        expect(Ammo.header('bytes=5-', 45000)).to.deep.equal([{ from: 5, to: 44999 }]);
        done();
    });

    it('parses header (beyond end)', function (done) {

        expect(Ammo.header('bytes=10-20', 15)).to.deep.equal([{ from: 10, to: 14 }]);
        done();
    });

    it('parses header (wrong unit)', function (done) {

        expect(Ammo.header('horses=1-5', 10)).to.equal(null);
        done();
    });

    it('parses header (flipped)', function (done) {

        expect(Ammo.header('bytes=5-1', 10)).to.equal(null);
        done();
    });

    it('parses header (missing =)', function (done) {

        expect(Ammo.header('bytes 1-5', 10)).to.equal(null);
        done();
    });

    it('parses header (missing to and from)', function (done) {

        expect(Ammo.header('bytes=-', 10)).to.equal(null);
        done();
    });

    it('parses header (multiple ranges)', function (done) {

        expect(Ammo.header('bytes=1-5,7-10', 10)).to.deep.equal([{ from: 1, to: 5 }, { from: 7, to: 9 }]);
        done();
    });

    it('parses header (overlapping ranges)', function (done) {

        expect(Ammo.header('bytes=1-5,5-10', 10)).to.deep.equal([{ from: 1, to: 9 }]);
        done();
    });
});

describe('Stream', function () {

    it('returns a subset of a stream', function (done) {

        var random = new Buffer(5000);
        var source = Wreck.toReadableStream(random);
        var range = Ammo.header('bytes=1000-4000', 5000);
        var stream = new Ammo.Stream(range[0]);

        Wreck.read(source.pipe(stream), {}, function (err, buffer) {

            expect(buffer.toString()).to.equal(random.slice(1000, 4001).toString());
            done();
        });
    });

    it('processes multiple chunks', function (done) {

        var TestStream = function () {

            Stream.Readable.call(this);
            this._count = -1;
        };

        Hoek.inherits(TestStream, Stream.Readable);

        TestStream.prototype._read = function (size) {

            this._count++;

            if (this._count > 10) {
                return;
            }

            if (this._count === 10) {
                this.push(null);
                return;
            }

            this.push(this._count.toString());
        };

        var range = Ammo.header('bytes=2-4', 10);
        var stream = new Ammo.Stream(range[0]);

        var source = new TestStream();
        Wreck.read(source.pipe(stream), {}, function (err, buffer) {

            expect(buffer.toString()).to.equal('234');
            done();
        });
    });
});
