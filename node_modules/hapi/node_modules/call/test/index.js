// Load modules

var Lab = require('lab');
var Call = require('../');
var Code = require('code');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('Router', function () {

    it('routes request', function (done) {

        var router = new Call.Router();
        router.add({ method: 'get', path: '/' }, '/');
        router.add({ method: 'get', path: '/a' }, '/a');
        router.add({ method: 'get', path: '/a{b?}c{d}' }, '/a{b?}c{d}');

        expect(router.route('get', '/').route).to.equal('/');
        expect(router.route('get', '/a').route).to.equal('/a');
        expect(router.route('get', '/abcd').route).to.equal('/a{b?}c{d}');

        done();
    });

    it('routes request (pre-analyzed)', function (done) {

        var router = new Call.Router();
        router.add({ method: 'get', path: '/', analysis: router.analyze('/') }, '/');
        router.add({ method: 'get', path: '/a', analysis: router.analyze('/a') }, '/a');
        router.add({ method: 'get', path: '/b', analysis: router.analyze('/b') }, '/b');

        expect(router.route('get', '/').route).to.equal('/');
        expect(router.route('get', '/a').route).to.equal('/a');
        expect(router.route('get', '/b').route).to.equal('/b');

        done();
    });

    describe('sort', function () {

        var paths = [
            '/',
            '/a',
            '/b',
            '/ab',
            '/a{p}b',
            '/a{p}',
            '/{p}b',
            '/{p}',
            '/a/b',
            '/a/{p}',
            '/b/',
            '/a1{p}/a',
            '/xx{p}/b',
            '/x{p}/a',
            '/x{p}/b',
            '/y{p?}/b',
            '/{p}xx/b',
            '/{p}x/b',
            '/{p}y/b',
            '/a/b/c',
            '/a/b/{p}',
            '/a/d{p}c/b',
            '/a/d{p}/b',
            '/a/{p}d/b',
            '/a/{p}/b',
            '/a/{p}/c',
            '/a/{p*2}',
            '/a/b/c/d',
            '/a/b/{p*2}',
            '/a/{p}/b/{x}',
            '/{p*5}',
            '/a/b/{p*}',
            '/{a}/b/{p*}',
            '/{p*}',
            '/m/n/{p*}',
            '/m/{n}/{o}',
            '/n/{p}/{o*}'
        ];

        var router = new Call.Router();
        for (var i = 0, il = paths.length; i < il; ++i) {
            router.add({ method: 'get', path: paths[i] }, paths[i]);
        }

        var requests = [
            ['/', '/'],
            ['/a', '/a'],
            ['/b', '/b'],
            ['/ab', '/ab'],
            ['/axb', '/a{p}b'],
            ['/axc', '/a{p}'],
            ['/bxb', '/{p}b'],
            ['/c', '/{p}'],
            ['/a/b', '/a/b'],
            ['/a/c', '/a/{p}'],
            ['/b/', '/b/'],
            ['/a1larry/a', '/a1{p}/a'],
            ['/xx1/b', '/xx{p}/b'],
            ['/xx1/a', '/x{p}/a'],
            ['/x1/b', '/x{p}/b'],
            ['/y/b', '/y{p?}/b'],
            ['/0xx/b', '/{p}xx/b'],
            ['/0x/b', '/{p}x/b'],
            ['/ay/b', '/{p}y/b'],
            ['/a/b/c', '/a/b/c'],
            ['/a/b/d', '/a/b/{p}'],
            ['/a/doc/b', '/a/d{p}c/b'],
            ['/a/dl/b', '/a/d{p}/b'],
            ['/a/ld/b', '/a/{p}d/b'],
            ['/a/a/b', '/a/{p}/b'],
            ['/a/d/c', '/a/{p}/c'],
            ['/a/d/d', '/a/{p*2}'],
            ['/a/b/c/d', '/a/b/c/d'],
            ['/a/b/c/e', '/a/b/{p*2}'],
            ['/a/c/b/d', '/a/{p}/b/{x}'],
            ['/a/b/c/d/e', '/a/b/{p*}'],
            ['/a/b/c/d/e/f', '/a/b/{p*}'],
            ['/x/b/c/d/e/f/g', '/{a}/b/{p*}'],
            ['/x/y/c/d/e/f/g', '/{p*}'],
            ['/m/n/o', '/m/n/{p*}'],
            ['/m/o/p', '/m/{n}/{o}'],
            ['/n/a/b/c', '/n/{p}/{o*}'],
            ['/n/a', '/n/{p}/{o*}']
        ];

        var test = function (path, route) {

            it('matches \'' + path + '\' to \'' + route + '\'', function (done) {

                expect(router.route('get', path).route).to.equal(route);
                done();
            });
        };

        for (i = 0, il = requests.length; i < il; ++i) {
            test(requests[i][0], requests[i][1]);
        }
    });

    describe('add()', function () {

        it('adds a route with id', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/a/b/{c}', id: 'a' });
            expect(router.ids.a.path).to.equal('/a/b/{c}');
            done();
        });

        it('throws on duplicate route', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/a/b/{c}' });
            expect(function () {

                router.add({ method: 'get', path: '/a/b/{c}' });
            }).to.throw('New route /a/b/{c} conflicts with existing /a/b/{c}');

            done();
        });

        it('throws on duplicate route (id)', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/a/b', id: '1' });
            expect(function () {

                router.add({ method: 'get', path: '/b', id: '1' });
            }).to.throw('Route id 1 for path /b conflicts with existing path /a/b');

            done();
        });

        it('throws on duplicate route (optional param in first)', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/a/b/{c?}' });
            expect(function () {

                router.add({ method: 'get', path: '/a/b' });
            }).to.throw('New route /a/b conflicts with existing /a/b/{c?}');

            done();
        });

        it('throws on duplicate route (optional param in second)', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/a/b' });
            expect(function () {

                router.add({ method: 'get', path: '/a/b/{c?}' });
            }).to.throw('New route /a/b/{c?} conflicts with existing /a/b');

            done();
        });

        it('throws on duplicate route (same fingerprint)', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/test/{p1}/{p2}/end' });
            expect(function () {

                router.add({ method: 'get', path: '/test/{p*2}/end' });
            }).to.throw('New route /test/{p*2}/end conflicts with existing /test/{p1}/{p2}/end');

            done();
        });

        it('throws on duplicate route (case insensitive)', function (done) {

            var router = new Call.Router({ isCaseSensitive: false });
            router.add({ method: 'get', path: '/test/a' });
            expect(function () {

                router.add({ method: 'get', path: '/test/A' });
            }).to.throw('New route /test/A conflicts with existing /test/a');

            done();
        });

        it('throws on duplicate route (wildcards)', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/a/b/{c*}' });
            expect(function () {

                router.add({ method: 'get', path: '/a/b/{c*}' });
            }).to.throw('New route /a/b/{c*} conflicts with existing /a/b/{c*}');

            done();
        });

        it('throws on duplicate route (mixed)', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/a/b/a{c}' });
            expect(function () {

                router.add({ method: 'get', path: '/a/b/a{c}' });
            }).to.throw('New route /a/b/a{c} conflicts with existing /a/b/a{c}');

            done();
        });

        it('throws on duplicate route (/a/{p}/{q*}, /a/{p*})', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/a/{p}/{q*}' });
            expect(function () {

                router.add({ method: 'get', path: '/a/{p*}' });
            }).to.throw('New route /a/{p*} conflicts with existing /a/{p}/{q*}');

            done();
        });

        it('throws on duplicate route (/a/{p*}, /a/{p}/{q*})', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/a/{p*}' });
            expect(function () {

                router.add({ method: 'get', path: '/a/{p}/{q*}' });
            }).to.throw('New route /a/{p}/{q*} conflicts with existing /a/{p*}');

            done();
        });

        it('allows route to differ in just case', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/test/a' });
            expect(function () {

                router.add({ method: 'get', path: '/test/A' });
            }).to.not.throw();

            done();
        });

        it('throws on duplicate route (different param name)', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/test/{p}' });
            expect(function () {

                router.add({ method: 'get', path: '/test/{P}' });
            }).to.throw('New route /test/{P} conflicts with existing /test/{p}');

            done();
        });

        it('throws on duplicate parameter name', function (done) {

            var router = new Call.Router();
            expect(function () {

                router.add({ method: 'get', path: '/test/{p}/{p}' });
            }).to.throw('Cannot repeat the same parameter name: p in: /test/{p}/{p}');

            done();
        });

        it('throws on invalid path', function (done) {

            var router = new Call.Router();
            expect(function () {

                router.add({ method: 'get', path: '/%/%' });
            }).to.throw('Invalid path: /%/%');

            done();
        });

        it('throws on duplicate route (same vhost)', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/a/b/{c}', vhost: 'example.com' });
            expect(function () {

                router.add({ method: 'get', path: '/a/b/{c}', vhost: 'example.com' });
            }).to.throw('New route /a/b/{c} conflicts with existing /a/b/{c}');

            done();
        });

        it('allows duplicate route (different vhost)', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/a/b/{c}', vhost: 'one.example.com' });
            expect(function () {

                router.add({ method: 'get', path: '/a/b/{c}', vhost: 'two.example.com' });
            }).to.not.throw();

            done();
        });
    });

    describe('special()', function () {

        it('returns special not found route', function (done) {

            var router = new Call.Router();
            router.special('notFound', 'x');
            expect(router.route('get', '/').route).to.equal('x');
            done();
        });

        it('returns special bad request route', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/{p}' });
            router.special('badRequest', 'x');
            expect(router.route('get', '/%p').route).to.equal('x');
            done();
        });

        it('returns special options route', function (done) {

            var router = new Call.Router();
            router.special('options', 'x');
            expect(router.route('options', '/').route).to.equal('x');
            done();
        });
    });

    describe('route()', function () {

        var paths = {
            '/path/to/|false': {
                '/path/to': false,
                '/Path/to': false,
                '/path/to/': true,
                '/Path/to/': true
            },
            '/path/to/|true': {
                '/path/to': false,
                '/Path/to': false,
                '/path/to/': true,
                '/Path/to/': false
            },
            '/path/{param*2}/to': {
                '/a/b/c/d': false,
                '/path/a/b/to': {
                    param: 'a/b'
                }
            },
            '/path/{x*}': {
                '/a/b/c/d': false,
                '/path/a/b/to': {
                    x: 'a/b/to'
                },
                '/path/': {},
                '/path': {}
            },
            '/path/{p1}/{p2?}': {
                '/path/a/c/d': false,
                '/Path/a/c/d': false,
                '/path/a/b': {
                    p1: 'a',
                    p2: 'b'
                },
                '/path/a': {
                    p1: 'a'
                },
                '/path/a/': {
                    p1: 'a'
                }
            },
            '/path/{p1}/{p2?}|false': {
                '/path/a/c/d': false,
                '/Path/a/c': {
                    p1: 'a',
                    p2: 'c'
                },
                '/path/a': {
                    p1: 'a'
                },
                '/path/a/': {
                    p1: 'a'
                }
            },
            '/mixedCase/|false': {
                '/mixedcase/': true,
                '/mixedCase/': true
            },
            '/mixedCase/|true': {
                '/mixedcase/': false,
                '/mixedCase/': true
            },
            '/{p*}': {
                '/path/': {
                    p: 'path/'
                }
            },
            '/{a}/b/{p*}': {
                '/a/b/path/': {
                    a: 'a',
                    p: 'path/'
                }
            },
            '/a{b?}c': {
                '/abc': {
                    b: 'b'
                },
                '/ac': {},
                '/abC': false,
                '/Ac': false
            },
            '/a{b?}c|false': {
                '/abC': {
                    b: 'b'
                },
                '/Ac': {}
            },
            '/%0A': {
                '/%0A': true,
                '/%0a': true
            },
            '/a/b/{c}': {
                '/a/b/c': true,
                '/a/b': false,
                '/a/b/': false
            },
            '/a/{b}/c|false': {
                '/a/1/c': {
                    b: '1'
                },
                '/A/1/c': {
                    b: '1'
                }
            },
            '/a/{B}/c|false': {
                '/a/1/c': {
                    B: '1'
                },
                '/A/1/c': {
                    B: '1'
                }
            },
            '/a/{b}/c|true': {
                '/a/1/c': {
                    b: '1'
                },
                '/A/1/c': false
            },
            '/a/{B}/c|true': {
                '/a/1/c': {
                    B: '1'
                },
                '/A/1/c': false
            },
            '/aB/{p}|true': {
                '/aB/4': {
                    p: '4'
                },
                '/ab/4': false
            },
            '/aB/{p}|false': {
                '/aB/4': {
                    p: '4'
                },
                '/ab/4': {
                    p: '4'
                }
            },
            '/{a}b{c?}d{e}|true': {
                '/abcde': {
                    a: 'a',
                    c: 'c',
                    e: 'e'
                },
                '/abde': {
                    a: 'a',
                    e: 'e'
                },
                '/abxyzde': {
                    a: 'a',
                    c: 'xyz',
                    e: 'e'
                },
                '/aBcde': false,
                '/bcde': false
            },
            '/a/{p}/b': {
                '/a/': false
            }
        };

        var test = function (path, matches, isCaseSensitive) {

            var router = new Call.Router({ isCaseSensitive: isCaseSensitive });
            router.add({ path: path, method: 'get' }, path);

            var mkeys = Object.keys(matches);
            for (var m = 0, ml = mkeys.length; m < ml; ++m) {
                match(router, path, mkeys[m], matches[mkeys[m]]);
            }
        };

        var match = function (router, path, match, result) {

            it((result ? 'matches' : 'unmatches') + ' the path \'' + path + '\' with ' + match + ' (' + (isCaseSensitive ? 'case-sensitive' : 'case-insensitive') + ')', function (done) {

                var output = router.route('get', router.normalize(match));
                var isMatch = !output.isBoom;

                expect(isMatch).to.equal(!!result);
                if (typeof result === 'object') {
                    var ps = Object.keys(result);
                    expect(ps.length).to.equal(output.paramsArray.length);

                    for (var p = 0, pl = ps.length; p < pl; ++p) {
                        expect(output.params[ps[p]]).to.equal(result[ps[p]]);
                    }
                }

                done();
            });
        };

        var keys = Object.keys(paths);
        for (var i = 0, il = keys.length; i < il; ++i) {
            var pathParts = keys[i].split('|');
            var isCaseSensitive = (pathParts[1] ? pathParts[1] === 'true' : true);
            test(pathParts[0], paths[keys[i]], isCaseSensitive);
        }

        it('matches head routes', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/a' }, 'a');
            router.add({ method: 'get', path: '/a', vhost: 'special.example.com' }, 'b');
            router.add({ method: 'get', path: '/b', vhost: 'special.example.com' }, 'c');
            router.add({ method: 'head', path: '/a' }, 'd');
            router.add({ method: 'head', path: '/a', vhost: 'special.example.com' }, 'e');
            router.add({ method: 'get', path: '/b', vhost: 'x.example.com' }, 'f');
            router.add({ method: 'get', path: '/c' }, 'g');

            expect(router.route('get', '/a').route).to.equal('a');
            expect(router.route('get', '/a', 'special.example.com').route).to.equal('b');
            expect(router.route('head', '/a').route).to.equal('d');
            expect(router.route('head', '/a', 'special.example.com').route).to.equal('e');
            expect(router.route('head', '/b', 'special.example.com').route).to.equal('c');
            expect(router.route('head', '/c', 'x.example.com').route).to.equal('g');
            done();
        });

        it('matches * routes', function (done) {

            var router = new Call.Router();
            router.add({ method: '*', path: '/a' }, 'a');
            router.add({ method: '*', path: '/a', vhost: 'special.example.com' }, 'b');

            expect(router.route('get', '/a').route).to.equal('a');
            expect(router.route('get', '/a', 'special.example.com').route).to.equal('b');
            done();
        });

        it('fails to match head request', function (done) {

            var router = new Call.Router();
            expect(router.route('head', '/').output.statusCode).to.equal(404);
            done();
        });

        it('fails to match options request', function (done) {

            var router = new Call.Router();
            expect(router.route('options', '/').output.statusCode).to.equal(404);
            done();
        });

        it('fails to match get request with vhost (table exists but not route)', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/', vhost: 'special.example.com' });
            expect(router.route('get', '/x', 'special.example.com').output.statusCode).to.equal(404);
            done();
        });

        it('fails to match head request with vhost (table exists but not route)', function (done) {

            var router = new Call.Router();
            router.add({ method: 'head', path: '/', vhost: 'special.example.com' });
            expect(router.route('head', '/x', 'special.example.com').output.statusCode).to.equal(404);
            done();
        });

        it('fails to match bad request', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/{p}' });
            expect(router.route('get', '/%p').output.statusCode).to.equal(400);
            done();
        });

        it('fails to match bad request (mixed)', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/a{p}' });
            expect(router.route('get', '/a%p').output.statusCode).to.equal(400);
            done();
        });

        it('fails to match bad request (wildcard)', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/{p*}' });
            expect(router.route('get', '/%p').output.statusCode).to.equal(400);
            done();
        });

        it('fails to match bad request (deep)', function (done) {

            var router = new Call.Router();
            router.add({ method: 'get', path: '/a/{p}' });
            expect(router.route('get', '/a/%p').output.statusCode).to.equal(400);
            done();
        });
    });

    describe('normalize()', function () {

        it('normalizes a path', function (done) {

            var rawPath = '/%0%1%2%3%4%5%6%7%8%9%a%b%c%d%e%f%10%11%12%13%14%15%16%17%18%19%1a%1b%1c%1d%1e%1f%20%21%22%23%24%25%26%27%28%29%2a%2b%2c%2d%2e%2f%30%31%32%33%34%35%36%37%38%39%3a%3b%3c%3d%3e%3f%40%41%42%43%44%45%46%47%48%49%4a%4b%4c%4d%4e%4f%50%51%52%53%54%55%56%57%58%59%5a%5b%5c%5d%5e%5f%60%61%62%63%64%65%66%67%68%69%6a%6b%6c%6d%6e%6f%70%71%72%73%74%75%76%77%78%79%7a%7b%7c%7d%7e%7f%80%81%82%83%84%85%86%87%88%89%8a%8b%8c%8d%8e%8f%90%91%92%93%94%95%96%97%98%99%9a%9b%9c%9d%9e%9f%a0%a1%a2%a3%a4%a5%a6%a7%a8%a9%aa%ab%ac%ad%ae%af%b0%b1%b2%b3%b4%b5%b6%b7%b8%b9%ba%bb%bc%bd%be%bf%c0%c1%c2%c3%c4%c5%c6%c7%c8%c9%ca%cb%cc%cd%ce%cf%d0%d1%d2%d3%d4%d5%d6%d7%d8%d9%da%db%dc%dd%de%df%e0%e1%e2%e3%e4%e5%e6%e7%e8%e9%ea%eb%ec%ed%ee%ef%f0%f1%f2%f3%f4%f5%f6%f7%f8%f9%fa%fb%fc%fd%fe%ff%0%1%2%3%4%5%6%7%8%9%A%B%C%D%E%F%10%11%12%13%14%15%16%17%18%19%1A%1B%1C%1D%1E%1F%20%21%22%23%24%25%26%27%28%29%2A%2B%2C%2D%2E%2F%30%31%32%33%34%35%36%37%38%39%3A%3B%3C%3D%3E%3F%40%41%42%43%44%45%46%47%48%49%4A%4B%4C%4D%4E%4F%50%51%52%53%54%55%56%57%58%59%5A%5B%5C%5D%5E%5F%60%61%62%63%64%65%66%67%68%69%6A%6B%6C%6D%6E%6F%70%71%72%73%74%75%76%77%78%79%7A%7B%7C%7D%7E%7F%80%81%82%83%84%85%86%87%88%89%8A%8B%8C%8D%8E%8F%90%91%92%93%94%95%96%97%98%99%9A%9B%9C%9D%9E%9F%A0%A1%A2%A3%A4%A5%A6%A7%A8%A9%AA%AB%AC%AD%AE%AF%B0%B1%B2%B3%B4%B5%B6%B7%B8%B9%BA%BB%BC%BD%BE%BF%C0%C1%C2%C3%C4%C5%C6%C7%C8%C9%CA%CB%CC%CD%CE%CF%D0%D1%D2%D3%D4%D5%D6%D7%D8%D9%DA%DB%DC%DD%DE%DF%E0%E1%E2%E3%E4%E5%E6%E7%E8%E9%EA%EB%EC%ED%EE%EF%F0%F1%F2%F3%F4%F5%F6%F7%F8%F9%FA%FB%FC%FD%FE%FF';
            var normPath = '/%0%1%2%3%4%5%6%7%8%9%a%b%c%d%e%f%10%11%12%13%14%15%16%17%18%19%1A%1B%1C%1D%1E%1F%20!%22%23$%25&\'()*+,-.%2F0123456789:;%3C=%3E%3F@ABCDEFGHIJKLMNOPQRSTUVWXYZ%5B%5C%5D%5E_%60abcdefghijklmnopqrstuvwxyz%7B%7C%7D~%7F%80%81%82%83%84%85%86%87%88%89%8A%8B%8C%8D%8E%8F%90%91%92%93%94%95%96%97%98%99%9A%9B%9C%9D%9E%9F%A0%A1%A2%A3%A4%A5%A6%A7%A8%A9%AA%AB%AC%AD%AE%AF%B0%B1%B2%B3%B4%B5%B6%B7%B8%B9%BA%BB%BC%BD%BE%BF%C0%C1%C2%C3%C4%C5%C6%C7%C8%C9%CA%CB%CC%CD%CE%CF%D0%D1%D2%D3%D4%D5%D6%D7%D8%D9%DA%DB%DC%DD%DE%DF%E0%E1%E2%E3%E4%E5%E6%E7%E8%E9%EA%EB%EC%ED%EE%EF%F0%F1%F2%F3%F4%F5%F6%F7%F8%F9%FA%FB%FC%FD%FE%FF%0%1%2%3%4%5%6%7%8%9%A%B%C%D%E%F%10%11%12%13%14%15%16%17%18%19%1A%1B%1C%1D%1E%1F%20!%22%23$%25&\'()*+,-.%2F0123456789:;%3C=%3E%3F@ABCDEFGHIJKLMNOPQRSTUVWXYZ%5B%5C%5D%5E_%60abcdefghijklmnopqrstuvwxyz%7B%7C%7D~%7F%80%81%82%83%84%85%86%87%88%89%8A%8B%8C%8D%8E%8F%90%91%92%93%94%95%96%97%98%99%9A%9B%9C%9D%9E%9F%A0%A1%A2%A3%A4%A5%A6%A7%A8%A9%AA%AB%AC%AD%AE%AF%B0%B1%B2%B3%B4%B5%B6%B7%B8%B9%BA%BB%BC%BD%BE%BF%C0%C1%C2%C3%C4%C5%C6%C7%C8%C9%CA%CB%CC%CD%CE%CF%D0%D1%D2%D3%D4%D5%D6%D7%D8%D9%DA%DB%DC%DD%DE%DF%E0%E1%E2%E3%E4%E5%E6%E7%E8%E9%EA%EB%EC%ED%EE%EF%F0%F1%F2%F3%F4%F5%F6%F7%F8%F9%FA%FB%FC%FD%FE%FF';

            var router = new Call.Router();
            expect(router.normalize(rawPath)).to.equal(normPath);
            done();
        });

        it('returns empty path on empty', function (done) {

            var router = new Call.Router();
            expect(router.normalize('')).to.equal('');
            done();
        });
    });

    describe('analyze()', function () {

        it('generates fingerprints', function (done) {

            var paths = {
                '/': '/',
                '/path': '/path',
                '/path/': '/path/',
                '/path/to/somewhere': '/path/to/somewhere',
                '/{param}': '/?',
                '/{param?}': '/?',
                '/{param*}': '/#',
                '/{param*5}': '/?/?/?/?/?',
                '/path/{param}': '/path/?',
                '/path/{param}/to': '/path/?/to',
                '/path/{param?}': '/path/?',
                '/path/{param}/to/{some}': '/path/?/to/?',
                '/path/{param}/to/{some?}': '/path/?/to/?',
                '/path/{param*2}/to': '/path/?/?/to',
                '/path/{param*}': '/path/#',
                '/path/{param*10}/to': '/path/?/?/?/?/?/?/?/?/?/?/to',
                '/path/{param*2}': '/path/?/?',
                '/%20path/': '/%20path/',
                '/a{p}': '/a?',
                '/{p}b': '/?b',
                '/a{p}b': '/a?b',
                '/a{p?}': '/a?',
                '/{p?}b': '/?b',
                '/a{p?}b': '/a?b'
            };

            var router = new Call.Router({ isCaseSensitive: true });
            var keys = Object.keys(paths);
            for (var i = 0, il = keys.length; i < il; ++i) {
                expect(router.analyze(keys[i]).fingerprint).to.equal(paths[keys[i]]);
            }

            done();
        });
    });

    describe('table()', function () {

        it('returns an array of the current routes', function (done) {

            var router = new Call.Router();
            router.add({ path: '/test/', method: 'get' });
            router.add({ path: '/test/{p}/end', method: 'get' });

            var routes = router.table();

            expect(routes.length).to.equal(2);
            expect(routes[0]).to.equal('/test/');
            done();
        });

        it('combines global and vhost routes', function (done) {

            var router = new Call.Router();

            router.add({ path: '/test/', method: 'get' });
            router.add({ path: '/test/', vhost: 'one.example.com', method: 'get' });
            router.add({ path: '/test/', vhost: 'two.example.com', method: 'get' });
            router.add({ path: '/test/{p}/end', method: 'get' });

            var routes = router.table();

            expect(routes.length).to.equal(4);
            done();
        });

        it('combines global and vhost routes and filters based on host', function (done) {

            var router = new Call.Router();

            router.add({ path: '/test/', method: 'get' });
            router.add({ path: '/test/', vhost: 'one.example.com', method: 'get' });
            router.add({ path: '/test/', vhost: 'two.example.com', method: 'get' });
            router.add({ path: '/test/{p}/end', method: 'get' });

            var routes = router.table('one.example.com');

            expect(routes.length).to.equal(3);
            done();
        });

        it('accepts a list of hosts', function (done) {

            var router = new Call.Router();

            router.add({ path: '/test/', method: 'get' });
            router.add({ path: '/test/', vhost: 'one.example.com', method: 'get' });
            router.add({ path: '/test/', vhost: 'two.example.com', method: 'get' });
            router.add({ path: '/test/{p}/end', method: 'get' });

            var routes = router.table(['one.example.com', 'two.example.com']);

            expect(routes.length).to.equal(4);
            done();
        });

        it('ignores unknown host', function (done) {

            var router = new Call.Router();

            router.add({ path: '/test/', method: 'get' });
            router.add({ path: '/test/', vhost: 'one.example.com', method: 'get' });
            router.add({ path: '/test/', vhost: 'two.example.com', method: 'get' });
            router.add({ path: '/test/{p}/end', method: 'get' });

            var routes = router.table('three.example.com');

            expect(routes.length).to.equal(2);
            done();
        });
    });
});
