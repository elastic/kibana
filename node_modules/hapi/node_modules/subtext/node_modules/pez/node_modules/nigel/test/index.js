// Load modules

var Lab = require('lab');
var Nigel = require('..');
var Vise = require('vise');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Lab.expect;


describe('compile()', function () {

    it('processes needle', function (done) {

        var needle = new Buffer('abcdefghijklmnopqrstuvwxyz');
        expect(Nigel.compile(needle)).to.deep.equal({
            value: needle,
            lastPos: 25,
            last: 122,
            length: 26,
            badCharShift: new Buffer([26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26])
        });

        done();
    });

    it('throws on empty needle', function (done) {

        expect(function () {

            Nigel.compile(new Buffer(''));
        }).to.throw('Missing needle');

        done();
    });

    it('throws on empty needle', function (done) {

        expect(function () {

            Nigel.compile();
        }).to.throw('Missing needle');

        done();
    });
});

describe('horspool()', function () {

    it('finds needle', function (done) {

        var haystack = new Buffer('abcdefghijklmnopqrstuvwxyz');
        var needle = new Buffer('mnopq');

        expect(Nigel.horspool(haystack, needle)).to.equal(12);
        done();
    });

    it('does not find needle', function (done) {

        var haystack = new Buffer('abcdefghijklmnopqrstuvwxyz');
        var needle = new Buffer('mnxpq');

        expect(Nigel.horspool(haystack, needle)).to.equal(-1);
        done();
    });

    it('does not find needle (tail match)', function (done) {

        var haystack = new Buffer('q2q2q2q2q');
        var needle = new Buffer('22q');

        expect(Nigel.horspool(haystack, needle)).to.equal(-1);
        done();
    });

    it('finds needle from position', function (done) {

        var haystack = new Buffer('abcdefghijklmnopqrstuvwxyz');
        var needle = new Buffer('mnopq');

        expect(Nigel.horspool(haystack, needle, 11)).to.equal(12);
        done();
    });

    it('does not find needle from position', function (done) {

        var haystack = new Buffer('abcdefghijklmnopqrstuvwxyz');
        var needle = new Buffer('mnopq');

        expect(Nigel.horspool(haystack, needle, 13)).to.equal(-1);
        done();
    });

    it('finds needle in vise haystack', function (done) {

        var haystack = new Vise([new Buffer('abcdefghijklmn'), new Buffer('opqrstuvwxyz')]);
        expect(Nigel.horspool(haystack, new Buffer('mnopq'))).to.equal(12);
        done();
    });

    it('finds needle in pushed vise haystack', function (done) {

        var haystack = new Vise();
        haystack.push(new Buffer('abcdefghijklmn'));
        haystack.push(new Buffer('opqrstuvwxyz'));
        expect(Nigel.horspool(haystack, new Buffer('mnopq'))).to.equal(12);
        done();
    });
});

describe('all()', function () {

    it('finds needle', function (done) {

        var haystack = new Buffer('abcdefghijklmnopqrstuvwxyz');
        var needle = new Buffer('mnopq');

        expect(Nigel.all(haystack, needle)).to.deep.equal([12]);
        done();
    });

    it('does not find needle', function (done) {

        var haystack = new Buffer('abcdefghijklmnopqrstuvwxyz');
        var needle = new Buffer('mno2pq');

        expect(Nigel.all(haystack, needle)).to.deep.equal([]);
        done();
    });

    it('finds multiple needles', function (done) {

        var haystack = new Buffer('abc123def123ghi123jkl123mno123pqr123stu123vwx123yz');
        var needle = new Buffer('123');

        expect(Nigel.all(haystack, needle)).to.deep.equal([3, 9, 15, 21, 27, 33, 39, 45]);
        done();
    });

    it('finds multiple needles from position', function (done) {

        var haystack = new Buffer('abc123def123ghi123jkl123mno123pqr123stu123vwx123yz');
        var needle = new Buffer('123');

        expect(Nigel.all(haystack, needle, 11)).to.deep.equal([15, 21, 27, 33, 39, 45]);
        done();
    });
});

