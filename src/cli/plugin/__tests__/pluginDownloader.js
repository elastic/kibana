var expect = require('expect.js');
var sinon = require('sinon');
var nock = require('nock');
var glob = require('glob');
var rimraf = require('rimraf');
var join = require('path').join;

var pluginLogger = require('../pluginLogger');
var pluginDownloader = require('../pluginDownloader');

describe('kibana cli', function () {

  describe('plugin downloader', function () {

    var testWorkingPath = join(__dirname, '.test.data');
    var logger;
    var downloader;

    beforeEach(function () {
      logger = pluginLogger(false);
      sinon.stub(logger, 'log');
      sinon.stub(logger, 'error');
      rimraf.sync(testWorkingPath);
    });

    afterEach(function () {
      logger.log.restore();
      logger.error.restore();
      rimraf.sync(testWorkingPath);
    });

    describe('_downloadSingle', function () {

      beforeEach(function () {
        downloader = pluginDownloader({}, logger);
      });

      afterEach(function () {
      });

      it.skip('should throw an ENOTFOUND error for a 404 error', function () {
        var couchdb = nock('http://www.files.com')
                .get('/plugin.tar.gz')
                .reply(404);

        var source = 'http://www.files.com/plugin.tar.gz';

        var errorStub = sinon.stub();
        return downloader._downloadSingle(source, testWorkingPath, 0, logger)
        .catch(errorStub)
        .then(function (data) {
          expect(errorStub.called).to.be(true);
          expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          expect(files).to.eql([]);
        });
      });

      it.skip('should download and extract a valid plugin', function () {
        var filename = join(__dirname, 'replies/test-plugin-master.tar.gz');
        var couchdb = nock('http://www.files.com')
        .defaultReplyHeaders({
          'content-length': '10'
        })
        .get('/plugin.tar.gz')
        .replyWithFile(200, filename);

        var source = 'http://www.files.com/plugin.tar.gz';

        return downloader._downloadSingle(source, testWorkingPath, 0, logger)
        .then(function (data) {
          var files = glob.sync('**/*', { cwd: testWorkingPath });
          var expected = [
            'README.md',
            'index.js',
            'package.json',
            'public',
            'public/app.js'
          ];
          expect(files.sort()).to.eql(expected.sort());
        });
      });

      it('should abort the download and extraction for a corrupt archive.', function () {
        var filename = join(__dirname, 'replies/corrupt.tar.gz');
        var couchdb = nock('http://www.files.com')
        .get('/plugin.tar.gz')
        .replyWithFile(200, filename);

        var source = 'http://www.files.com/plugin.tar.gz';

        var errorStub = sinon.stub();
        return downloader._downloadSingle(source, testWorkingPath, 0, logger)
        .catch(errorStub)
        .then(function (data) {
          expect(errorStub.called).to.be(true);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          expect(files).to.eql([]);
        });
      });

    });

    describe('download', function () {

      beforeEach(function () {});

      afterEach(function () {});

      it.skip('should loop through bad urls until it finds a good one.', function () {
        var filename = join(__dirname, 'replies/test-plugin-master.tar.gz');
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'I am a bad uri',
            'http://www.files.com/goodfile.tar.gz'
          ],
          workingPath: testWorkingPath,
          timeout: 0
        };
        downloader = pluginDownloader(settings, logger);

        var couchdb = nock('http://www.files.com')
        .defaultReplyHeaders({
          'content-length': '10'
        })
        .get('/badfile1.tar.gz')
        .reply(404)
        .get('/badfile2.tar.gz')
        .reply(404)
        .get('/goodfile.tar.gz')
        .replyWithFile(200, filename);

        var errorStub = sinon.stub();
        return downloader.download(settings, logger)
        .catch(errorStub)
        .then(function (data) {
          expect(errorStub.called).to.be(false);

          expect(logger.log.getCall(0).args[0]).to.match(/badfile1.tar.gz/);
          expect(logger.log.getCall(1).args[0]).to.match(/badfile2.tar.gz/);
          expect(logger.log.getCall(2).args[0]).to.match(/I am a bad uri/);
          expect(logger.log.getCall(3).args[0]).to.match(/goodfile.tar.gz/);
          expect(logger.log.lastCall.args[0]).to.match(/complete/i);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          var expected = [
            'README.md',
            'index.js',
            'package.json',
            'public',
            'public/app.js'
          ];
          expect(files.sort()).to.eql(expected.sort());
        });
      });

      it.skip('should stop looping through urls when it finds a good one.', function () {
        var filename = join(__dirname, 'replies/test-plugin-master.tar.gz');
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'http://www.files.com/goodfile.tar.gz',
            'http://www.files.com/badfile3.tar.gz'
          ],
          workingPath: testWorkingPath,
          timeout: 0
        };
        downloader = pluginDownloader(settings, logger);

        var couchdb = nock('http://www.files.com')
        .defaultReplyHeaders({
          'content-length': '10'
        })
        .get('/badfile1.tar.gz')
        .reply(404)
        .get('/badfile2.tar.gz')
        .reply(404)
        .get('/goodfile.tar.gz')
        .replyWithFile(200, filename)
        .get('/badfile3.tar.gz')
        .reply(404);

        var errorStub = sinon.stub();
        return downloader.download(settings, logger)
        .catch(errorStub)
        .then(function (data) {
          expect(errorStub.called).to.be(false);

          for (var i = 0; i < logger.log.callCount; i++) {
            expect(logger.log.getCall(i).args[0]).to.not.match(/badfile3.tar.gz/);
          }

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          var expected = [
            'README.md',
            'index.js',
            'package.json',
            'public',
            'public/app.js'
          ];
          expect(files.sort()).to.eql(expected.sort());
        });
      });

      it.skip('should throw an error when it doesn\'t find a good url.', function () {
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'http://www.files.com/badfile3.tar.gz'
          ],
          workingPath: testWorkingPath,
          timeout: 0
        };
        downloader = pluginDownloader(settings, logger);

        var couchdb = nock('http://www.files.com')
        .defaultReplyHeaders({
          'content-length': '10'
        })
        .get('/badfile1.tar.gz')
        .reply(404)
        .get('/badfile2.tar.gz')
        .reply(404)
        .get('/badfile3.tar.gz')
        .reply(404);

        var errorStub = sinon.stub();
        return downloader.download(settings, logger)
        .catch(errorStub)
        .then(function (data) {
          expect(errorStub.called).to.be(true);
          expect(errorStub.lastCall.args[0].message).to.match(/not a valid/i);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          expect(files).to.eql([]);
        });
      });

    });

  });

});
