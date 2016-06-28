// Load modules

var Events = require('events');
var Stream = require('stream');
var Util = require('util');
var Code = require('code');
var Lab = require('lab');
var Peekaboo = require('..');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('Peek', function () {

    it('taps into pass-through stream', function (done) {

        // Source

        var Source = function (values) {

            this.data = values;
            this.pos = 0;

            Stream.Readable.call(this);
        };

        Util.inherits(Source, Stream.Readable);

        Source.prototype._read = function (/* size */) {

            if (this.pos === this.data.length) {
                this.push(null);
                return;
            }

            this.push(this.data[this.pos++]);
        };

        // Target

        var Target = function () {

            this.data = [];

            Stream.Writable.call(this);
        };

        Util.inherits(Target, Stream.Writable);

        Target.prototype._write = function (chunk, encoding, callback) {

            this.data.push(chunk.toString());
            return callback();
        };

        // Peek

        var emitter = new Events.EventEmitter();
        var peek = new Peekaboo(emitter);

        var chunks = ['abcd', 'efgh', 'ijkl', 'mnop', 'qrst', 'uvwx'];
        var source = new Source(chunks);
        var target = new Target();

        var seen = [];
        emitter.on('peek', function (chunk, encoding) {

            seen.push(chunk.toString());
        });

        emitter.once('finish', function () {

            expect(seen).to.deep.equal(chunks);
            expect(target.data).to.deep.equal(chunks);
            done();
        });

        source.pipe(peek).pipe(target);
    });
});
