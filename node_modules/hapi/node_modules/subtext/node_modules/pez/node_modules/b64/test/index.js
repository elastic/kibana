// Load modules

var Crypto = require('crypto');
var Stream = require('stream');
var B64 = require('..');
var Hoek = require('hoek');
var Lab = require('lab');
var Wreck = require('wreck');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Lab.expect;


it('pipes buffer through encoder and decoder', function (done) {

    var buffer = Crypto.randomBytes(1024);
    internals.test(buffer, function (err, payload) {

        expect(err).to.not.exist;
        expect(payload).to.equal(buffer.toString());
        done();
    });
});


describe('decode()', function () {

    it('decodes a short buffer (1)', function (done) {

        var value = '0';
        var encoded = B64.encode(new Buffer(value));
        expect(B64.decode(encoded).toString()).to.equal(value);
        done();
    });

    it('decodes an incomplete buffer', function (done) {

        var value = '';
        var encoded = new Buffer('A');
        expect(B64.decode(encoded).toString()).to.equal(value);
        done();
    });

    it('decodes an whitespace buffer', function (done) {

        var value = '';
        var encoded = new Buffer('     ');
        expect(B64.decode(encoded).toString()).to.equal(value);
        done();
    });

    it('decodes a buffer with whitespace', function (done) {

        var value = '0123456789';
        var encoded = new Buffer('M  D\nEy\tMz\r\nQ1Nj\rc4\r\nO Q ==');
        expect(B64.decode(encoded).toString()).to.equal(value);
        done();
    });

    it('decodes a buffer with 4th invalid character', function (done) {

        var value = '01';
        var encoded = new Buffer('MDE$');
        expect(B64.decode(encoded).toString()).to.equal(value);
        done();
    });
});


describe('Encoder', function () {

    it('process remainder', function (done) {

        var buffer = [Crypto.randomBytes(5), Crypto.randomBytes(5), Crypto.randomBytes(5), Crypto.randomBytes(5)];
        internals.test(buffer, function (err, payload) {

            expect(err).to.not.exist;
            expect(payload).to.equal(Buffer.concat(buffer).toString());
            done();
        });
    });

    it('flushes remainder', function (done) {

        var buffer = [Crypto.randomBytes(5), Crypto.randomBytes(5), Crypto.randomBytes(5), Crypto.randomBytes(1)];
        internals.test(buffer, function (err, payload) {

            expect(err).to.not.exist;
            expect(payload).to.equal(Buffer.concat(buffer).toString());
            done();
        });
    });

    it('skips empty remainder', function (done) {

        var buffer = [Crypto.randomBytes(5), Crypto.randomBytes(5), Crypto.randomBytes(5), Crypto.randomBytes(3)];
        internals.test(buffer, function (err, payload) {

            expect(err).to.not.exist;
            expect(payload).to.equal(Buffer.concat(buffer).toString());
            done();
        });
    });
});


describe('Decoder', function () {

    it('process remainder', function (done) {

        var value = Crypto.randomBytes(100);
        var encoded = B64.encode(value);

        var stream = new internals.Payload([encoded.slice(0, 3), encoded.slice(3, 9), encoded.slice(9)]);
        var source = stream.pipe(new B64.Decoder());

        Wreck.read(source, {}, function (err, payload) {

            expect(err).to.not.exist;
            expect(payload.toString()).to.equal(value.toString());
            done();
        });
    });

    it('flushes remainder', function (done) {

        var value = '0123456789';
        var encoded = B64.encode(new Buffer(value));         // MDEyMzQ1Njc4OQ==

        var stream = new internals.Payload([encoded.slice(0, 14)]);
        var source = stream.pipe(new B64.Decoder());

        Wreck.read(source, {}, function (err, payload) {

            expect(err).to.not.exist;
            expect(payload.toString()).to.equal(value.toString());
            done();
        });
    });
});


internals.Payload = function (payload) {

    Stream.Readable.call(this);

    this._data = [].concat(payload);
    this._position = 0;
};

Hoek.inherits(internals.Payload, Stream.Readable);


internals.Payload.prototype._read = function (size) {

    var chunk = this._data[this._position++];
    if (chunk) {
        this.push(chunk);
    }
    else {
        this.push(null);
    }
};


internals.test = function (buffer, callback) {

    var stream = new internals.Payload(buffer);
    var source = stream.pipe(new B64.Encoder()).pipe(new B64.Decoder());

    Wreck.read(source, {}, function (err, payload) {

        callback(err, payload ? payload.toString() : null);
    });
};
