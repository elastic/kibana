// Load modules

var Lab = require('lab');
var Vise = require('..');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Lab.expect;


describe('Vise', function () {

    var validate = function (vise, content) {

        expect(vise.length).to.equal(content.length);

        expect(vise.at(content.length)).to.equal(undefined);
        expect(vise.at(content.length + 1)).to.equal(undefined);
        expect(vise.at(content.length + 100)).to.equal(undefined);
        expect(vise.at(-1)).to.equal(undefined);

        for (var i = 0, il = content.length; i < il; ++i) {
            expect(vise.at(i)).to.equal(content.charCodeAt(i));
        }

        for (i = content.length - 1; i >= 0; --i) {
            expect(vise.at(i)).to.equal(content.charCodeAt(i));
        }
    };

    it('combines buffers', function (done) {

        var data = [new Buffer('abcde'), new Buffer('fgh'), new Buffer('ijk')];
        var vise = new Vise(data);
        validate(vise, 'abcdefghijk');
        done();
    });

    it('combines single buffer', function (done) {

        var data = new Buffer('abcde');
        var vise = new Vise(data);
        expect(vise.length).to.equal(5);
        validate(vise, 'abcde');
        done();
    });

    it('allows empty input', function (done) {

        var vise = new Vise();
        expect(vise.length).to.equal(0);
        expect(vise.at(0)).to.equal(undefined);
        done();
    });

    it('throws on invalid input', function (done) {

        expect(function () {

            new Vise(123);
        }).to.throw('Chunk must be a buffer');

        done();
    });

    describe('length', function () {

        it('reflects total legnth', function (done) {

            var vise = new Vise([new Buffer('abcdefghijklmn'), new Buffer('opqrstuvwxyz')]);
            expect(vise.length).to.equal(26);
            done();
        });
    });

    describe('push()', function () {

        it('adds a string', function (done) {

            var data = [new Buffer('abcde'), new Buffer('fgh')];
            var vise = new Vise(data);
            validate(vise, 'abcdefgh');

            vise.push(new Buffer('ijk'));
            validate(vise, 'abcdefghijk');
            done();
        });

        it('adds to empty array', function (done) {

            var vise = new Vise();
            expect(vise.length).to.equal(0);
            expect(vise.at(0)).to.equal(undefined);
            vise.push(new Buffer('abcde'));
            validate(vise, 'abcde');
            done();
        });
    });

    describe('shift()', function (done) {

        it('removes chunks', function (done) {

            var data = [new Buffer('abcde'), new Buffer('fgh'), new Buffer('ijk')];
            var vise = new Vise(data);
            validate(vise, 'abcdefghijk');

            expect(vise.shift(2)).to.deep.equal([new Buffer('ab')]);
            validate(vise, 'cdefghijk');

            expect(vise.shift(2)).to.deep.equal([new Buffer('cd')]);
            validate(vise, 'efghijk');

            expect(vise.shift(0)).to.deep.equal([]);
            validate(vise, 'efghijk');

            expect(vise.shift(1)).to.deep.equal([new Buffer('e')]);
            validate(vise, 'fghijk');

            expect(vise.shift(4)).to.deep.equal([new Buffer('fgh'), new Buffer('i')]);
            validate(vise, 'jk');

            expect(vise.shift(4)).to.deep.equal([new Buffer('jk')]);
            validate(vise, '');

            done();
        });

        it('keeps track of chunks offset', function (done) {

            var vise = new Vise();

            vise.push(new Buffer('acb123de'));
            vise.shift(3);
            vise.shift(3);
            vise.push(new Buffer('fg12'));
            vise.push(new Buffer('3hij1'));

            validate(vise, 'defg123hij1');
            done();
        });

        it('removes multiple chunks', function (done) {

            var data = [new Buffer('abcde'), new Buffer('fgh'), new Buffer('ijk')];
            var vise = new Vise(data);
            validate(vise, 'abcdefghijk');

            vise.shift(10);
            validate(vise, 'k');

            done();
        });
    });

    describe('chunks()', function (done) {

        it('returns remaining chunks', function (done) {

            var data = [new Buffer('abcde'), new Buffer('fgh'), new Buffer('ijk')];
            var vise = new Vise(data);
            expect(vise.chunks()).to.deep.equal(data);

            vise.shift(2);
            expect(vise.chunks()).to.deep.equal([new Buffer('cde'), new Buffer('fgh'), new Buffer('ijk')]);

            vise.shift(2);
            expect(vise.chunks()).to.deep.equal([new Buffer('e'), new Buffer('fgh'), new Buffer('ijk')]);

            vise.shift(0);
            expect(vise.chunks()).to.deep.equal([new Buffer('e'), new Buffer('fgh'), new Buffer('ijk')]);

            vise.shift(1);
            expect(vise.chunks()).to.deep.equal([new Buffer('fgh'), new Buffer('ijk')]);

            vise.shift(4);
            expect(vise.chunks()).to.deep.equal([new Buffer('jk')]);

            vise.shift(4);
            expect(vise.chunks()).to.deep.equal([]);

            done();
        });
    });

    describe('startsWith()', function () {

        it('compares single chunk (smaller)', function (done) {

            var vise = new Vise(new Buffer('abcdefghijkl'));
            expect(vise.startsWith(new Buffer('abcd'))).to.equal(true);
            done();
        });

        it('compares single chunk (subset)', function (done) {

            var vise = new Vise(new Buffer('abcdefghijkl'));
            expect(vise.startsWith(new Buffer('abce'), 0, 3)).to.equal(true);
            done();
        });

        it('compares single chunk (different)', function (done) {

            var vise = new Vise(new Buffer('abcdefghijkl'));
            expect(vise.startsWith(new Buffer('asd'))).to.equal(false);
            done();
        });

        it('compares single chunk (offset)', function (done) {

            var vise = new Vise(new Buffer('abcdefghijkl'));
            expect(vise.startsWith(new Buffer('bcd'), 1)).to.equal(true);
            done();
        });

        it('compares single chunk (same)', function (done) {

            var vise = new Vise(new Buffer('abcdefghijkl'));
            expect(vise.startsWith(new Buffer('abcdefghijkl'))).to.equal(true);
            done();
        });

        it('compares single chunk (bigger)', function (done) {

            var vise = new Vise(new Buffer('abcdefghijkl'));
            expect(vise.startsWith(new Buffer('abcdefghijklx'))).to.equal(false);
            done();
        });

        it('compares multiple chunks', function (done) {

            var vise = new Vise([new Buffer('a'), new Buffer('b'), new Buffer('cdefghijkl')]);
            expect(vise.startsWith(new Buffer('abcd'))).to.equal(true);
            done();
        });

        it('compares multiple chunks (mismatch)', function (done) {

            var vise = new Vise([new Buffer('a'), new Buffer('b'), new Buffer('cdefghijkl')]);
            expect(vise.startsWith(new Buffer('acd'))).to.equal(false);
            done();
        });

        it('compares with invalid offset', function (done) {

            var vise = new Vise(new Buffer('abcdefghijkl'));
            expect(vise.startsWith(new Buffer('bcd'), -1)).to.equal(false);
            done();
        });
    });
});
