// Load modules

var Stream = require('stream');

var Code = require('code');
var Hoek = require('hoek');
var Lab = require('lab');

var Squeeze = require('..').Squeeze;
var SafeJson = require('..').SafeJson;

var lab = exports.lab = Lab.script();
var expect = Code.expect;
var describe = lab.describe;
var it = lab.it;

describe('Squeeze', function () {

    describe('subscription()', function () {

        it('converts *, null, undefined, 0, and false to an empty array, indicating all tags are acceptable', function (done) {

            var tags = ['*', null, undefined, false, 0];
            for (var i = 0, il = tags.length; i < il; ++i) {

                var result = Squeeze.subscription({ error: tags[i] });

                expect(result.error).to.deep.equal([]);
            }
            done();
        });

        it('converts a single tag to an array', function (done) {

            var result = Squeeze.subscription({ error: 'hapi' });
            expect(result.error).to.deep.equal(['hapi']);
            done();
        });
    });

    describe('filter()', function () {

        it('returns true if this reporter should report this event type', function (done) {

            var subscription = Squeeze.subscription({ log: '*' });
            expect(Squeeze.filter(subscription, { event: 'log', tags: ['request', 'server', 'error', 'hapi'] })).to.be.true();
            done();
        });

        it('returns false if this report should not report this event type', function (done) {

            var subscription = Squeeze.subscription({ log: '*' });
            expect(Squeeze.filter(subscription, { event: 'ops', tags: ['*'] })).to.be.false();
            done();
        });

        it('returns true if the event is matched, but there are not any tags with the data', function (done) {

            var subscription = Squeeze.subscription({ log: '*' });
            expect(Squeeze.filter(subscription, { event: 'log' })).to.be.true();
            done();
        });

        it('returns false if the subscriber has tags, but the matched event does not have any', function (done) {

            var subscription = Squeeze.subscription({ error: 'db' });
            expect(Squeeze.filter(subscription, { event: 'error', tags: [] })).to.be.false();
            done();
        });

        it('returns true if the event and tag match', function (done) {

            var subscription = Squeeze.subscription({ error: ['high', 'medium', 'log'] });
            expect(Squeeze.filter(subscription, { event: 'error', tags: ['hapi', 'high', 'db', 'severe'] })).to.be.true();
            done();
        });

        it('returns false by default', function (done) {

            var subscription = Squeeze.subscription({ request: 'hapi' });
            expect(Squeeze.filter(subscription, {event: 'request' })).to.be.false();
            done();
        });

        it('returns false if "tags" is not an array', function (done) {

            var subscription = Squeeze.subscription({ request: 'hapi' });
            expect(Squeeze.filter(subscription, {event: 'request', tags: 'hapi' })).to.be.false();
            done();
        });
    });

    it('allows construction with "new"', function (done) {

        var stream = new Squeeze({ request: '*' });
        expect(stream._good.subscription).to.have.length(1);
        done();
    });

    it('allows construction without "new"', function (done) {

        var stream = Squeeze({ request: '*', ops: '*' });
        expect(stream._good.subscription).to.have.length(2);
        done();
    });

    it('does not forward events if "filter()" is false', function (done) {

        var stream = Squeeze({ request: '*' });
        var result = [];

        stream.on('data', function (data) {

            result.push(data);
        });

        stream.on('end', function () {

            expect(result).to.deep.equal([{
                event: 'request',
                id: 1
            }]);
            done();
        });

        var read = new Stream.Readable({ objectMode: true });
        read._read = Hoek.ignore;

        read.pipe(stream);

        read.push({ event: 'request', id: 1});
        read.push({ event: 'ops', id: 2 });
        read.push(null);
    });

    it('remains open as long as the read stream does not end it', function (done) {

        var stream = Squeeze({ request: '*' });
        var result = [];

        stream.on('data', function (data) {

            result.push(data);
        });

        stream.on('end', function () {

            expect(result).to.deep.equal([{
                event: 'request',
                id: 1
            }]);
            done();
        });

        var read = new Stream.Readable({ objectMode: true });
        read._read = Hoek.ignore;

        read.pipe(stream);

        read.push({ event: 'request', id: 1});
        read.push({ event: 'request', id: 2 });

        setTimeout(function () {

            read.push({ event: 'request', id: 3});
            read.push({ event: 'request', id: 4});

            expect(result).to.deep.equal([
                { event: 'request', id: 1},
                { event: 'request', id: 2},
                { event: 'request', id: 3},
                { event: 'request', id: 4}
            ]);
            done();
        }, 500);
    });

    it('throws an error if "events" not a truthy object', function (done) {

        expect(function () {

            var stream = Squeeze('request');
        }).to.throw('events must be an object');
        expect(function () {

            var stream = Squeeze(1);
        }).to.throw('events must be an object');

        done();
    });

    it('allows empty event arguments', function (done) {

        var stream = Squeeze(null);

        expect(stream._good.subscription).to.deep.equal(Object.create(null));
        done();
    });
});

describe('SafeJson', function () {

    it('allows construction with "new"', function (done) {

        var stream = new SafeJson();
        expect(stream).to.exist();
        done();
    });

    it('allows construction without "new"', function (done) {

        var stream = SafeJson();
        expect(stream).to.exist();
        done();
    });

    it('safely handles circular references in incoming data', function (done) {

        var stream = SafeJson();
        var result = '';
        var read = new Stream.Readable({ objectMode: true });
        read._read = Hoek.ignore;

        var data = {
            x: 1
        };
        data.y = data;

        stream.on('data', function (data) {

            result += data;
        });

        stream.on('end', function () {

            expect(result).to.equal('{"x":1,"y":"[Circular ~]"}{"foo":"bar"}');
            done();
        });

        read.pipe(stream);

        read.push(data);
        read.push({ foo: 'bar' });
        read.push(null);
    });

    it('adds a seperator value when specified', function (done) {

        var stream = SafeJson({}, { separator: '#' });
        var result = '';
        var read = new Stream.Readable({ objectMode: true });
        read._read = Hoek.ignore;

        stream.on('data', function (data) {

            result += data;
        });

        stream.on('end', function () {

            expect(result).to.equal('{"foo":"bar"}#{"bar":"baz"}#');
            done();
        });

        read.pipe(stream);

        read.push({ foo: 'bar' });
        read.push({ bar: 'baz' });
        read.push(null);
    });
});
