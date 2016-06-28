// Load modules

var Content = require('..');
var Lab = require('lab');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Lab.expect;


describe('type()', function () {

    it('parses header', function (done) {

        var type = Content.type('application/json; some=property; and="another"');
        expect(type.isBoom).to.not.exist;
        expect(type.mime).to.equal('application/json');
        expect(type.boundary).to.not.exist;
        done();
    });

    it('parses header (only type)', function (done) {

        var type = Content.type('application/json');
        expect(type.isBoom).to.not.exist;
        expect(type.mime).to.equal('application/json');
        expect(type.boundary).to.not.exist;
        done();
    });

    it('parses header (boundary)', function (done) {

        var type = Content.type('application/json; boundary=abcdefghijklm');
        expect(type.isBoom).to.not.exist;
        expect(type.mime).to.equal('application/json');
        expect(type.boundary).to.equal('abcdefghijklm');
        done();
    });

    it('parses header (quoted boundary)', function (done) {

        var type = Content.type('application/json; boundary="abcdefghijklm"');
        expect(type.isBoom).to.not.exist;
        expect(type.mime).to.equal('application/json');
        expect(type.boundary).to.equal('abcdefghijklm');
        done();
    });

    it('errors on invalid header', function (done) {

        var type = Content.type('application/json; some');
        expect(type.isBoom).to.exist;
        done();
    });

    it('errors on multipart missing boundary', function (done) {

        var type = Content.type('multipart/form-data');
        expect(type.isBoom).to.exist;
        done();
    });
});

describe('disposition()', function (done) {

    it('parses header', function (done) {

        var header = 'form-data; name="file"; filename=file.jpg';

        expect(Content.disposition(header)).to.deep.equal({ name: 'file', filename: 'file.jpg' });
        done();
    });

    it('parses header (empty filename)', function (done) {

        var header = 'form-data; name="file"; filename=""';

        expect(Content.disposition(header)).to.deep.equal({ name: 'file', filename: '' });
        done();
    });

    it('handles language filename', function (done) {

        var header = 'form-data; name="file"; filename*=utf-8\'en\'with%20space';

        expect(Content.disposition(header)).to.deep.equal({ name: 'file', filename: 'with space' });
        done();
    });

    it('errors on invalid language filename', function (done) {

        var header = 'form-data; name="file"; filename*=steve';

        expect(Content.disposition(header).message).to.equal('Invalid content-disposition header format includes invalid parameters');
        done();
    });

    it('errors on invalid format', function (done) {

        var header = 'steve';

        expect(Content.disposition(header).message).to.equal('Invalid content-disposition header format');
        done();
    });

    it('errors on missing header', function (done) {

        expect(Content.disposition('').message).to.equal('Missing content-disposition header');
        done();
    });

    it('errors on missing parameters', function (done) {

        var header = 'form-data';

        expect(Content.disposition(header).message).to.equal('Invalid content-disposition header missing parameters');
        done();
    });

    it('errors on missing language value', function (done) {

        var header = 'form-data; name="file"; filename*=';

        expect(Content.disposition(header).message).to.equal('Invalid content-disposition header format includes invalid parameters');
        done();
    });

    it('errors on invalid percent encoded language value', function (done) {

        var header = 'form-data; name="file"; filename*=utf-8\'en\'with%vxspace';

        expect(Content.disposition(header).message).to.equal('Invalid content-disposition header format includes invalid parameters');
        done();
    });

    it('errors on missing name', function (done) {

        var header = 'form-data; filename=x';

        expect(Content.disposition(header).message).to.equal('Invalid content-disposition header missing name parameter');
        done();
    });
});
