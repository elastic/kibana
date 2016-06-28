// Load modules

var Domain = require('domain');
var Fs = require('fs');
var Http = require('http');
var Path = require('path');
var Stream = require('stream');
var Zlib = require('zlib');
var Code = require('code');
var FormData = require('form-data');
var Hoek = require('hoek');
var Lab = require('lab');
var Subtext = require('..');
var Wreck = require('wreck');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('parse()', function () {

    it('returns a raw body', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {};

        Subtext.parse(request, null, { parse: false, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.mime).to.equal('application/json');
            expect(Buffer.isBuffer(parsed.payload)).to.be.true();
            expect(parsed.payload.toString()).to.equal(payload);
            done();
        });
    });

    it('returns a parsed body', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {};

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.mime).to.equal('application/json');
            expect(parsed.payload).to.deep.equal(JSON.parse(payload));
            done();
        });
    });

    it('returns a parsed body as stream', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {};

        Subtext.parse(request, null, { parse: true, output: 'stream' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.mime).to.equal('application/json');
            Wreck.read(parsed.payload, null, function (err, result) {

                expect(result.toString()).to.equal(payload);
                done();
            });
        });
    });

    it('returns a raw body as stream', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {};

        Subtext.parse(request, null, { parse: false, output: 'stream' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.mime).to.equal('application/json');
            Wreck.read(parsed.payload, null, function (err, result) {

                expect(result.toString()).to.equal(payload);
                done();
            });
        });
    });

    it('returns a parsed body (json-derived media type)', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'application/json-patch+json'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.mime).to.equal('application/json-patch+json');
            expect(parsed.payload).to.deep.equal(JSON.parse(payload));
            done();
        });
    });

    it('returns an empty parsed body', function (done) {

        var payload = '';
        var request = Wreck.toReadableStream(payload);
        request.headers = {};

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.mime).to.equal('application/json');
            expect(parsed.payload).to.deep.equal({});
            done();
        });
    });

    it('errors on invalid content type header', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'steve'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.exist();
            expect(err.message).to.equal('Invalid content-type header');
            done();
        });
    });

    it('errors on unsupported content type', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'james/bond'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.exist();
            expect(err.message).to.equal('Unsupported Media Type');
            done();
        });
    });

    it('errors when content-length header greater than maxBytes', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-length': '50'
        };

        Subtext.parse(request, null, { parse: false, output: 'data', maxBytes: 10 }, function (err, parsed) {

            expect(err).to.exist();
            expect(err.message).to.equal('Payload content length greater than maximum allowed: 10');
            done();
        });
    });

    it('limits maxBytes when content-length header missing', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {};
        request.destroy = function () { };

        Subtext.parse(request, null, { parse: false, output: 'data', maxBytes: 10 }, function (err, parsed) {

            expect(err).to.exist();
            expect(err.message).to.equal('Payload content length greater than maximum allowed: 10');
            done();
        });
    });

    it('errors on invalid JSON payload', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"';
        var request = Wreck.toReadableStream(payload);
        request.headers = {};

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.exist();
            expect(err.message).to.equal('Invalid request payload JSON format');
            done();
        });
    });

    it('peeks at the unparsed stream of a parsed body', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {};

        var raw = '';
        var tap = new Stream.Transform();
        tap._transform = function (chunk, encoding, callback) {

            raw += chunk.toString();
            this.push(chunk, encoding);
            callback();
        };

        Subtext.parse(request, tap, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.payload).to.deep.equal(JSON.parse(payload));
            expect(raw).to.equal(payload);
            done();
        });
    });

    it('peeks at the unparsed stream of an unparsed body', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {};

        var raw = '';
        var tap = new Stream.Transform();
        tap._transform = function (chunk, encoding, callback) {

            raw += chunk.toString();
            this.push(chunk, encoding);
            callback();
        };

        Subtext.parse(request, tap, { parse: false, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.payload.toString()).to.deep.equal(payload);
            expect(raw).to.equal(payload);
            done();
        });
    });

    it('saves file', function (done) {

        var request = Wreck.toReadableStream('payload');
        request.headers = {};

        Subtext.parse(request, null, { parse: false, output: 'file' }, function (err, parsed) {

            expect(err).to.not.exist();

            var receivedContents = Fs.readFileSync(parsed.payload.path);
            Fs.unlinkSync(parsed.payload.path);
            expect(receivedContents.toString()).to.equal('payload');
            done();
        });
    });

    it('saves a file after content decoding', function (done) {

        var path = Path.join(__dirname, './file/image.jpg');
        var sourceContents = Fs.readFileSync(path);
        var stats = Fs.statSync(path);

        Zlib.gzip(sourceContents, function (err, compressed) {

            var request = Wreck.toReadableStream(compressed);
            request.headers = {
                'content-encoding': 'gzip'
            };

            Subtext.parse(request, null, { parse: true, output: 'file' }, function (err, parsed) {

                expect(err).to.not.exist();

                var receivedContents = Fs.readFileSync(parsed.payload.path);
                Fs.unlinkSync(parsed.payload.path);
                expect(receivedContents).to.deep.equal(sourceContents);
                expect(parsed.payload.bytes).to.equal(stats.size);
                done();
            });
        });
    });

    it('saves a file ignoring content decoding when parse is false', function (done) {

        var path = Path.join(__dirname, './file/image.jpg');
        var sourceContents = Fs.readFileSync(path);

        Zlib.gzip(sourceContents, function (err, compressed) {

            var request = Wreck.toReadableStream(compressed);
            request.headers = {
                'content-encoding': 'gzip'
            };

            Subtext.parse(request, null, { parse: false, output: 'file' }, function (err, parsed) {

                expect(err).to.not.exist();

                var receivedContents = Fs.readFileSync(parsed.payload.path);
                Fs.unlinkSync(parsed.payload.path);
                expect(receivedContents).to.deep.equal(compressed);
                done();
            });
        });
    });

    it('errors on invalid upload directory (parse false)', function (done) {

        var request = Wreck.toReadableStream('payload');
        request.headers = {};

        Subtext.parse(request, null, { parse: false, output: 'file', uploads: '/a/b/c/no/such/folder' }, function (err, parsed) {

            expect(err).to.exist();
            expect(err.message).to.contain('ENOENT');
            done();
        });
    });

    it('errors on invalid upload directory (parse true)', function (done) {

        var request = Wreck.toReadableStream('payload');
        request.headers = {};

        Subtext.parse(request, null, { parse: true, output: 'file', uploads: '/a/b/c/no/such/folder' }, function (err, parsed) {

            expect(err).to.exist();
            expect(err.message).to.contain('ENOENT');
            done();
        });
    });

    it('processes application/octet-stream', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'application/octet-stream'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.mime).to.equal('application/octet-stream');
            expect(Buffer.isBuffer(parsed.payload)).to.be.true();
            expect(parsed.payload.toString()).to.equal(payload);
            done();
        });
    });

    it('overrides content-type', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'text/plain'
        };

        Subtext.parse(request, null, { parse: true, output: 'data', override: 'application/json' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.mime).to.equal('application/json');
            expect(parsed.payload).to.deep.equal(JSON.parse(payload));
            done();
        });
    });

    it('returns a parsed text payload', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'text/plain'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.mime).to.equal('text/plain');
            expect(parsed.payload).to.deep.equal(payload);
            done();
        });
    });

    it('parses an allowed content-type', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'text/plain'
        };

        Subtext.parse(request, null, { parse: true, output: 'data', allow: 'text/plain' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.mime).to.equal('text/plain');
            expect(parsed.payload).to.deep.equal(payload);
            done();
        });
    });

    it('parses an allowed content-type (array)', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'text/plain'
        };

        Subtext.parse(request, null, { parse: true, output: 'data', allow: ['text/plain'] }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.mime).to.equal('text/plain');
            expect(parsed.payload).to.deep.equal(payload);
            done();
        });
    });

    it('errors on an unallowed content-type', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'text/plain'
        };

        Subtext.parse(request, null, { parse: true, output: 'data', allow: 'application/json' }, function (err, parsed) {

            expect(err).to.exist();
            expect(err.message).to.equal('Unsupported Media Type');
            done();
        });
    });

    it('errors on an unallowed content-type (array)', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'text/plain'
        };

        Subtext.parse(request, null, { parse: true, output: 'data', allow: ['application/json'] }, function (err, parsed) {

            expect(err).to.exist();
            expect(err.message).to.equal('Unsupported Media Type');
            done();
        });
    });

    it('parses form encoded payload', function (done) {

        var payload = 'x=abc';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'application/x-www-form-urlencoded'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.mime).to.equal('application/x-www-form-urlencoded');
            expect(parsed.payload.x).to.equal('abc');
            done();
        });
    });

    it('parses form encoded payload (array keys)', function (done) {

        var payload = 'x[y]=1&x[z]=2';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'application/x-www-form-urlencoded'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.mime).to.equal('application/x-www-form-urlencoded');
            expect(parsed.payload).to.deep.equal({ x: { y: '1', z: '2' } });
            done();
        });
    });

    it('parses form encoded payload (with qs arraylimit set to 0)', function (done) {

        var payload = 'x[0]=1&x[100]=2';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'application/x-www-form-urlencoded'
        };

        Subtext.parse(request, null, { parse: true, output: 'data', qs: { arrayLimit: 0 } }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.mime).to.equal('application/x-www-form-urlencoded');
            expect(parsed.payload).to.deep.equal({ x: { 0: '1', 100: '2' } });
            done();
        });
    });

    it('parses form encoded payload (with qs arraylimit set to 30) as flat zero indexed array', function (done) {

        var payload = 'x[0]=0&x[1]=1&x[2]=2&x[3]=3&x[4]=4&x[5]=5&x[6]=6&x[7]=7&x[8]=8&x[9]=9&x[10]=10&x[11]=11&x[12]=12&x[13]=13&x[14]=14&x[15]=15&x[16]=16&x[17]=17&x[18]=18&x[19]=19&x[20]=20&x[21]=21&x[22]=22&x[23]=23&x[24]=24&x[25]=25&x[26]=26&x[27]=27&x[28]=28&x[29]=29&';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'application/x-www-form-urlencoded'
        };

        Subtext.parse(request, null, { parse: true, output: 'data', qs: { arrayLimit: 30 } }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.mime).to.equal('application/x-www-form-urlencoded');
            expect(parsed.payload).to.deep.equal({ x: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29'] });
            done();
        });
    });

    it('errors on malformed zipped payload', function (done) {

        var payload = '7d8d78347h8347d58w347hd58w374d58w37h5d8w37hd4';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-encoding': 'gzip'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.exist();
            expect(err.message).to.equal('Invalid compressed payload');
            done();
        });
    });

    it('errors on malformed zipped payload (parse gunzip only)', function (done) {

        var payload = '7d8d78347h8347d58w347hd58w374d58w37h5d8w37hd4';
        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-encoding': 'gzip'
        };

        Subtext.parse(request, null, { parse: 'gunzip', output: 'data' }, function (err, parsed) {

            expect(err).to.exist();
            expect(err.message).to.equal('Invalid compressed payload');
            done();
        });
    });

    it('parses a gzipped payload', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        Zlib.gzip(payload, function (err, compressed) {

            var request = Wreck.toReadableStream(compressed);
            request.headers = {
                'content-encoding': 'gzip'
            };

            Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

                expect(err).to.not.exist();
                expect(parsed.payload).to.deep.equal(JSON.parse(payload));
                done();
            });
        });
    });

    it('unzips payload without parsing', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        Zlib.gzip(payload, function (err, compressed) {

            var request = Wreck.toReadableStream(compressed);
            request.headers = {
                'content-encoding': 'gzip'
            };

            Subtext.parse(request, null, { parse: 'gunzip', output: 'data' }, function (err, parsed) {

                expect(err).to.not.exist();
                expect(parsed.payload.toString()).to.equal(payload);
                done();
            });
        });
    });

    it('parses a deflated payload', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        Zlib.deflate(payload, function (err, compressed) {

            var request = Wreck.toReadableStream(compressed);
            request.headers = {
                'content-encoding': 'deflate'
            };

            Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

                expect(err).to.not.exist();
                expect(parsed.payload).to.deep.equal(JSON.parse(payload));
                done();
            });
        });
    });

    it('deflates payload without parsing', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        Zlib.deflate(payload, function (err, compressed) {

            var request = Wreck.toReadableStream(compressed);
            request.headers = {
                'content-encoding': 'deflate'
            };

            Subtext.parse(request, null, { parse: 'gunzip', output: 'data' }, function (err, parsed) {

                expect(err).to.not.exist();
                expect(parsed.payload.toString()).to.equal(payload);
                done();
            });
        });
    });

    it('parses a multipart payload', function (done) {

        var payload =
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'First\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'Second\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'Third\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="field1"\r\n' +
                '\r\n' +
                'Joe Blow\r\nalmost tricked you!\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="field1"\r\n' +
                '\r\n' +
                'Repeated name segment\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="pics"; filename="file1.txt"\r\n' +
                'Content-Type: text/plain\r\n' +
                '\r\n' +
                '... contents of file1.txt ...\r\r\n' +
                '--AaB03x--\r\n';

        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'multipart/form-data; boundary=AaB03x'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.payload).to.deep.equal({
                x: ['First', 'Second', 'Third'],
                field1: ['Joe Blow\r\nalmost tricked you!', 'Repeated name segment'],
                pics: '... contents of file1.txt ...\r'
            });

            done();
        });
    });

    it('parses a multipart payload with qs arraylimit set to zero', function (done) {

        var payload =
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x[0]"\r\n' +
                '\r\n' +
                'First\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x[1]"\r\n' +
                '\r\n' +
                'Second\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x[30]"\r\n' +
                '\r\n' +
                'Third\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="field1"\r\n' +
                '\r\n' +
                'Joe Blow\r\nalmost tricked you!\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="field1"\r\n' +
                '\r\n' +
                'Repeated name segment\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="pics"; filename="file1.txt"\r\n' +
                'Content-Type: text/plain\r\n' +
                '\r\n' +
                '... contents of file1.txt ...\r\r\n' +
                '--AaB03x--\r\n';

        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'multipart/form-data; boundary=AaB03x'
        };

        Subtext.parse(request, null, { parse: true, output: 'data', qs: { arrayLimit: 0 } }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.payload).to.deep.equal({
                x: { '0': 'First', '1': 'Second', '30': 'Third' },
                field1: ['Joe Blow\r\nalmost tricked you!', 'Repeated name segment'],
                pics: '... contents of file1.txt ...\r'
            });

            done();
        });
    });

    it('parses a multipart payload', function (done) {

        var payload =
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'First\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'Second\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'Third\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="field1"\r\n' +
                '\r\n' +
                'Joe Blow\r\nalmost tricked you!\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="field1"\r\n' +
                '\r\n' +
                'Repeated name segment\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="pics"; filename="file1.txt"\r\n' +
                'Content-Type: text/plain\r\n' +
                '\r\n' +
                '... contents of file1.txt ...\r\r\n' +
                '--AaB03x--\r\n';

        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'multipart/form-data; boundary=AaB03x'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.payload).to.deep.equal({
                x: ['First', 'Second', 'Third'],
                field1: ['Joe Blow\r\nalmost tricked you!', 'Repeated name segment'],
                pics: '... contents of file1.txt ...\r'
            });

            done();
        });
    });

    it('parses a multipart payload (empty file)', function (done) {

        var payload =
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="pics"; filename="file1.txt"\r\n' +
                'Content-Type: text/plain\r\n' +
                '\r\n' +
                '\r\n' +
                '--AaB03x--\r\n';

        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'multipart/form-data; boundary=AaB03x'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.payload.pics).to.deep.equal({});
            done();
        });
    });

    it('errors on an invalid multipart header (missing boundary)', function (done) {

        var payload =
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'First\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'Second\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'Third\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="field1"\r\n' +
                '\r\n' +
                'Joe Blow\r\nalmost tricked you!\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="field1"\r\n' +
                '\r\n' +
                'Repeated name segment\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="pics"; filename="file1.txt"\r\n' +
                'Content-Type: text/plain\r\n' +
                '\r\n' +
                '... contents of file1.txt ...\r\r\n' +
                '--AaB03x--\r\n';

        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'multipart/form-data'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.exist();
            expect(err.message).to.equal('Invalid content-type header: multipart missing boundary');
            done();
        });
    });

    it('errors on an invalid multipart payload', function (done) {

        var payload =
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'First\r\n';

        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'multipart/form-data; boundary=AaB03x'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.exist();
            expect(err.message).to.equal('Invalid multipart payload format');
            done();
        });
    });

    it('parses file without content-type', function (done) {

        var payload =
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="pics"; filename="file1.txt"\r\n' +
                '\r\n' +
                '... contents of file1.txt ...\r\r\n' +
                '--AaB03x--\r\n';

        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'multipart/form-data; boundary="AaB03x"'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.payload.pics.toString()).to.equal('... contents of file1.txt ...\r');
            done();
        });
    });

    it('errors on invalid uploads folder while processing multipart payload', function (done) {

        var payload =
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="pics"; filename="file1.txt"\r\n' +
                '\r\n' +
                '... contents of file1.txt ...\r\r\n' +
                '--AaB03x--\r\n';

        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'multipart/form-data; boundary="AaB03x"'
        };

        Subtext.parse(request, null, { parse: true, output: 'file', uploads: '/no/such/folder/a/b/c' }, function (err, parsed) {

            expect(err).to.exist();
            expect(err.message).to.contain('/no/such/folder/a/b/c');
            done();
        });
    });

    it('parses multiple files as streams', function (done) {

        var payload =
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="files"; filename="file1.txt"\r\n' +
                'Content-Type: text/plain\r\n' +
                '\r\n' +
                'one\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="files"; filename="file2.txt"\r\n' +
                'Content-Type: text/plain\r\n' +
                '\r\n' +
                'two\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="files"; filename="file3.txt"\r\n' +
                'Content-Type: text/plain\r\n' +
                '\r\n' +
                'three\r\n' +
                '--AaB03x--\r\n';

        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'multipart/form-data; boundary="AaB03x"'
        };

        Subtext.parse(request, null, { parse: true, output: 'stream' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.payload.files[0].hapi).to.deep.equal({ filename: 'file1.txt', headers: { 'content-disposition': 'form-data; name="files"; filename="file1.txt"', 'content-type': 'text/plain' } });
            expect(parsed.payload.files[1].hapi).to.deep.equal({ filename: 'file2.txt', headers: { 'content-disposition': 'form-data; name="files"; filename="file2.txt"', 'content-type': 'text/plain' } });
            expect(parsed.payload.files[2].hapi).to.deep.equal({ filename: 'file3.txt', headers: { 'content-disposition': 'form-data; name="files"; filename="file3.txt"', 'content-type': 'text/plain' } });

            Wreck.read(parsed.payload.files[1], null, function (err, payload2) {

                Wreck.read(parsed.payload.files[0], null, function (err, payload1) {

                    Wreck.read(parsed.payload.files[2], null, function (err, payload3) {

                        expect(payload1.toString()).to.equal('one');
                        expect(payload2.toString()).to.equal('two');
                        expect(payload3.toString()).to.equal('three');
                        done();
                    });
                });
            });
        });
    });

    it('parses a multipart file as file', function (done) {

        var path = Path.join(__dirname, './file/image.jpg');
        var stats = Fs.statSync(path);

        var form = new FormData();
        form.append('my_file', Fs.createReadStream(path));
        form.headers = form.getHeaders();

        Subtext.parse(form, null, { parse: true, output: 'file' }, function (err, parsed) {

            expect(err).to.not.exist();

            expect(parsed.payload.my_file.bytes).to.equal(stats.size);

            var sourceContents = Fs.readFileSync(path);
            var receivedContents = Fs.readFileSync(parsed.payload.my_file.path);
            Fs.unlinkSync(parsed.payload.my_file.path);
            expect(sourceContents).to.deep.equal(receivedContents);
            done();
        });
    });

    it('parses multiple files as files', function (done) {

        var path = Path.join(__dirname, './file/image.jpg');
        var stats = Fs.statSync(path);

        var form = new FormData();
        form.append('file1', Fs.createReadStream(path));
        form.append('file2', Fs.createReadStream(path));
        form.headers = form.getHeaders();

        Subtext.parse(form, null, { parse: true, output: 'file' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.payload.file1.bytes).to.equal(stats.size);
            expect(parsed.payload.file2.bytes).to.equal(stats.size);
            Fs.unlinkSync(parsed.payload.file1.path);
            Fs.unlinkSync(parsed.payload.file2.path);
            done();
        });
    });

    it('parses multiple files while waiting for last file to be written', { parallel: false }, function (done) {

        var path = Path.join(__dirname, './file/image.jpg');
        var stats = Fs.statSync(path);

        var orig = Fs.createWriteStream;
        Fs.createWriteStream = function () {        // Make the first file write happen faster by bypassing the disk

            Fs.createWriteStream = orig;
            var stream = new Stream.Writable();
            stream._write = function (chunk, encoding, callback) {

                callback();
            };
            stream.once('finish', function () {

                stream.emit('close');
            });
            return stream;
        };

        var form = new FormData();
        form.append('a', Fs.createReadStream(path));
        form.append('b', Fs.createReadStream(path));
        form.headers = form.getHeaders();

        Subtext.parse(form, null, { parse: true, output: 'file' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.payload.a.bytes).to.equal(stats.size);
            expect(parsed.payload.b.bytes).to.equal(stats.size);

            // The first file is never written due to createWriteStream() above
            Fs.unlinkSync(parsed.payload.b.path);
            done();
        });
    });

    it('parses a multipart file as data', function (done) {

        var path = Path.join(__dirname, '../package.json');

        var form = new FormData();
        form.append('my_file', Fs.createReadStream(path));
        form.headers = form.getHeaders();

        Subtext.parse(form, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            var fileContents = Fs.readFileSync(path);
            expect(parsed.payload.my_file.name).to.equal('subtext');
            done();
        });
    });

    it('peeks at multipart in stream mode', function (done) {

        var payload =
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'First\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'Second\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="x"\r\n' +
                '\r\n' +
                'Third\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="field1"\r\n' +
                '\r\n' +
                'Joe Blow\r\nalmost tricked you!\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="field1"\r\n' +
                '\r\n' +
                'Repeated name segment\r\n' +
                '--AaB03x\r\n' +
                'content-disposition: form-data; name="pics"; filename="file1.txt"\r\n' +
                'Content-Type: text/plain\r\n' +
                '\r\n' +
                '... contents of file1.txt ...\r\r\n' +
                '--AaB03x--\r\n';

        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'multipart/form-data; boundary=AaB03x'
        };

        var raw = '';
        var tap = new Stream.Transform();
        tap._transform = function (chunk, encoding, callback) {

            raw += chunk.toString();
            this.push(chunk, encoding);
            callback();
        };

        Subtext.parse(request, tap, { parse: true, output: 'stream' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.payload.x).to.deep.equal(['First', 'Second', 'Third']);
            expect(parsed.payload.field1).to.deep.equal(['Joe Blow\r\nalmost tricked you!', 'Repeated name segment']);
            expect(parsed.payload.pics.hapi.filename).to.equal('file1.txt');
            expect(raw).to.equal(payload);
            done();
        });
    });

    it('parses a file correctly on stream mode', function (done) {

        var path = Path.join(__dirname, './file/image.jpg');
        var stats = Fs.statSync(path);
        var fileStream = Fs.createReadStream(path);
        var fileContents = Fs.readFileSync(path);

        var form = new FormData();
        form.append('my_file', fileStream);
        form.headers = form.getHeaders();

        Subtext.parse(form, null, { parse: true, output: 'stream' }, function (err, parsed) {

            expect(err).to.not.exist();

            expect(parsed.payload.my_file.hapi).to.deep.equal({
                filename: 'image.jpg',
                headers: {
                    'content-disposition': 'form-data; name="my_file"; filename="image.jpg"',
                    'content-type': 'image/jpeg'
                }
            });

            Wreck.read(parsed.payload.my_file, null, function (err, buffer) {

                expect(err).to.not.exist();
                expect(fileContents.length).to.equal(buffer.length);
                expect(fileContents.toString('binary') === buffer.toString('binary')).to.equal(true);
                done();
            });
        });
    });

    it('parses field names with arrays', function (done) {

        var payload = '--AaB03x\r\n' +
                      'Content-Disposition: form-data; name="a[b]"\r\n' +
                      '\r\n' +
                      '3\r\n' +
                      '--AaB03x\r\n' +
                      'Content-Disposition: form-data; name="a[c]"\r\n' +
                      '\r\n' +
                      '4\r\n' +
                      '--AaB03x--\r\n';

        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'multipart/form-data; boundary=AaB03x'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.payload.a.b + parsed.payload.a.c).to.equal('34');
            done();
        });
    });

    it('parses field names with arrays and file', function (done) {

        var payload = '----WebKitFormBoundaryE19zNvXGzXaLvS5C\r\n' +
                  'Content-Disposition: form-data; name="a[b]"\r\n' +
                  '\r\n' +
                  '3\r\n' +
                  '----WebKitFormBoundaryE19zNvXGzXaLvS5C\r\n' +
                  'Content-Disposition: form-data; name="a[c]"\r\n' +
                  '\r\n' +
                  '4\r\n' +
                  '----WebKitFormBoundaryE19zNvXGzXaLvS5C\r\n' +
                  'Content-Disposition: form-data; name="file"; filename="test.txt"\r\n' +
                  'Content-Type: plain/text\r\n' +
                  '\r\n' +
                  'and\r\n' +
                  '----WebKitFormBoundaryE19zNvXGzXaLvS5C--\r\n';

        var request = Wreck.toReadableStream(payload);
        request.headers = {
            'content-type': 'multipart/form-data; boundary="--WebKitFormBoundaryE19zNvXGzXaLvS5C"'
        };

        Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

            expect(err).to.not.exist();
            expect(parsed.payload.a.b + parsed.payload.file + parsed.payload.a.c).to.equal('3and4');
            done();
        });
    });

    it('cleans file when stream is aborted', function (done) {

        var path = Path.join(__dirname, 'file');
        var count = Fs.readdirSync(path).length;

        var server = Http.createServer();
        server.on('request', function (req, res) {

            Subtext.parse(req, null, { parse: false, output: 'file', uploads: path }, function (err, parsed) {

                expect(Fs.readdirSync(path).length).to.equal(count);
                done();
            });
        });

        server.listen(0, function () {

            var options = {
                hostname: 'localhost',
                port: server.address().port,
                path: '/',
                method: 'POST',
                headers: { 'content-length': 1000000 }
            };

            var req = Http.request(options, function (res) { });

            req.on('error', function (err) { });

            var random = new Buffer(100000);
            req.write(random);
            req.write(random);
            setTimeout(function () {

                req.abort();
            }, 10);
        });
    });

    it('avoids catching an error thrown in sync callback', function (done) {

        var payload = '{"x":"1","y":"2","z":"3"}';
        var request = Wreck.toReadableStream(payload);
        request.headers = {};

        var domain = Domain.create();
        domain.once('error', function (err) {

            expect(err.message).to.equal('callback error');
            done();
        });

        domain.run(function () {

            Subtext.parse(request, null, { parse: true, output: 'data' }, function (err, parsed) {

                expect(err).to.not.exist();
                throw new Error('callback error');
            });
        });
    });
});
