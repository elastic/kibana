
// Load modules

var Code = require('code');
var Cryptiles = require('cryptiles');
var Hoek = require('hoek');
var Iron = require('iron');
var Lab = require('lab');
var Statehood = require('../');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('Definitions', function () {

    describe('add()', function () {

        it('throws on missing name', function (done) {

            var definitions = new Statehood.Definitions();
            expect(function () {

                definitions.add();
            }).to.throw('Invalid name');
            done();
        });

        it('uses defaults', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('test');
            expect(definitions.cookies.test).to.deep.equal({
                strictHeader: true,
                ignoreErrors: false,
                isSecure: false,
                isHttpOnly: false,
                path: null,
                domain: null,
                ttl: null,
                encoding: 'none'
            });
            done();
        });

        it('records name', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('test');
            expect(definitions.names).to.deep.equal(['test']);
            done();
        });

        it('adds definition with null value', function (done) {

            var definitions = new Statehood.Definitions({ path: '/' });

            definitions.add('base');
            expect(definitions.cookies.base.path).to.equal('/');

            definitions.add('test', { path: null });
            expect(definitions.cookies.test.path).to.equal(null);

            done();
        });
    });

    describe('parse()', function () {

        it('parses cookie', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('a=b', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: 'b' });
                done();
            });
        });

        it('parses cookie (loose)', function (done) {

            var definitions = new Statehood.Definitions({ strictHeader: false });
            definitions.parse('a="1; b="2"; c=3; d[1]=4', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: '"1', b: '2', c: '3', 'd[1]': '4' });
                done();
            });
        });

        it('parses cookie (empty)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('a=', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: '' });
                done();
            });
        });

        it('parses cookie (quoted empty)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('a=""', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: '' });
                done();
            });
        });

        it('parses cookie (semicolon single)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('a=;', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: '' });
                done();
            });
        });

        it('parses cookie (number)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('a=23', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: '23' });
                done();
            });
        });

        it('parses cookie (array)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('a=1; a=2', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: ['1', '2'] });
                done();
            });
        });

        it('parses cookie (mixed style array)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('a=1; b="2"; c=3', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: '1', b: '2', c: '3' });
                done();
            });
        });

        it('parses cookie (mixed style array quoted first)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('a="1"; b="2"; c=3', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: '1', b: '2', c: '3' });
                done();
            });
        });

        it('parses cookie (white space)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('A    = b;   b  =   c', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ A: 'b', b: 'c' });
                done();
            });
        });

        it('parses cookie (raw form)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('a="b=123456789&c=something"', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: 'b=123456789&c=something' });
                done();
            });
        });

        it('parses cookie (raw percent)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('a=%1;b=x', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: '%1', b: 'x' });
                done();
            });
        });

        it('parses cookie (raw encoded)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('z=%20%22%2c%3b%2f', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ z: '%20%22%2c%3b%2f' });
                done();
            });
        });

        it('parses cookie (form single)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('a', { encoding: 'form' });
            definitions.parse('a="b=%p123456789"', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: { b: '%p123456789' } });
                done();
            });
        });

        it('parses cookie (form multiple)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('a', { encoding: 'form' });
            definitions.parse('a="b=123456789&c=something%20else"', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: { b: '123456789', c: 'something else' } });
                done();
            });
        });

        it('parses cookie (base64 array 2)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('a', { encoding: 'base64' });
            definitions.parse('a=dGVzdA; a=dGVzdA', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: ['test', 'test'] });
                done();
            });
        });

        it('parses cookie (base64 array 3)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('a', { encoding: 'base64' });
            definitions.parse('a=dGVzdA; a=dGVzdA; a=dGVzdA', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: ['test', 'test', 'test'] });
                done();
            });
        });

        it('parses cookie (base64 padding)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('key', { encoding: 'base64' });
            definitions.parse('key=dGVzdA==', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ key: 'test' });
                done();
            });
        });

        it('parses cookie (base64)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('key', { encoding: 'base64' });
            definitions.parse('key=dGVzdA', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ key: 'test' });
                done();
            });
        });

        it('parses cookie (none encoding)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('key', { encoding: 'none' });
            definitions.parse('key=dGVzdA', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ key: 'dGVzdA' });
                done();
            });
        });

        it('parses cookie (base64json)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('key', { encoding: 'base64json' });
            definitions.parse('key=eyJ0ZXN0aW5nIjoianNvbiJ9', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ key: { testing: 'json' } });
                done();
            });
        });

        it('parses cookie (iron)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('key', { encoding: 'iron', password: 'password' });
            definitions.parse('key=Fe26.2**f3fc42242467f7a97c042be866a32c1e7645045c2cc085124eadc66d25fc8395*URXpH8k-R0d4O5bnY23fRQ*uq9rd8ZzdjZqUrq9P2Ci0yZ-EEUikGzxTLn6QTcJ0bc**3880c0ac8bab054f529afec8660ebbbbc8050e192e39e5d622e7ac312b9860d0*r_g7N9kJYqXDrFlvOnuKpfpEWwrJLOKMXEI43LAGeFg', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ key: { a: 1, b: 2, c: 3 } });
                done();
            });
        });

        it('parses cookie (iron settings)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('key', { encoding: 'iron', password: 'password', iron: Iron.defaults });
            definitions.parse('key=Fe26.2**f3fc42242467f7a97c042be866a32c1e7645045c2cc085124eadc66d25fc8395*URXpH8k-R0d4O5bnY23fRQ*uq9rd8ZzdjZqUrq9P2Ci0yZ-EEUikGzxTLn6QTcJ0bc**3880c0ac8bab054f529afec8660ebbbbc8050e192e39e5d622e7ac312b9860d0*r_g7N9kJYqXDrFlvOnuKpfpEWwrJLOKMXEI43LAGeFg', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ key: { a: 1, b: 2, c: 3 } });
                done();
            });
        });

        it('parses cookie (signed form)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'form', sign: { password: 'password' } });
            definitions.parse('sid=a=1&b=2&c=3%20x.2d75635d74c1a987f84f3ee7f3113b9a2ff71f89d6692b1089f19d5d11d140f8*xGhc6WvkE55V-TzucCl0NVFmbijeCwgs5Hf5tAVbSUo', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ sid: { a: '1', b: '2', c: '3 x' } });
                done();
            });
        });

        it('parses cookie (signed form integrity settings)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'form', sign: { password: 'password', integrity: Iron.defaults.integrity } });
            definitions.parse('sid=a=1&b=2&c=3%20x.2d75635d74c1a987f84f3ee7f3113b9a2ff71f89d6692b1089f19d5d11d140f8*xGhc6WvkE55V-TzucCl0NVFmbijeCwgs5Hf5tAVbSUo', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ sid: { a: '1', b: '2', c: '3 x' } });
                done();
            });
        });

        it('parses cookie (cookie level strict override)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('a', { strictHeader: false });
            definitions.parse('a="1', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.have.length(0);
                expect(states).to.deep.equal({ a: '"1' });
                done();
            });
        });

        it('fails parsing cookie (mismatching quotes)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('a="1; b="2"; c=3', function (err, states, failed) {

                expect(err).to.exist();
                expect(err.data).to.deep.equal([
                    {
                        name: 'a',
                        value: '"1',
                        settings: {
                            isSecure: false,
                            isHttpOnly: false,
                            path: null,
                            domain: null,
                            ttl: null,
                            encoding: 'none',
                            strictHeader: true,
                            ignoreErrors: false
                        },
                        reason: 'Invalid cookie value'
                    }
                ]);

                expect(failed).to.deep.equal(err.data);

                done();
            });
        });

        it('ignores failed parsing cookie (mismatching quotes)', function (done) {

            var definitions = new Statehood.Definitions({ ignoreErrors: true });
            definitions.parse('a="1; b="2"; c=3', function (err, states, failed) {

                expect(err).to.not.exist();
                expect(failed).to.deep.equal([
                    {
                        name: 'a',
                        value: '"1',
                        settings: {
                            isSecure: false,
                            isHttpOnly: false,
                            path: null,
                            domain: null,
                            ttl: null,
                            encoding: 'none',
                            strictHeader: true,
                            ignoreErrors: true
                        },
                        reason: 'Invalid cookie value'
                    }
                ]);
                done();
            });
        });

        it('ignores failed parsing cookie (cookie settings)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('a', { ignoreErrors: true });
            definitions.parse('a="1', function (err, states, failed) {

                expect(err).to.not.exist();
                done();
            });
        });

        it('fails parsing cookie (name)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('a@="1"; b="2"; c=3', function (err, states, failed) {

                expect(err).to.exist();
                expect(err.data).to.deep.equal([
                    {
                        name: 'a@',
                        value: '1',
                        settings: {
                            isSecure: false,
                            isHttpOnly: false,
                            path: null,
                            domain: null,
                            ttl: null,
                            encoding: 'none',
                            strictHeader: true,
                            ignoreErrors: false
                        },
                        reason: 'Invalid cookie name'
                    }
                ]);
                done();
            });
        });

        it('fails parsing cookie (multiple)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('a@="1"; b@="2"; c=3', function (err, states, failed) {

                expect(err).to.exist();
                expect(err.data).to.deep.equal([
                    {
                        name: 'a@',
                        value: '1',
                        settings: {
                            isSecure: false,
                            isHttpOnly: false,
                            path: null,
                            domain: null,
                            ttl: null,
                            encoding: 'none',
                            strictHeader: true,
                            ignoreErrors: false
                        },
                        reason: 'Invalid cookie name'
                    },
                    {
                        name: 'b@',
                        value: '2',
                        settings: {
                            isSecure: false,
                            isHttpOnly: false,
                            path: null,
                            domain: null,
                            ttl: null,
                            encoding: 'none',
                            strictHeader: true,
                            ignoreErrors: false
                        },
                        reason: 'Invalid cookie name'
                    }
                ]);
                done();
            });
        });

        it('ignores failed parsing cookie (name)', function (done) {

            var definitions = new Statehood.Definitions({ ignoreErrors: true });
            definitions.parse('a@="1"; b="2"; c=3', function (err, states, failed) {

                expect(err).to.not.exist();
                done();
            });
        });

        it('fails parsing cookie (empty pair)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.parse('a=1; b=2; c=3;;', function (err, states, failed) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie header');
                done();
            });
        });

        it('fails parsing cookie (base64json)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('x', { encoding: 'base64json' });
            definitions.parse('x=XeyJ0ZXN0aW5nIjoianNvbiJ9', function (err, states, failed) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie value');
                expect(err.data).to.deep.equal([
                    {
                        name: 'x',
                        value: 'XeyJ0ZXN0aW5nIjoianNvbiJ9',
                        settings: {
                            strictHeader: true,
                            ignoreErrors: false,
                            isSecure: false,
                            isHttpOnly: false,
                            path: null,
                            domain: null,
                            ttl: null,
                            encoding: 'base64json'
                        },
                        reason: 'Unexpected token ]'
                    }
                ]);

                done();
            });
        });

        it('ignores failed parsing cookie (base64json)', function (done) {

            var definitions = new Statehood.Definitions({ ignoreErrors: true });
            definitions.add('x', { encoding: 'base64json' });
            definitions.parse('x=XeyJ0ZXN0aW5nIjoianNvbiJ9', function (err, states, failed) {

                expect(err).to.not.exist();
                done();
            });
        });

        it('fails parsing cookie (double base64json)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('x', { encoding: 'base64json' });
            definitions.parse('x=XeyJ0ZXN0aW5nIjoianNvbiJ9; x=XeyJ0ZXN0aW5dnIjoianNvbiJ9', function (err, states, failed) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie value');
                done();
            });
        });

        it('ignores failed parsing cookie (double base64json)', function (done) {

            var definitions = new Statehood.Definitions({ ignoreErrors: true });
            definitions.add('x', { encoding: 'base64json' });
            definitions.parse('x=XeyJ0ZXN0aW5nIjoianNvbiJ9; x=XeyJ0ZXN0aW5dnIjoianNvbiJ9', function (err, states, failed) {

                expect(err).to.not.exist();
                done();
            });
        });

        it('fails parsing cookie (iron)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('key', { encoding: 'iron', password: 'password' });
            definitions.parse('key=Fe26.1**f3fc42242467f7a97c042be866a32c1e7645045c2cc085124eadc66d25fc8395*URXpH8k-R0d4O5bnY23fRQ*uq9rd8ZzdjZqUrq9P2Ci0yZ-EEUikGzxTLn6QTcJ0bc**3880c0ac8bab054f529afec8660ebbbbc8050e192e39e5d622e7ac312b9860d0*r_g7N9kJYqXDrFlvOnuKpfpEWwrJLOKMXEI43LAGeFg', function (err, states, failed) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie value');
                done();
            });
        });

        it('fails parsing cookie (iron password)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('key', { encoding: 'iron', password: 'passwordx' });
            definitions.parse('key=Fe26.2**f3fc42242467f7a97c042be866a32c1e7645045c2cc085124eadc66d25fc8395*URXpH8k-R0d4O5bnY23fRQ*uq9rd8ZzdjZqUrq9P2Ci0yZ-EEUikGzxTLn6QTcJ0bc**3880c0ac8bab054f529afec8660ebbbbc8050e192e39e5d622e7ac312b9860d0*r_g7N9kJYqXDrFlvOnuKpfpEWwrJLOKMXEI43LAGeFg', function (err, states, failed) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie value');
                done();
            });
        });

        it('fails parsing cookie (signed form missing options)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'form', sign: {} });
            definitions.parse('sid=a=1&b=2&c=3%20x.2d75635d74c1a987f84f3ee7f3113b9a2ff71f89d6692b1089f19d5d11d140f8*khsb8lmkNJS-iljqDKZDMmd__2PcHBz7Ksrc-48gZ-0', function (err, states, failed) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie value');
                done();
            });
        });

        it('fails parsing cookie (signed form missing signature)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'form', sign: { password: 'password' } });
            definitions.parse('sid=a=1&b=2&c=3%20x', function (err, states, failed) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie value');
                done();
            });
        });

        it('ignores failed parsing cookie (signed form missing signature)', function (done) {

            var definitions = new Statehood.Definitions({ ignoreErrors: true });
            definitions.add('sid', { encoding: 'form', sign: { password: 'password' } });
            definitions.parse('sid=a=1&b=2&c=3%20x', function (err, states, failed) {

                expect(err).to.not.exist();
                done();
            });
        });

        it('fails parsing cookie (signed form missing signature double)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'form', sign: { password: 'password' } });
            definitions.parse('sid=a=1&b=2&c=3%20x; sid=a=1&b=2&c=3%20x', function (err, states, failed) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie value');
                done();
            });
        });

        it('ignores failed parsing cookie (signed form missing signature double)', function (done) {

            var definitions = new Statehood.Definitions({ ignoreErrors: true });
            definitions.add('sid', { encoding: 'form', sign: { password: 'password' } });
            definitions.parse('sid=a=1&b=2&c=3%20x; sid=a=1&b=2&c=3%20x', function (err, states, failed) {

                expect(err).to.not.exist();
                done();
            });
        });

        it('fails parsing cookie (signed form missing signature with sep)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'form', sign: { password: 'password' } });
            definitions.parse('sid=a=1&b=2&c=3%20x.', function (err, states, failed) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie value');
                done();
            });
        });

        it('fails parsing cookie (signed form invalid signature)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'form', sign: { password: 'password' } });
            definitions.parse('sid=a=1&b=2&c=3%20x.2d75635d74c1a987f84f3ee7f3113b9a2ff71f89d6692b1089f19d5d11d140f8', function (err, states, failed) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie value');
                done();
            });
        });

        it('fails parsing cookie (signed form wrong signature)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'form', sign: { password: 'password' } });
            definitions.parse('sid=a=1&b=2&c=3%20x.2d75635d74c1a987f84f3ee7f3113b9a2ff71f89d6692b1089f19d5d11d140f8*-Ghc6WvkE55V-TzucCl0NVFmbijeCwgs5Hf5tAVbSUo', function (err, states, failed) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie value');
                done();
            });
        });
    });

    describe('format()', function () {

        it('skips an empty header', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.format(null, function (err, header) {

                expect(err).to.not.exist();
                expect(header).to.deep.equal([]);
                done();
            });
        });

        it('skips an empty array', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.format([], function (err, header) {

                expect(err).to.not.exist();
                expect(header).to.deep.equal([]);
                done();
            });
        });

        it('formats a header', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.format({ name: 'sid', value: 'fihfieuhr9384hf', options: { ttl: 3600, isSecure: true, isHttpOnly: true, path: '/', domain: 'example.com' } }, function (err, header) {

                var expires = new Date(Date.now() + 3600);
                expect(err).to.not.exist();
                expect(header[0]).to.equal('sid=fihfieuhr9384hf; Max-Age=3; Expires=' + expires.toUTCString() + '; Secure; HttpOnly; Domain=example.com; Path=/');
                done();
            });
        });

        it('formats a header (with null ttl)', function (done) {

            var definitions = new Statehood.Definitions({ ttl: 3600 });
            definitions.format({ name: 'sid', value: 'fihfieuhr9384hf', options: { ttl: null, isSecure: true, isHttpOnly: true, path: '/', domain: 'example.com' } }, function (err, header) {

                expect(err).to.not.exist();
                expect(header[0]).to.equal('sid=fihfieuhr9384hf; Secure; HttpOnly; Domain=example.com; Path=/');
                done();
            });
        });

        it('formats a header (with zero ttl)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.format({ name: 'sid', value: 'fihfieuhr9384hf', options: { ttl: 0, isSecure: true, isHttpOnly: true, path: '/', domain: 'example.com' } }, function (err, header) {

                expect(err).to.not.exist();
                expect(header[0]).to.equal('sid=fihfieuhr9384hf; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; Domain=example.com; Path=/');
                done();
            });
        });

        it('formats a header with null value', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.format({ name: 'sid', options: { ttl: 3600, isSecure: true, isHttpOnly: true, path: '/', domain: 'example.com' } }, function (err, header) {

                var expires = new Date(Date.now() + 3600);
                expect(err).to.not.exist();
                expect(header[0]).to.equal('sid=; Max-Age=3; Expires=' + expires.toUTCString() + '; Secure; HttpOnly; Domain=example.com; Path=/');
                done();
            });
        });

        it('formats a header with server definition', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { ttl: 3600, isSecure: true, isHttpOnly: true, path: '/', domain: 'example.com' });
            definitions.format({ name: 'sid', value: 'fihfieuhr9384hf' }, function (err, header) {

                var expires = new Date(Date.now() + 3600);
                expect(err).to.not.exist();
                expect(header[0]).to.equal('sid=fihfieuhr9384hf; Max-Age=3; Expires=' + expires.toUTCString() + '; Secure; HttpOnly; Domain=example.com; Path=/');
                done();
            });
        });

        it('formats a header with server definition (base64)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'base64' });
            definitions.format({ name: 'sid', value: 'fihfieuhr9384hf' }, function (err, header) {

                expect(err).to.not.exist();
                expect(header[0]).to.equal('sid=ZmloZmlldWhyOTM4NGhm');
                done();
            });
        });

        it('formats a header with server definition (base64json)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'base64json' });
            definitions.format({ name: 'sid', value: { a: 1, b: 2, c: 3 } }, function (err, header) {

                expect(err).to.not.exist();
                expect(header[0]).to.equal('sid=eyJhIjoxLCJiIjoyLCJjIjozfQ==');
                done();
            });
        });

        it('fails on a header with server definition and bad value (base64json)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'base64json' });
            var bad = { a: {} };
            bad.b = bad.a;
            bad.a.x = bad.b;

            definitions.format({ name: 'sid', value: bad }, function (err, header) {

                expect(err).to.exist();
                done();
            });
        });

        it('formats a header with server definition (form)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'form' });
            definitions.format({ name: 'sid', value: { a: 1, b: 2, c: '3 x' } }, function (err, header) {

                expect(err).to.not.exist();
                expect(header[0]).to.equal('sid=a=1&b=2&c=3%20x');
                done();
            });
        });

        it('formats a header with server definition (form+sign)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', {
                encoding: 'form',
                sign: {
                    password: 'password',
                    integrity: {
                        saltBits: 256,
                        algorithm: 'sha256',
                        iterations: 1,
                        salt: '2d75635d74c1a987f84f3ee7f3113b9a2ff71f89d6692b1089f19d5d11d140f8'
                    }
                }
            });
            definitions.format({ name: 'sid', value: { a: 1, b: 2, c: '3 x' } }, function (err, header) {

                expect(err).to.not.exist();
                expect(header[0]).to.equal('sid=a=1&b=2&c=3%20x.2d75635d74c1a987f84f3ee7f3113b9a2ff71f89d6692b1089f19d5d11d140f8*xGhc6WvkE55V-TzucCl0NVFmbijeCwgs5Hf5tAVbSUo');
                done();
            });
        });

        it('formats a header with server definition (form+sign, buffer password)', function (done) {

            var buffer = new Buffer('fa4321e8c21b44a49d382fa7709226855f40eb23a32b2f642c3fd797c958718e', 'base64');
            var definitions = new Statehood.Definitions();
            definitions.add('sid', {
                encoding: 'form',
                sign: {
                    password: buffer,
                    integrity: {
                        saltBits: 256,
                        algorithm: 'sha256',
                        iterations: 1,
                        salt: '2d75635d74c1a987f84f3ee7f3113b9a2ff71f89d6692b1089f19d5d11d140f8'
                    }
                }
            });
            definitions.format({ name: 'sid', value: { a: 1, b: 2, c: '3 x' } }, function (err, header) {

                expect(err).to.not.exist();
                expect(header[0]).to.equal('sid=a=1&b=2&c=3%20x.*4wjD4tIxyiNW-rC3xBqL56TxUbb_aQT5PMykruWlR0Q');
                done();
            });
        });

        it('fails a header with bad server definition (form+sign)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', {
                encoding: 'form',
                sign: {}
            });
            definitions.format({ name: 'sid', value: { a: 1, b: 2, c: '3 x' } }, function (err, header) {

                expect(err).to.exist();
                expect(err.message).to.equal('Failed to sign cookie (sid) value: Empty password');
                done();
            });
        });

        it('formats a header with server definition (iron)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'iron', password: 'password' });
            definitions.format({ name: 'sid', value: { a: 1, b: 2, c: 3 } }, function (err, header) {

                expect(err).to.not.exist();
                expect(header[0]).to.have.string('sid=Fe26.2*');
                done();
            });
        });

        it('formats a header with server definition (iron + options)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'iron', password: 'password', iron: Iron.defaults });
            definitions.format({ name: 'sid', value: { a: 1, b: 2, c: 3 } }, function (err, header) {

                expect(err).to.not.exist();
                expect(header[0]).to.have.string('sid=Fe26.2*');
                done();
            });
        });

        it('formats a header with server definition (iron + options, buffer password)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'iron', password: Cryptiles.randomBits(256), iron: Iron.defaults });
            definitions.format({ name: 'sid', value: { a: 1, b: 2, c: 3 } }, function (err, header) {

                expect(err).to.not.exist();
                expect(header[0]).to.have.string('sid=Fe26.2*');
                done();
            });
        });

        it('fails a header with bad server definition (iron)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('sid', { encoding: 'iron' });
            definitions.format({ name: 'sid', value: { a: 1, b: 2, c: 3 } }, function (err, header) {

                expect(err).to.exist();
                expect(err.message).to.equal('Failed to encode cookie (sid) value: Empty password');
                done();
            });
        });

        it('formats a header with multiple cookies', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.format([
                { name: 'sid', value: 'fihfieuhr9384hf', options: { ttl: 3600, isSecure: true, isHttpOnly: true, path: '/', domain: 'example.com' } },
                { name: 'pid', value: 'xyz' }
            ], function (err, header) {

                var expires = new Date(Date.now() + 3600);
                expect(err).to.not.exist();
                expect(header[0]).to.equal('sid=fihfieuhr9384hf; Max-Age=3; Expires=' + expires.toUTCString() + '; Secure; HttpOnly; Domain=example.com; Path=/');
                expect(header[1]).to.equal('pid=xyz');
                done();
            });
        });

        it('fails on bad cookie name', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.format({ name: 's;id', value: 'fihfieuhr9384hf', options: { isSecure: true, isHttpOnly: false, path: '/', domain: 'example.com' } }, function (err, header) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie name: s;id');
                done();
            });
        });

        it('allows bad cookie name in loose mode', function (done) {

            var definitions = new Statehood.Definitions({ strictHeader: false });
            definitions.format({ name: 's;id', value: 'fihfieuhr9384hf', options: { isSecure: true, isHttpOnly: false, path: '/', domain: 'example.com' } }, function (err, header) {

                expect(err).to.not.exist();
                expect(header[0]).to.equal('s;id=fihfieuhr9384hf; Secure; Domain=example.com; Path=/');
                done();
            });
        });

        it('allows bad cookie name in loose mode (cookie level)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('s;id', { strictHeader: false });
            definitions.format({ name: 's;id', value: 'fihfieuhr9384hf', options: { isSecure: true, isHttpOnly: false, path: '/', domain: 'example.com' } }, function (err, header) {

                expect(err).to.not.exist();
                expect(header[0]).to.equal('s;id=fihfieuhr9384hf; Secure; Domain=example.com; Path=/');
                done();
            });
        });

        it('fails on bad cookie value', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.format({ name: 'sid', value: 'fi"hfieuhr9384hf', options: { isSecure: true, isHttpOnly: false, path: '/', domain: 'example.com' } }, function (err, header) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie value: fi"hfieuhr9384hf');
                done();
            });
        });

        it('fails on bad cookie value (non string)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.format({ name: 'sid', value: {}, options: { isSecure: true, isHttpOnly: false, path: '/', domain: 'example.com' } }, function (err, header) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie value: [object Object]');
                done();
            });
        });

        it('allows bad cookie value in loose mode', function (done) {

            var definitions = new Statehood.Definitions({ strictHeader: false });
            definitions.format({ name: 'sid', value: 'fi"hfieuhr9384hf', options: { isSecure: true, isHttpOnly: false, path: '/', domain: 'example.com' } }, function (err, header) {

                expect(err).to.not.exist();
                expect(header[0]).to.equal('sid=fi"hfieuhr9384hf; Secure; Domain=example.com; Path=/');
                done();
            });
        });

        it('fails on bad cookie domain', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.format({ name: 'sid', value: 'fihfieuhr9384hf', options: { isSecure: true, isHttpOnly: false, path: '/', domain: '-example.com' } }, function (err, header) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie domain: -example.com');
                done();
            });
        });

        it('fails on too long cookie domain', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.format({ name: 'sid', value: 'fihfieuhr9384hf', options: { isSecure: true, isHttpOnly: false, path: '/', domain: '1234567890123456789012345678901234567890123456789012345678901234567890.example.com' } }, function (err, header) {

                expect(err).to.exist();
                expect(err.message).to.equal('Cookie domain too long: 1234567890123456789012345678901234567890123456789012345678901234567890.example.com');
                done();
            });
        });

        it('formats a header with cookie domain with . prefix', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.format({ name: 'sid', value: 'fihfieuhr9384hf', options: { isSecure: true, isHttpOnly: false, path: '/', domain: '.12345678901234567890.example.com' } }, function (err, header) {

                expect(err).to.not.exist();
                done();
            });
        });

        it('fails on bad cookie path', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.format({ name: 'sid', value: 'fihfieuhr9384hf', options: { isSecure: true, isHttpOnly: false, path: 'd', domain: 'example.com' } }, function (err, header) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid cookie path: d');
                done();
            });
        });
    });

    describe('passThrough()', function () {

        it('returns header unchanged', function (done) {

            var definitions = new Statehood.Definitions();
            var header = 'a=4;b=5;c=6';
            var result = definitions.passThrough(header);
            expect(result).to.equal(header);
            done();
        });

        it('returns header excluding local', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('b');
            var header = 'a=4;b=5;c=6';
            var result = definitions.passThrough(header);
            expect(result).to.equal('a=4;c=6');
            done();
        });

        it('returns header including local (fallback)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('b');
            var header = 'a=4;b=5;c=6';
            var result = definitions.passThrough(header, true);
            expect(result).to.equal('a=4;b=5;c=6');
            done();
        });

        it('returns header including local (state option)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('b', { passThrough: true });
            var header = 'a=4;b=5;c=6';
            var result = definitions.passThrough(header);
            expect(result).to.equal('a=4;b=5;c=6');
            done();
        });

        it('returns header including local (state option with fallback)', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('b', { passThrough: false });
            var header = 'a=4;b=5;c=6';
            var result = definitions.passThrough(header, true);
            expect(result).to.equal('a=4;c=6');
            done();
        });

        it('errors on invalid header', function (done) {

            var definitions = new Statehood.Definitions();
            definitions.add('b');
            var header = 'a=4;b=5;c=6;;';
            var result = definitions.passThrough(header);
            expect(result.message).to.equal('Invalid cookie header');
            done();
        });
    });
});

describe('prepareValue()', function () {

    it('throws when missing options', function (done) {

        expect(function () {

            Statehood.prepareValue('name', 'value');
        }).to.throw('Missing or invalid options');
        done();
    });
});

describe('exclude()', function () {

    it('returns all keys', function (done) {

        var header = 'a=4;b=5;c=6';
        var result = Statehood.exclude(header, []);
        expect(result).to.equal(header);
        done();
    });

    it('returns keys without excluded', function (done) {

        var header = 'a=4;b=5;c=6';
        var result = Statehood.exclude(header, ['b']);
        expect(result).to.equal('a=4;c=6');
        done();
    });

    it('returns error on invalid header', function (done) {

        var header = 'a';
        var result = Statehood.exclude(header, ['b']);
        expect(result.message).to.equal('Invalid cookie header');
        done();
    });
});
