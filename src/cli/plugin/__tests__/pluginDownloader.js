var expect = require('expect.js');
var sinon = require('sinon');
var nock = require('nock');
var glob = require('glob');
var rimraf = require('rimraf');
var { join } = require('path');
var mkdirp = require('mkdirp');

var pluginLogger = require('../pluginLogger');
var pluginDownloader = require('../pluginDownloader');

describe('kibana cli', function () {

  describe('plugin downloader', function () {

    var testWorkingPath = join(__dirname, '.test.data');
    var tempArchiveFilePath = join(testWorkingPath, 'archive.part');
    var logger;
    var downloader;

    beforeEach(function () {
      logger = pluginLogger(false);
      sinon.stub(logger, 'log');
      sinon.stub(logger, 'error');
      //console.log('beforeEach.rimraf');
      rimraf.sync(testWorkingPath);
      mkdirp.sync(testWorkingPath);
    });

    afterEach(function () {
      logger.log.restore();
      logger.error.restore();
      //console.log('afterEach.rimraf');
      rimraf.sync(testWorkingPath);
    });

    describe('kill everything', function () {
      beforeEach(function () {
        var settings = {
          urls: [],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
          timeout: 0
        };
        downloader = pluginDownloader(settings, logger);
      });

      it('should throw an error when it doesn\'t find a good url.', function (done) {
        this.timeout(5000);
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'http://www.files.com/badfile3.tar.gz'
          ],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
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
          expect(errorStub.lastCall.args[0].message).to.match(/no valid url specified/i);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          expect(files).to.eql([]);

          done();
        });
      });

      it('should throw an error when it doesn\'t find a good url.', function (done) {
        this.timeout(5000);
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'http://www.files.com/badfile3.tar.gz'
          ],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
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
          expect(errorStub.lastCall.args[0].message).to.match(/no valid url specified/i);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          expect(files).to.eql([]);

          done();
        });
      });

      it('should throw an error when it doesn\'t find a good url.', function (done) {
        this.timeout(5000);
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'http://www.files.com/badfile3.tar.gz'
          ],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
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
          expect(errorStub.lastCall.args[0].message).to.match(/no valid url specified/i);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          expect(files).to.eql([]);

          done();
        });
      });

      it('should throw an error when it doesn\'t find a good url.', function (done) {
        this.timeout(5000);
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'http://www.files.com/badfile3.tar.gz'
          ],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
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
          expect(errorStub.lastCall.args[0].message).to.match(/no valid url specified/i);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          expect(files).to.eql([]);

          done();
        });
      });

      it('should throw an error when it doesn\'t find a good url.', function (done) {
        this.timeout(5000);
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'http://www.files.com/badfile3.tar.gz'
          ],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
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
          expect(errorStub.lastCall.args[0].message).to.match(/no valid url specified/i);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          expect(files).to.eql([]);

          done();
        });
      });

      it('should throw an error when it doesn\'t find a good url.', function (done) {
        this.timeout(5000);
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'http://www.files.com/badfile3.tar.gz'
          ],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
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
          expect(errorStub.lastCall.args[0].message).to.match(/no valid url specified/i);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          expect(files).to.eql([]);

          done();
        });
      });

      it('should throw an error when it doesn\'t find a good url.', function (done) {
        this.timeout(5000);
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'http://www.files.com/badfile3.tar.gz'
          ],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
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
          expect(errorStub.lastCall.args[0].message).to.match(/no valid url specified/i);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          expect(files).to.eql([]);

          done();
        });
      });

      it('should throw an error when it doesn\'t find a good url.', function (done) {
        this.timeout(5000);
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'http://www.files.com/badfile3.tar.gz'
          ],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
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
          expect(errorStub.lastCall.args[0].message).to.match(/no valid url specified/i);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          expect(files).to.eql([]);

          done();
        });
      });

      it('should throw an error when it doesn\'t find a good url.', function (done) {
        this.timeout(5000);
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'http://www.files.com/badfile3.tar.gz'
          ],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
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
          expect(errorStub.lastCall.args[0].message).to.match(/no valid url specified/i);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          expect(files).to.eql([]);

          done();
        });
      });

      it('should throw an error when it doesn\'t find a good url.', function (done) {
        this.timeout(5000);
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'http://www.files.com/badfile3.tar.gz'
          ],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
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
          expect(errorStub.lastCall.args[0].message).to.match(/no valid url specified/i);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          expect(files).to.eql([]);

          done();
        });
      });

    });

    describe.skip('_downloadSingle', function () {

      beforeEach(function () {
        var settings = {
          urls: [],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
          timeout: 0
        };
        downloader = pluginDownloader(settings, logger);
      });

      describe.skip('http downloader', function () {

        it('should download an unsupported file type, but return undefined for archiveType', function (done) {
          var filename = join(__dirname, 'replies/Banana21.jpg');

          var couchdb = nock('http://www.files.com')
            .defaultReplyHeaders({
              'content-length': '10',
              'content-type': 'image/jpeg'
            })
            .get('/banana21.jpg')
            .replyWithFile(200, filename);

          var sourceUrl = 'http://www.files.com/banana21.jpg';
          var errorStub = sinon.stub();
          return downloader._downloadSingle(sourceUrl)
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.called).to.be(false);

            expect(data.archiveType).to.be(undefined);

            var files = glob.sync('**/*', { cwd: testWorkingPath });
            var expected = [
              'archive.part'
            ];
            expect(files.sort()).to.eql(expected.sort());

            done();
          });
        });

        it('should throw an ENOTFOUND error for a http ulr that returns 404', function (done) {
          var couchdb = nock('http://www.files.com')
            .get('/plugin.tar.gz')
            .reply(404);

          var sourceUrl = 'http://www.files.com/plugin.tar.gz';

          var errorStub = sinon.stub();
          return downloader._downloadSingle(sourceUrl)
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.called).to.be(true);
            expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);

            expect(data).to.be(undefined);

            var files = glob.sync('**/*', { cwd: testWorkingPath });
            expect(files).to.eql([]);

            done();
          });
        });

        it('should throw an ENOTFOUND error for an invalid url', function (done) {
          var sourceUrl = 'i am an invalid url';

          var errorStub = sinon.stub();
          return downloader._downloadSingle(sourceUrl)
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.called).to.be(true);
            expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);

            expect(data).to.be(undefined);

            var files = glob.sync('**/*', { cwd: testWorkingPath });
            expect(files).to.eql([]);

            done();
          });
        });

        it('should download a tarball from a valid http url', function (done) {
          var filename = join(__dirname, 'replies/test-plugin-master.tar.gz');

          var couchdb = nock('http://www.files.com')
            .defaultReplyHeaders({
              'content-length': '10',
              'content-type': 'application/x-gzip'
            })
            .get('/plugin.tar.gz')
            .replyWithFile(200, filename);

          var sourceUrl = 'http://www.files.com/plugin.tar.gz';

          var errorStub = sinon.stub();
          return downloader._downloadSingle(sourceUrl)
          .then(function (data) {
            expect(errorStub.called).to.be(false);

            expect(data.archiveType).to.be('.tar.gz');

            var files = glob.sync('**/*', { cwd: testWorkingPath });
            var expected = [
              'archive.part'
            ];
            expect(files.sort()).to.eql(expected.sort());

            done();
          });
        });

        it('should download a zip from a valid http url', function (done) {
          var filename = join(__dirname, 'replies/funger-plugin-2015-11-10.zip');

          var couchdb = nock('http://www.files.com')
            .defaultReplyHeaders({
              'content-length': '341965',
              'content-type': 'application/zip'
            })
            .get('/plugin.zip')
            .replyWithFile(200, filename);

          var sourceUrl = 'http://www.files.com/plugin.zip';

          var errorStub = sinon.stub();
          return downloader._downloadSingle(sourceUrl)
          .then(function (data) {
            expect(errorStub.called).to.be(false);

            expect(data.archiveType).to.be('.zip');

            var files = glob.sync('**/*', { cwd: testWorkingPath });
            var expected = [
              'archive.part'
            ];
            expect(files.sort()).to.eql(expected.sort());

            done();
          });
        });

      });

      describe.skip('local file downloader', function() {

        it('should throw an ENOTFOUND error for an invalid local file', function (done) {
          var filePath = join(__dirname, 'replies/i-am-not-there.tar.gz');
          var sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

          var errorStub = sinon.stub();
          return downloader._downloadSingle(sourceUrl)
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.called).to.be(true);
            expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);

            var files = glob.sync('**/*', { cwd: testWorkingPath });
            expect(files).to.eql([]);

            done();
          });
        });

        it('should download from a valid local file', function (done) {
          var filePath = join(__dirname, 'replies/test-plugin-master.tar.gz');
          var sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

          var errorStub = sinon.stub();
          return downloader._downloadSingle(sourceUrl)
          .catch((err) => {
            console.log('error', err);
            errorStub(err);
          })
          .then(function (data) {
            expect(errorStub.called).to.be(false);

            var files = glob.sync('**/*', { cwd: testWorkingPath });
            var expected = [
              'archive.part'
            ];
            expect(files.sort()).to.eql(expected.sort());

            done();
          });
        });

      });

    });

    describe.skip('download', function () {

      it('should loop through bad urls until it finds a good one.', function (done) {
        var filename = join(__dirname, 'replies/test-plugin-master.tar.gz');
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'I am a bad uri',
            'http://www.files.com/goodfile.tar.gz'
          ],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
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
        .catch((err) => {
          console.log(err);
          errorStub(err);
        })
        .then(function (data) {
          expect(errorStub.called).to.be(false);

          expect(logger.log.getCall(0).args[0]).to.match(/badfile1.tar.gz/);
          expect(logger.log.getCall(1).args[0]).to.match(/badfile2.tar.gz/);
          expect(logger.log.getCall(2).args[0]).to.match(/I am a bad uri/);
          expect(logger.log.getCall(3).args[0]).to.match(/goodfile.tar.gz/);
          expect(logger.log.lastCall.args[0]).to.match(/complete/i);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          var expected = [
            'archive.part'
          ];
          expect(files.sort()).to.eql(expected.sort());

          done();
        });
      });

      it('should stop looping through urls when it finds a good one.', function (done) {
        var filename = join(__dirname, 'replies/test-plugin-master.tar.gz');
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'http://www.files.com/goodfile.tar.gz',
            'http://www.files.com/badfile3.tar.gz'
          ],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
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
            'archive.part'
          ];
          expect(files.sort()).to.eql(expected.sort());

          done();
        });
      });

      it('should throw an error when it doesn\'t find a good url.', function (done) {
        var settings = {
          urls: [
            'http://www.files.com/badfile1.tar.gz',
            'http://www.files.com/badfile2.tar.gz',
            'http://www.files.com/badfile3.tar.gz'
          ],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
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
          expect(errorStub.lastCall.args[0].message).to.match(/no valid url specified/i);

          var files = glob.sync('**/*', { cwd: testWorkingPath });
          expect(files).to.eql([]);

          done();
        });
      });

    });

  });

});
