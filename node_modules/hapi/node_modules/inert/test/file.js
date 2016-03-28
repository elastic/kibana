// Load modules

var ChildProcess = require('child_process');
var Fs = require('fs');
var Os = require('os');
var Path = require('path');
var Boom = require('boom');
var Code = require('code');
var Hapi = require('hapi');
var Hoek = require('hoek');
var Inert = require('..');
var Lab = require('lab');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('file', function () {

    describe('handler()', function () {

        var provisionServer = function (relativeTo, etagsCacheMaxSize) {

            var server = new Hapi.Server({ files: { etagsCacheMaxSize: etagsCacheMaxSize }, minimal: true });
            server.connection({ routes: { files: { relativeTo: relativeTo } } });
            server.register(Inert, Hoek.ignore);
            return server;
        };

        it('returns a file in the response with the correct headers', function (done) {

            var server = provisionServer(__dirname);
            var handler = function (request, reply) {

                reply.file('../package.json').code(499);
            };

            server.route({ method: 'GET', path: '/file', handler: handler });

            server.inject('/file', function (res) {

                expect(res.statusCode).to.equal(499);
                expect(res.payload).to.contain('hapi');
                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                expect(res.headers['content-disposition']).to.not.exist();
                done();
            });
        });

        it('returns a file using route relativeTo', function (done) {

            var server = provisionServer();
            var handler = function (request, reply) {

                reply.file('../package.json');
            };

            server.route({ method: 'GET', path: '/file', handler: handler, config: { files: { relativeTo: __dirname } } });

            server.inject('/file', function (res) {

                expect(res.payload).to.contain('hapi');
                done();
            });
        });

        it('returns a file in the response with the correct headers using cwd relative paths without content-disposition header', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { file: './package.json' } });

            server.inject('/', function (res) {

                expect(res.payload).to.contain('hapi');
                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                expect(res.headers['content-disposition']).to.not.exist();
                done();
            });
        });

        it('returns a file in the response with the inline content-disposition header when using route config', function (done) {

            var server = provisionServer('./');
            server.route({ method: 'GET', path: '/', handler: { file: { path: './package.json', mode: 'inline' } } });

            server.inject('/', function (res) {

                expect(res.payload).to.contain('hapi');
                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                expect(res.headers['content-disposition']).to.equal('inline; filename=package.json');
                done();
            });
        });

        it('returns a file in the response with the inline content-disposition header when using route config and overriding filename', function (done) {

            var server = provisionServer('./');
            server.route({ method: 'GET', path: '/', handler: { file: { path: './package.json', mode: 'inline', filename: 'attachment.json' } } });

            server.inject('/', function (res) {

                expect(res.payload).to.contain('hapi');
                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                expect(res.headers['content-disposition']).to.equal('inline; filename=attachment.json');
                done();
            });
        });

        it('returns a file in the response with the attachment content-disposition header when using route config', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { file: { path: './package.json', mode: 'attachment' } } });

            server.inject('/', function (res) {

                expect(res.payload).to.contain('hapi');
                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                expect(res.headers['content-disposition']).to.equal('attachment; filename=package.json');
                done();
            });
        });

        it('returns a file in the response with the attachment content-disposition header when using route config and overriding filename', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { file: { path: './package.json', mode: 'attachment', filename: 'attachment.json' } } });

            server.inject('/', function (res) {

                expect(res.payload).to.contain('hapi');
                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                expect(res.headers['content-disposition']).to.equal('attachment; filename=attachment.json');
                done();
            });
        });

        it('returns a file in the response without the content-disposition header when using route config mode false', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { file: { path: './package.json', mode: false } } });

            server.inject('/', function (res) {

                expect(res.payload).to.contain('hapi');
                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                expect(res.headers['content-disposition']).to.not.exist();
                done();
            });
        });

        it('returns a file with correct headers when using attachment mode', function (done) {

            var server = provisionServer(__dirname);
            var handler = function (request, reply) {

                reply.file(Path.join(__dirname, '..', 'package.json'), { mode: 'attachment' });
            };

            server.route({ method: 'GET', path: '/file', handler: handler });

            server.inject('/file', function (res) {

                expect(res.payload).to.contain('hapi');
                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                expect(res.headers['content-disposition']).to.equal('attachment; filename=package.json');
                done();
            });
        });

        it('returns a file with correct headers when using attachment mode and overriding the filename', function (done) {

            var server = provisionServer(__dirname);
            var handler = function (request, reply) {

                reply.file(Path.join(__dirname, '..', 'package.json'), { mode: 'attachment', filename: 'attachment.json' });
            };

            server.route({ method: 'GET', path: '/file', handler: handler });

            server.inject('/file', function (res) {

                expect(res.payload).to.contain('hapi');
                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                expect(res.headers['content-disposition']).to.equal('attachment; filename=attachment.json');
                done();
            });
        });

        it('returns a file with correct headers when using inline mode', function (done) {

            var server = provisionServer(__dirname);
            var handler = function (request, reply) {

                reply.file(Path.join(__dirname, '..', 'package.json'), { mode: 'inline' });
            };

            server.route({ method: 'GET', path: '/file', handler: handler });

            server.inject('/file', function (res) {

                expect(res.payload).to.contain('hapi');
                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                expect(res.headers['content-disposition']).to.equal('inline; filename=package.json');
                done();
            });
        });

        it('returns a file with correct headers when using inline mode and overriding filename', function (done) {

            var server = provisionServer(__dirname);
            var handler = function (request, reply) {

                reply.file(Path.join(__dirname, '..', 'package.json'), { mode: 'inline', filename: 'attachment.json' });
            };

            server.route({ method: 'GET', path: '/file', handler: handler });

            server.inject('/file', function (res) {

                expect(res.payload).to.contain('hapi');
                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                expect(res.headers['content-disposition']).to.equal('inline; filename=attachment.json');
                done();
            });
        });

        it('returns a 404 when the file is not found', function (done) {

            var server = provisionServer('/no/such/path/x1');

            server.route({ method: 'GET', path: '/filenotfound', handler: { file: 'nopes' } });

            server.inject('/filenotfound', function (res) {

                expect(res.statusCode).to.equal(404);
                done();
            });
        });

        it('returns a 403 when the file is a directory', function (done) {

            var server = provisionServer();

            server.route({ method: 'GET', path: '/filefolder', handler: { file: 'lib' } });

            server.inject('/filefolder', function (res) {

                expect(res.statusCode).to.equal(403);
                done();
            });
        });

        it('returns a file using the build-in handler config', function (done) {

            var server = provisionServer(__dirname);
            server.route({ method: 'GET', path: '/staticfile', handler: { file: Path.join(__dirname, '..', 'package.json') } });

            server.inject('/staticfile', function (res) {

                expect(res.payload).to.contain('hapi');
                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                done();
            });
        });

        it('returns a file using the file function with the build-in handler config', function (done) {

            var filenameFn = function (request) {

                return '../lib/' + request.params.file;
            };

            var server = provisionServer(__dirname);
            server.route({ method: 'GET', path: '/filefn/{file}', handler: { file: filenameFn } });

            server.inject('/filefn/index.js', function (res) {

                expect(res.payload).to.contain('// Load modules');
                expect(res.headers['content-type']).to.equal('application/javascript; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                done();
            });
        });

        it('returns a file in the response with the correct headers (relative path)', function (done) {

            var server = provisionServer('.');
            var relativeHandler = function (request, reply) {

                reply.file('./package.json');
            };

            server.route({ method: 'GET', path: '/relativefile', handler: relativeHandler });

            server.inject('/relativefile', function (res) {

                expect(res.payload).to.contain('hapi');
                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                done();
            });
        });

        it('returns a file using the built-in handler config (relative path)', function (done) {

            var server = provisionServer(__dirname);
            server.route({ method: 'GET', path: '/relativestaticfile', handler: { file: '../package.json' } });

            server.inject('/relativestaticfile', function (res) {

                expect(res.payload).to.contain('hapi');
                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                done();
            });
        });

        it('returns a file with default mime type', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { file: Path.join(__dirname, '..', 'LICENSE') } });

            server.inject('/', function (res) {

                expect(res.headers['content-type']).to.equal('application/octet-stream');
                done();
            });
        });

        it('returns a file in the response with the correct headers using custom mime type', function (done) {

            var server = provisionServer(__dirname);
            var handler = function (request, reply) {

                reply.file('../LICENSE').type('application/example');
            };

            server.route({ method: 'GET', path: '/file', handler: handler });

            server.inject('/file', function (res) {

                expect(res.headers['content-type']).to.equal('application/example');
                done();
            });
        });

        it('does not cache etags', function (done) {

            var server = provisionServer(__dirname, 0);
            server.route({ method: 'GET', path: '/note', handler: { file: './file/note.txt' } });

            server.inject('/note', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('Test');
                expect(res.headers.etag).to.not.exist();

                server.inject('/note', function (res2) {

                    expect(res2.statusCode).to.equal(200);
                    expect(res2.result).to.equal('Test');
                    expect(res2.headers.etag).to.not.exist();
                    done();
                });
            });
        });

        it('invalidates etags when file changes', function (done) {

            var server = provisionServer(__dirname);

            server.route({ method: 'GET', path: '/note', handler: { file: './file/note.txt' } });

            // No etag, never requested

            server.inject('/note', function (res1) {

                expect(res1.statusCode).to.equal(200);
                expect(res1.result).to.equal('Test');
                expect(res1.headers.etag).to.not.exist();

                // No etag, previously requested

                server.inject('/note', function (res2) {

                    expect(res2.statusCode).to.equal(200);
                    expect(res2.result).to.equal('Test');
                    expect(res2.headers.etag).to.exist();

                    var etag1 = res2.headers.etag;

                    expect(etag1.slice(0, 1)).to.equal('"');
                    expect(etag1.slice(-1)).to.equal('"');

                    // etag

                    server.inject({ url: '/note', headers: { 'if-none-match': etag1 } }, function (res3) {

                        expect(res3.statusCode).to.equal(304);
                        expect(res3.headers).to.not.include('content-length');
                        expect(res3.headers).to.include('etag');
                        expect(res3.headers).to.include('last-modified');

                        var fd1 = Fs.openSync(Path.join(__dirname, 'file', 'note.txt'), 'w');
                        Fs.writeSync(fd1, new Buffer('Test'), 0, 4);
                        Fs.closeSync(fd1);

                        // etag after file modified, content unchanged

                        server.inject({ url: '/note', headers: { 'if-none-match': etag1 } }, function (res4) {

                            expect(res4.statusCode).to.equal(200);
                            expect(res4.result).to.equal('Test');
                            expect(res4.headers.etag).to.not.exist();

                            // No etag, previously requested

                            server.inject({ url: '/note' }, function (res5) {

                                expect(res5.statusCode).to.equal(200);
                                expect(res5.result).to.equal('Test');
                                expect(res5.headers.etag).to.exist();

                                var etag2 = res5.headers.etag;
                                expect(etag1).to.equal(etag2);

                                var fd2 = Fs.openSync(Path.join(__dirname, 'file', 'note.txt'), 'w');
                                Fs.writeSync(fd2, new Buffer('Test1'), 0, 5);
                                Fs.closeSync(fd2);

                                // etag after file modified, content changed

                                server.inject({ url: '/note', headers: { 'if-none-match': etag2 } }, function (res6) {

                                    expect(res6.statusCode).to.equal(200);
                                    expect(res6.result).to.equal('Test1');
                                    expect(res6.headers.etag).to.not.exist();

                                    // No etag, previously requested

                                    server.inject('/note', function (res7) {

                                        expect(res7.statusCode).to.equal(200);
                                        expect(res7.result).to.equal('Test1');
                                        expect(res7.headers.etag).to.exist();

                                        var etag3 = res7.headers.etag;
                                        expect(etag1).to.not.equal(etag3);

                                        var fd3 = Fs.openSync(Path.join(__dirname, 'file', 'note.txt'), 'w');
                                        Fs.writeSync(fd3, new Buffer('Test'), 0, 4);
                                        Fs.closeSync(fd3);

                                        // No etag, content restored

                                        server.inject('/note', function (res8) {

                                            expect(res8.statusCode).to.equal(200);
                                            expect(res8.result).to.equal('Test');

                                            // No etag, previously requested

                                            server.inject('/note', function (res9) {

                                                expect(res9.statusCode).to.equal(200);
                                                expect(res9.result).to.equal('Test');
                                                expect(res9.headers.etag).to.exist();

                                                var etag4 = res9.headers.etag;
                                                expect(etag1).to.equal(etag4);

                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it('returns a 304 when the request has if-modified-since and the response has not been modified since (larger)', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/file', handler: { file: Path.join(__dirname, '..', 'package.json') } });

            server.inject('/file', function (res1) {

                var last = new Date(Date.parse(res1.headers['last-modified']) + 1000);
                server.inject({ url: '/file', headers: { 'if-modified-since': last.toUTCString() } }, function (res2) {

                    expect(res2.statusCode).to.equal(304);
                    expect(res2.headers).to.not.include('content-length');
                    expect(res2.headers).to.include('etag');
                    expect(res2.headers).to.include('last-modified');
                    done();
                });
            });
        });

        it('returns a 304 when the request has if-modified-since and the response has not been modified since (equal)', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/file', handler: { file: Path.join(__dirname, '..', 'package.json') } });

            server.inject('/file', function (res1) {

                server.inject({ url: '/file', headers: { 'if-modified-since': res1.headers['last-modified'] } }, function (res2) {

                    expect(res2.statusCode).to.equal(304);
                    expect(res2.headers).to.not.include('content-length');
                    expect(res2.headers).to.include('etag');
                    expect(res2.headers).to.include('last-modified');
                    done();
                });
            });
        });

        it('does not try to compute etag on 304 response', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/file', handler: { file: Path.join(__dirname, '..', 'package.json') } });

            var future = new Date(Date.now() + 1000);
            server.inject({ url: '/file', headers: { 'if-modified-since': future } }, function (res1) {

                expect(res1.statusCode).to.equal(304);
                expect(res1.headers).to.not.include('etag');

                server.inject({ url: '/file', headers: { 'if-modified-since': future } }, function (res2) {

                    expect(res2.statusCode).to.equal(304);
                    expect(res2.headers).to.not.include('etag');
                    done();
                });
            });
        });

        it('retains etag header on head', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/file', handler: { file: Path.join(__dirname, '..', 'package.json') } });

            server.inject('/file', function (res1) {

                server.inject({ method: 'HEAD', url: '/file' }, function (res2) {

                    expect(res2.statusCode).to.equal(200);
                    expect(res2.headers).to.include('etag');
                    expect(res2.headers).to.include('last-modified');
                    done();
                });
            });
        });

        it('changes etag when content encoding is used', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/file', handler: { file: Path.join(__dirname, '..', 'package.json') } });

            server.inject('/file', function (res1) {

                server.inject('/file', function (res2) {

                    expect(res2.statusCode).to.equal(200);
                    expect(res2.headers).to.include('etag');
                    expect(res2.headers).to.include('last-modified');

                    server.inject({ url: '/file', headers: { 'accept-encoding': 'gzip' } }, function (res3) {

                        expect(res3.statusCode).to.equal(200);
                        expect(res3.headers.vary).to.equal('accept-encoding');
                        expect(res3.headers.etag).to.not.equal(res2.headers.etag);
                        expect(res3.headers.etag).to.contain(res2.headers.etag.slice(0, -1) + '-');
                        expect(res3.headers['last-modified']).to.equal(res2.headers['last-modified']);
                        done();
                    });
                });
            });
        });

        it('returns valid http date responses in last-modified header', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/file', handler: { file: Path.join(__dirname, '..', 'package.json') } });

            server.inject('/file', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.headers['last-modified']).to.equal(Fs.statSync(Path.join(__dirname, '..', 'package.json')).mtime.toUTCString());
                done();
            });
        });

        it('returns 200 if if-modified-since is invalid', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/file', handler: { file: Path.join(__dirname, '..', 'package.json') } });

            server.inject({ url: '/file', headers: { 'if-modified-since': 'some crap' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('returns 200 if last-modified is invalid', function (done) {

            var server = provisionServer();
            server.route({
                method: 'GET',
                path: '/',
                handler: function (request, reply) {

                    reply('ok').header('last-modified', 'some crap');
                }
            });

            server.inject({ url: '/', headers: { 'if-modified-since': 'Fri, 28 Mar 2014 22:52:39 GMT' } }, function (res2) {

                expect(res2.statusCode).to.equal(200);
                done();
            });
        });

        it('closes file handlers when not reading file stream', { skip: process.platform === 'win32' }, function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/file', handler: { file: Path.join(__dirname, '..', 'package.json') } });

            server.inject('/file', function (res1) {

                server.inject({ url: '/file', headers: { 'if-modified-since': res1.headers.date } }, function (res2) {

                    expect(res2.statusCode).to.equal(304);
                    var cmd = ChildProcess.spawn('lsof', ['-p', process.pid]);
                    var lsof = '';
                    cmd.stdout.on('data', function (buffer) {

                        lsof += buffer.toString();
                    });

                    cmd.stdout.on('end', function () {

                        var count = 0;
                        var lines = lsof.split('\n');
                        for (var i = 0, il = lines.length; i < il; ++i) {
                            count += !!lines[i].match(/package.json/);
                        }

                        expect(count).to.equal(0);
                        done();
                    });

                    cmd.stdin.end();
                });
            });
        });

        it('closes file handlers when not using a manually open file stream', { skip: process.platform === 'win32' }, function (done) {

            var server = provisionServer();
            server.route({
                method: 'GET',
                path: '/file',
                handler: function (request, reply) {

                    reply(Fs.createReadStream(Path.join(__dirname, '..', 'package.json'))).header('etag', 'abc');
                }
            });

            server.inject('/file', function (res1) {

                server.inject({ url: '/file', headers: { 'if-none-match': res1.headers.etag } }, function (res2) {

                    expect(res2.statusCode).to.equal(304);
                    var cmd = ChildProcess.spawn('lsof', ['-p', process.pid]);
                    var lsof = '';
                    cmd.stdout.on('data', function (buffer) {

                        lsof += buffer.toString();
                    });

                    cmd.stdout.on('end', function () {

                        var count = 0;
                        var lines = lsof.split('\n');
                        for (var i = 0, il = lines.length; i < il; ++i) {
                            count += !!lines[i].match(/package.json/);
                        }

                        expect(count).to.equal(0);
                        done();
                    });

                    cmd.stdin.end();
                });
            });
        });

        it('returns a gzipped file in the response when the request accepts gzip', function (done) {

            var server = provisionServer(__dirname);
            var handler = function (request, reply) {

                reply.file(Path.join(__dirname, '..', 'package.json'));
            };

            server.route({ method: 'GET', path: '/file', handler: handler });

            server.inject({ url: '/file', headers: { 'accept-encoding': 'gzip' } }, function (res) {

                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-encoding']).to.equal('gzip');
                expect(res.headers['content-length']).to.not.exist();
                expect(res.payload).to.exist();
                done();
            });
        });

        it('returns a plain file when not compressible', function (done) {

            var server = provisionServer(__dirname);
            var handler = function (request, reply) {

                reply.file(Path.join(__dirname, 'file', 'image.png'));
            };

            server.route({ method: 'GET', path: '/file', handler: handler });

            server.inject({ url: '/file', headers: { 'accept-encoding': 'gzip' } }, function (res) {

                expect(res.headers['content-type']).to.equal('image/png');
                expect(res.headers['content-encoding']).to.not.exist();
                expect(res.headers['content-length']).to.equal(42010);
                expect(res.payload).to.exist();
                done();
            });
        });

        it('returns a deflated file in the response when the request accepts deflate', function (done) {

            var server = provisionServer(__dirname);
            var handler = function (request, reply) {

                reply.file(Path.join(__dirname, '..', 'package.json'));
            };

            server.route({ method: 'GET', path: '/file', handler: handler });

            server.inject({ url: '/file', headers: { 'accept-encoding': 'deflate' } }, function (res) {

                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-encoding']).to.equal('deflate');
                expect(res.headers['content-length']).to.not.exist();
                expect(res.payload).to.exist();
                done();
            });
        });

        it('returns a gzipped file using precompressed file', function (done) {

            var content = Fs.readFileSync('./test/file/image.png.gz');

            var server = provisionServer();
            server.route({ method: 'GET', path: '/file', handler: { file: { path: './test/file/image.png', lookupCompressed: true } } });

            server.inject({ url: '/file', headers: { 'accept-encoding': 'gzip' } }, function (res) {

                expect(res.headers['content-type']).to.equal('image/png');
                expect(res.headers['content-encoding']).to.equal('gzip');
                expect(res.headers['content-length']).to.equal(content.length);
                expect(res.rawPayload.length).to.equal(content.length);
                done();
            });
        });

        it('returns a gzipped file when precompressed file not found', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/file', handler: { file: { path: './test/file/note.txt', lookupCompressed: true } } });

            server.inject({ url: '/file', headers: { 'accept-encoding': 'gzip' } }, function (res) {

                expect(res.headers['content-encoding']).to.equal('gzip');
                expect(res.headers['content-length']).to.not.exist();
                expect(res.payload).to.exist();
                done();
            });
        });

        it('returns a 304 when using precompressed file and if-modified-since set', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/file', handler: { file: { path: './test/file/image.png', lookupCompressed: true } } });

            server.inject('/file', function (res1) {

                server.inject({ url: '/file', headers: { 'if-modified-since': res1.headers.date, 'accept-encoding': 'gzip' } }, function (res2) {

                    expect(res2.statusCode).to.equal(304);
                    done();
                });
            });
        });

        it('ignores precompressed file when content-encoding not requested', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/file', handler: { file: { path: './test/file/image.png', lookupCompressed: true } } });

            server.inject('/file', function (res) {

                expect(res.headers['content-type']).to.equal('image/png');
                expect(res.payload).to.exist();
                done();
            });
        });

        it('does not throw an error when adding a route with a parameter and function path', function (done) {

            var fn = function () {

                var server = provisionServer();
                server.route({ method: 'GET', path: '/fileparam/{path}', handler: { file: function () { } } });
                server.route({ method: 'GET', path: '/filepathparam/{path}', handler: { file: { path: function () { } } } });
            };

            expect(fn).to.not.throw();
            done();
        });

        it('responds correctly when file is removed while processing', function (done) {

            var filename = Hoek.uniqueFilename(Os.tmpDir()) + '.package.json';
            Fs.writeFileSync(filename, 'data');

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { file: filename } });
            server.ext('onPreResponse', function (request, reply) {

                Fs.unlinkSync(filename);
                return reply.continue();
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('responds correctly when file is changed while processing', function (done) {

            var filename = Hoek.uniqueFilename(Os.tmpDir()) + '.package.json';
            Fs.writeFileSync(filename, 'data');

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { file: filename } });
            server.ext('onPreResponse', function (request, reply) {

                var tempfile = filename + '~';
                if (process.platform === 'win32') {
                    // workaround to replace open file without a permission error
                    Fs.renameSync(filename, tempfile);
                    Fs.writeFileSync(filename, 'database');
                    Fs.unlinkSync(tempfile);
                } else {
                    // atomic file replace
                    Fs.writeFileSync(tempfile, 'database');
                    Fs.renameSync(tempfile, filename);
                }

                return reply.continue();
            });

            server.inject('/', function (res) {

                Fs.unlinkSync(filename);

                expect(res.statusCode).to.equal(200);
                expect(res.headers['content-length']).to.equal(4);
                expect(res.payload).to.equal('data');
                done();
            });
        });

        it('does not open file stream on 304', function (done) {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/file', handler: { file: Path.join(__dirname, '..', 'package.json') } });

            server.inject('/file', function (res1) {

                server.ext('onPreResponse', function (request, reply) {

                    request.response._marshall = function () {

                        throw new Error('not called');
                    };

                    return reply.continue();
                });

                server.inject({ url: '/file', headers: { 'if-modified-since': res1.headers.date } }, function (res2) {

                    expect(res2.statusCode).to.equal(304);
                    done();
                });
            });
        });

        it('returns error when aborted while processing', function (done) {

            var filename = Hoek.uniqueFilename(Os.tmpDir()) + '.package.json';
            Fs.writeFileSync(filename, 'data');

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { file: filename } });
            server.ext('onPreResponse', function (request, reply) {

                reply(Boom.internal('crapping out'));
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('returns error when stat fails unexpectedly', function (done) {

            var filename = Hoek.uniqueFilename(Os.tmpDir()) + '.package.json';
            Fs.writeFileSync(filename, 'data');

            var orig = Fs.fstat;
            Fs.fstat = function (fd, callback) {        // can return EIO error

                Fs.fstat = orig;
                callback(new Error('failed'));
            };


            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { file: filename } });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('returns error when open fails unexpectedly', function (done) {

            var filename = Hoek.uniqueFilename(Os.tmpDir()) + '.package.json';
            Fs.writeFileSync(filename, 'data');

            var orig = Fs.open;
            Fs.open = function () {        // can return EMFILE error

                Fs.open = orig;
                var callback = arguments[arguments.length - 1];
                callback(new Error('failed'));
            };

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { file: filename } });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('returns a 403 when missing file read permission', function (done) {

            var filename = Hoek.uniqueFilename(Os.tmpDir()) + '.package.json';
            Fs.writeFileSync(filename, 'data');

            var retainedFd;
            if (process.platform === 'win32') {
                // make a permissionless file by unlinking an open file
                retainedFd = Fs.openSync(filename, 'r');
                Fs.unlinkSync(filename);
            } else {
                Fs.chmodSync(filename, 0);
            }

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { file: filename } });

            server.inject('/', function (res1) {

                var orig = Fs.open;
                Fs.open = function (path, mode, callback) {        // fake alternate permission error

                    Fs.open = orig;
                    return Fs.open(path, mode, function (err, fd) {

                        if (err) {
                            if (err.code === 'EACCES') {
                                err.code = 'EPERM';
                                err.errno = -1;
                            } else if (err.code === 'EPERM') {
                                err.code = 'EACCES';
                                err.errno = -13;
                            }
                        }

                        return callback(err, fd);
                    });
                };

                server.inject('/', function (res2) {

                    // cleanup
                    if (typeof retainedFd === 'number') {
                        Fs.closeSync(retainedFd);
                    } else {
                        Fs.unlinkSync(filename);
                    }

                    expect(res1.statusCode).to.equal(403);
                    expect(res2.statusCode).to.equal(403);
                    done();
                });
            });
        });

        describe('response range', function () {

            it('returns a subset of a file (start)', function (done) {

                var server = provisionServer();
                server.route({ method: 'GET', path: '/file', handler: { file: { path: Path.join(__dirname, 'file/image.png') } } });

                server.inject({ url: '/file', headers: { 'range': 'bytes=0-4' } }, function (res) {

                    expect(res.statusCode).to.equal(206);
                    expect(res.headers['content-length']).to.equal(5);
                    expect(res.headers['content-range']).to.equal('bytes 0-4/42010');
                    expect(res.headers['accept-ranges']).to.equal('bytes');
                    expect(res.rawPayload).to.deep.equal(new Buffer('\x89PNG\r', 'ascii'));
                    done();
                });
            });

            it('returns a subset of a file (middle)', function (done) {

                var server = provisionServer();
                server.route({ method: 'GET', path: '/file', handler: { file: { path: Path.join(__dirname, 'file/image.png') } } });

                server.inject({ url: '/file', headers: { 'range': 'bytes=1-5' } }, function (res) {

                    expect(res.statusCode).to.equal(206);
                    expect(res.headers['content-length']).to.equal(5);
                    expect(res.headers['content-range']).to.equal('bytes 1-5/42010');
                    expect(res.headers['accept-ranges']).to.equal('bytes');
                    expect(res.rawPayload).to.deep.equal(new Buffer('PNG\r\n', 'ascii'));
                    done();
                });
            });

            it('returns a subset of a file (-to)', function (done) {

                var server = provisionServer();
                server.route({ method: 'GET', path: '/file', handler: { file: { path: Path.join(__dirname, 'file/image.png') } } });

                server.inject({ url: '/file', headers: { 'range': 'bytes=-5' } }, function (res) {

                    expect(res.statusCode).to.equal(206);
                    expect(res.headers['content-length']).to.equal(5);
                    expect(res.headers['content-range']).to.equal('bytes 42005-42009/42010');
                    expect(res.headers['accept-ranges']).to.equal('bytes');
                    expect(res.rawPayload).to.deep.equal(new Buffer('D\xAEB\x60\x82', 'ascii'));
                    done();
                });
            });

            it('returns a subset of a file (from-)', function (done) {

                var server = provisionServer();
                server.route({ method: 'GET', path: '/file', handler: { file: { path: Path.join(__dirname, 'file/image.png') } } });

                server.inject({ url: '/file', headers: { 'range': 'bytes=42005-' } }, function (res) {

                    expect(res.statusCode).to.equal(206);
                    expect(res.headers['content-length']).to.equal(5);
                    expect(res.headers['content-range']).to.equal('bytes 42005-42009/42010');
                    expect(res.headers['accept-ranges']).to.equal('bytes');
                    expect(res.rawPayload).to.deep.equal(new Buffer('D\xAEB\x60\x82', 'ascii'));
                    done();
                });
            });

            it('returns a subset of a file (beyond end)', function (done) {

                var server = provisionServer();
                server.route({ method: 'GET', path: '/file', handler: { file: { path: Path.join(__dirname, 'file/image.png') } } });

                server.inject({ url: '/file', headers: { 'range': 'bytes=42005-42011' } }, function (res) {

                    expect(res.statusCode).to.equal(206);
                    expect(res.headers['content-length']).to.equal(5);
                    expect(res.headers['content-range']).to.equal('bytes 42005-42009/42010');
                    expect(res.headers['accept-ranges']).to.equal('bytes');
                    expect(res.rawPayload).to.deep.equal(new Buffer('D\xAEB\x60\x82', 'ascii'));
                    done();
                });
            });

            it('returns a subset of a file (if-range)', function (done) {

                var server = provisionServer();
                server.route({ method: 'GET', path: '/file', handler: { file: { path: Path.join(__dirname, 'file/image.png') } } });

                server.inject('/file', function (res) {

                    server.inject('/file', function (res1) {

                        server.inject({ url: '/file', headers: { 'range': 'bytes=42005-42011', 'if-range': res1.headers.etag } }, function (res2) {

                            expect(res2.statusCode).to.equal(206);
                            expect(res2.headers['content-length']).to.equal(5);
                            expect(res2.headers['content-range']).to.equal('bytes 42005-42009/42010');
                            expect(res2.headers['accept-ranges']).to.equal('bytes');
                            expect(res2.rawPayload).to.deep.equal(new Buffer('D\xAEB\x60\x82', 'ascii'));
                            done();
                        });
                    });
                });
            });

            it('returns 200 on incorrect if-range', function (done) {

                var server = provisionServer();
                server.route({ method: 'GET', path: '/file', handler: { file: { path: Path.join(__dirname, 'file/image.png') } } });

                server.inject({ url: '/file', headers: { 'range': 'bytes=42005-42011', 'if-range': 'abc' } }, function (res2) {

                    expect(res2.statusCode).to.equal(200);
                    done();
                });
            });

            it('returns 416 on invalid range (unit)', function (done) {

                var server = provisionServer();
                server.route({ method: 'GET', path: '/file', handler: { file: { path: Path.join(__dirname, 'file/image.png') } } });

                server.inject({ url: '/file', headers: { 'range': 'horses=1-5' } }, function (res) {

                    expect(res.statusCode).to.equal(416);
                    expect(res.headers['content-range']).to.equal('bytes */42010');
                    done();
                });
            });

            it('returns 416 on invalid range (inversed)', function (done) {

                var server = provisionServer();
                server.route({ method: 'GET', path: '/file', handler: { file: { path: Path.join(__dirname, 'file/image.png') } } });

                server.inject({ url: '/file', headers: { 'range': 'bytes=5-1' } }, function (res) {

                    expect(res.statusCode).to.equal(416);
                    expect(res.headers['content-range']).to.equal('bytes */42010');
                    done();
                });
            });

            it('returns 416 on invalid range (format)', function (done) {

                var server = provisionServer();
                server.route({ method: 'GET', path: '/file', handler: { file: { path: Path.join(__dirname, 'file/image.png') } } });

                server.inject({ url: '/file', headers: { 'range': 'bytes 1-5' } }, function (res) {

                    expect(res.statusCode).to.equal(416);
                    expect(res.headers['content-range']).to.equal('bytes */42010');
                    done();
                });
            });

            it('returns 416 on invalid range (empty range)', function (done) {

                var server = provisionServer();
                server.route({ method: 'GET', path: '/file', handler: { file: { path: Path.join(__dirname, 'file/image.png') } } });

                server.inject({ url: '/file', headers: { 'range': 'bytes=-' } }, function (res) {

                    expect(res.statusCode).to.equal(416);
                    expect(res.headers['content-range']).to.equal('bytes */42010');
                    done();
                });
            });

            it('returns 200 on multiple ranges', function (done) {

                var server = provisionServer();
                server.route({ method: 'GET', path: '/file', handler: { file: { path: Path.join(__dirname, 'file/image.png') } } });

                server.inject({ url: '/file', headers: { 'range': 'bytes=1-5,7-10' } }, function (res) {

                    expect(res.statusCode).to.equal(200);
                    expect(res.headers['content-length']).to.equal(42010);
                    done();
                });
            });

            it('returns a subset of a file using precompressed file', function (done) {

                var server = provisionServer();
                server.route({ method: 'GET', path: '/file', handler: { file: { path: Path.join(__dirname, 'file/image.png'), lookupCompressed: true } } });
                server.inject({ url: '/file', headers: { 'range': 'bytes=10-18', 'accept-encoding': 'gzip' } }, function (res) {

                    expect(res.statusCode).to.equal(206);
                    expect(res.headers['content-encoding']).to.equal('gzip');
                    expect(res.headers['content-length']).to.equal(9);
                    expect(res.headers['content-range']).to.equal('bytes 10-18/41936');
                    expect(res.headers['accept-ranges']).to.equal('bytes');
                    expect(res.payload).to.equal('image.png');
                    done();
                });
            });

            it('never computes etags', function (done) {

                var server = provisionServer();
                server.route({ method: 'GET', path: '/file', handler: { file: { path: Path.join(__dirname, 'file/image.png') } } });

                server.inject({ url: '/file', headers: { 'range': 'bytes=0-4' } }, function (res1) {

                    expect(res1.statusCode).to.equal(206);
                    expect(res1.headers.etag).to.not.exist();
                    server.inject('/file', function (res2) {

                        expect(res2.statusCode).to.equal(200);
                        expect(res2.headers.etag).to.not.exist();
                        done();
                    });
                });
            });
        });

        it('has not leaked file descriptors', { skip: process.platform === 'win32' }, function (done) {

            // validate that all descriptors has been closed
            var cmd = ChildProcess.spawn('lsof', ['-p', process.pid]);
            var lsof = '';
            cmd.stdout.on('data', function (buffer) {

                lsof += buffer.toString();
            });

            cmd.stdout.on('end', function () {

                var count = 0;
                var lines = lsof.split('\n');
                for (var i = 0, il = lines.length; i < il; ++i) {
                    count += !!lines[i].match(/package.json/);
                }

                expect(count).to.equal(0);
                done();
            });

            cmd.stdin.end();
        });
    });
});