describe('Stream', function () {

    it('parses a stream haystack', function (done) {

        var result = [];

        var stream = new Nigel.Stream(new Buffer('123'));
        stream.on('close', function () {

            expect(result).to.deep.equal(['abc', 1, 'de', 'fg', 1, 'hij1', 1, 'klm', 1, 'nop']);
            done();
        });

        stream.on('needle', function () {

            result.push(1);
        });

        stream.on('haystack', function (chunk) {

            result.push(chunk.toString());
        });

        stream.write('abc123de');
        stream.write('fg12');
        stream.write('3hij11');
        stream.write('23klm');
        stream.write('123');
        stream.write('nop');
        stream.end();
    });

    it('flushes data buffers when more recent one is bigger than needle', function (done) {

        var result = [];

        var stream = new Nigel.Stream(new Buffer('123'));
        stream.on('close', function () {

            expect(result).to.deep.equal(['abc', null, 'de', 'fghij', 'klmnop', 'q', null, 'r', 'stuv', 'wxy', 'zabc']);
            done();
        });

        stream.on('needle', function () {

            result.push(null);
        });

        stream.on('haystack', function (chunk, g) {

            expect(stream._haystack.length).to.be.lessThan(7);
            result.push(chunk.toString());
        });

        stream.write('abc123de');
        stream.write('fghij');
        stream.write('klmnop');
        stream.write('q123r');
        stream.write('stuv');
        stream.write('wxy');
        stream.write('zabc');
        stream.end();
    });

    it('parses a stream haystack (partial needle first)', function (done) {

        var result = [];

        var stream = new Nigel.Stream(new Buffer('123'));
        stream.on('close', function () {

            expect(result).to.deep.equal([1, 'abc', 1, 'de', 'fg', 1, 'hij1', 1, 'klm', 1, 'nop']);
            done();
        });

        stream.on('needle', function () {

            result.push(1);
        });

        stream.on('haystack', function (chunk) {

            result.push(chunk.toString());
        });

        stream.write('12');
        stream.write('3abc123de');
        stream.write('fg12');
        stream.write('3hij11');
        stream.write('23klm');
        stream.write('123');
        stream.write('nop');
        stream.end();
    });

    it('parses a stream haystack (partial needle last)', function (done) {

        var result = [];

        var stream = new Nigel.Stream(new Buffer('123'));
        stream.on('close', function () {

            expect(result).to.deep.equal([1, 'abc', 1, 'de', 'fg', 1, 'hij1', 1, 'klm', 1, 'nop', '1']);
            done();
        });

        stream.on('needle', function () {

            result.push(1);
        });

        stream.on('haystack', function (chunk) {

            result.push(chunk.toString());
        });

        stream.write('12');
        stream.write('3abc123de');
        stream.write('fg12');
        stream.write('3hij11');
        stream.write('23klm');
        stream.write('123');
        stream.write('nop1');
        stream.end();
    });

    describe('needle()', function () {

        it('changes needle mid stream', function (done) {

            var result = [];

            var stream = new Nigel.Stream(new Buffer('123'));
            stream.on('close', function () {

                expect(result).to.deep.equal([1, 'abc', 1, 'de', 'fg', '12', '3hi', 1, 'j11', '23klm', '123', 'no', 1, 'p1']);
                done();
            });

            stream.on('needle', function () {

                result.push(1);
            });

            stream.on('haystack', function (chunk) {

                result.push(chunk.toString());
            });

            stream.write('12');
            stream.write('3abc123de');
            stream.write('fg12');
            stream.needle(new Buffer('45'));
            stream.write('3hi45j11');
            stream.write('23klm');
            stream.write('123');
            stream.write('no45p1');
            stream.end();
        });

        it('changes needle mid stream (on haystack)', function (done) {

            var result = [];

            var stream = new Nigel.Stream(new Buffer('123'));
            stream.on('close', function () {

                expect(result).to.deep.equal([1, 'abc', 1, 'de', 'fg', /**/ '12', '3hi', 1, 'j11', '23klm', '123', 'no', 1, 'p1']);
                done();
            });

            stream.on('needle', function () {

                result.push(1);
            });

            stream.on('haystack', function (chunk) {

                result.push(chunk.toString());
                if (result.length === 5) {                  // After getting 'fg'
                    stream.needle(new Buffer('45'));
                }
            });

            stream.write('12');
            stream.write('3abc123de');
            stream.write('fg12');
            stream.write('3hi45j11');
            stream.write('23klm');
            stream.write('123');
            stream.write('no45p1');
            stream.end();
        });

        it('changes needle mid stream (on needle)', function (done) {

            var result = [];

            var stream = new Nigel.Stream(new Buffer('12'));
            stream.on('close', function () {

                expect(result).to.deep.equal(['a', 1, /**/ '3abc', 1, 'de', 'fg', 1, 'hi45j1', 1, 'klm', 1, 'no45p', '1']);
                done();
            });

            stream.on('needle', function () {

                result.push(1);
                if (result.length === 2) {                  // After first needle
                    stream.needle(new Buffer('123'));
                }
            });

            stream.on('haystack', function (chunk) {

                result.push(chunk.toString());
            });

            stream.write('a12');
            stream.write('3abc123de');
            stream.write('fg12');
            stream.write('3hi45j11');
            stream.write('23klm');
            stream.write('123');
            stream.write('no45p1');
            stream.end();
        });

        it('retains partial needle before needle', function (done) {

            var result = [];

            var stream = new Nigel.Stream(new Buffer('\r\n'));
            stream.on('close', function () {

                expect(result).to.deep.equal(['abc', 1, 'defg', 1, 1, 'hijk\r', 1, 'lmnop\r', 1]);
                done();
            });

            stream.on('needle', function () {

                result.push(1);
            });

            stream.on('haystack', function (chunk) {

                result.push(chunk.toString());
            });

            stream.write('abc\r\ndefg\r\n\r\nhijk\r\r\nlmnop\r\r\n');
            stream.end();
        });

        it('emits events in correct order when nesting streams', function (done) {

            var test = '1x2|3|4x|5|6|x7';
            var result = '';

            var x = new Nigel.Stream(new Buffer('x'));
            var l = new Nigel.Stream(new Buffer('|'));

            x.once('close', function () {

                l.end();
            });

            l.once('close', function () {

                expect(result).to.equal(test.replace(/\|/g, '[').replace(/x/g, '*'));
                done();
            });

            x.on('needle', function () {

                result += '*';
            });

            x.on('haystack', function (chunk) {

                l.write(chunk);
            });

            l.on('needle', function () {

                result += '[';
            });

            l.on('haystack', function (chunk) {

                result += chunk.toString();
            });

            x.write(test);
            x.end();
        });
    });

    describe('flush()', function () {

        it('emits events in correct order when nesting streams (partial needle)', function (done) {

            var test = '7vx7vx7vx';
            var result = '';

            var x = new Nigel.Stream(new Buffer('x'));
            var l = new Nigel.Stream(new Buffer('v|'));

            x.once('close', function () {

                l.end();
            });

            l.once('close', function () {

                expect(result).to.equal(test.replace(/v\|/g, '[').replace(/x/g, '*'));
                done();
            });

            x.on('needle', function () {

                l.flush();
                result += '*';
            });

            x.on('haystack', function (chunk) {

                l.write(chunk);
            });

            l.on('needle', function () {

                result += '[';
            });

            l.on('haystack', function (chunk) {

                result += chunk.toString();
            });

            x.write(test);
            x.end();
        });
    });
});