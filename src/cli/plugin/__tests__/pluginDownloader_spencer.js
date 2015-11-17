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

    function shouldReject() {
      throw new Error('expected the promise to reject');
    }

    beforeEach(function () {
      logger = pluginLogger(false);
      sinon.stub(logger, 'log');
      sinon.stub(logger, 'error');
      rimraf.sync(testWorkingPath);
      mkdirp.sync(testWorkingPath);
    });

    afterEach(function () {
      logger.log.restore();
      logger.error.restore();
      rimraf.sync(testWorkingPath);
    });

    describe('_downloadSingle', function () {

      beforeEach(function () {
        var settings = {
          urls: [],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
          timeout: 0
        };
        downloader = pluginDownloader(settings, logger);
      });

      for (var i=0;i<10000;i++) {

      describe('http downloader', function () {

        it('should download an unsupported file type, but return undefined for archiveType', function () {
          var filename = join(__dirname, 'replies/Banana21.jpg');

          var couchdb = nock('http://www.files.com')
            .defaultReplyHeaders({
              'content-length': '10',
              'content-type': 'image/jpeg'
            })
            .get('/banana21.jpg')
            .replyWithFile(200, filename);

          var sourceUrl = 'http://www.files.com/banana21.jpg';
          return downloader._downloadSingle(sourceUrl)
          .then(function (data) {
            expect(data.archiveType).to.be(undefined);

            var files = glob.sync('**/*', { cwd: testWorkingPath });
            var expected = [
              'archive.part'
            ];

            expect(files.sort()).to.eql(expected.sort());
          });
        });

        it('should throw an ENOTFOUND error for a http ulr that returns 404', function () {
          var couchdb = nock('http://www.files.com')
            .get('/plugin.tar.gz')
            .reply(404);

          var sourceUrl = 'http://www.files.com/plugin.tar.gz';

          return downloader._downloadSingle(sourceUrl)
          .then(shouldReject, function (err) {
            expect(err.message).to.match(/ENOTFOUND/);

            var files = glob.sync('**/*', { cwd: testWorkingPath });
            expect(files).to.eql([]);
          });
        });

        it('should throw an ENOTFOUND error for an invalid url', function () {
          var sourceUrl = 'i am an invalid url';

          return downloader._downloadSingle(sourceUrl)
          .then(shouldReject, function (err) {
            expect(err.message).to.match(/ENOTFOUND/);

            var files = glob.sync('**/*', { cwd: testWorkingPath });
            expect(files).to.eql([]);
          });
        });

        it('should download a tarball from a valid http url', function () {
          var filename = join(__dirname, 'replies/test-plugin-master.tar.gz');

          var couchdb = nock('http://www.files.com')
            .defaultReplyHeaders({
              'content-length': '10',
              'content-type': 'application/x-gzip'
            })
            .get('/plugin.tar.gz')
            .replyWithFile(200, filename);

          var sourceUrl = 'http://www.files.com/plugin.tar.gz';

          return downloader._downloadSingle(sourceUrl)
          .then(function (data) {

            expect(data.archiveType).to.be('.tar.gz');

            var files = glob.sync('**/*', { cwd: testWorkingPath });
            var expected = [
              'archive.part'
            ];
            expect(files.sort()).to.eql(expected.sort());
          });
        });

        it('should download a zip from a valid http url', function () {
          var filename = join(__dirname, 'replies/funger-plugin-2015-11-10.zip');

          var couchdb = nock('http://www.files.com')
            .defaultReplyHeaders({
              'content-length': '341965',
              'content-type': 'application/zip'
            })
            .get('/plugin.zip')
            .replyWithFile(200, filename);

          var sourceUrl = 'http://www.files.com/plugin.zip';

          return downloader._downloadSingle(sourceUrl)
          .then(function (data) {
            expect(data.archiveType).to.be('.zip');

            var files = glob.sync('**/*', { cwd: testWorkingPath });
            var expected = [
              'archive.part'
            ];
            expect(files.sort()).to.eql(expected.sort());
          });
        });

      });

      }

      // describe('local file downloader', function () {

      //   it('should throw an ENOTFOUND error for an invalid local file', function () {
      //     var filePath = join(__dirname, 'replies/i-am-not-there.tar.gz');
      //     var sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

      //     return downloader._downloadSingle(sourceUrl)
      //     .then(shouldReject, function (err) {
      //       expect(err.message).to.match(/ENOTFOUND/);

      //       var files = glob.sync('**/*', { cwd: testWorkingPath });
      //       expect(files).to.eql([]);
      //     });
      //   });

      //   it('should download from a valid local file', function () {
      //     var filePath = join(__dirname, 'replies/test-plugin-master.tar.gz');
      //     var sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

      //     return downloader._downloadSingle(sourceUrl)
      //     .then(function (data) {
      //       expect(data.archiveType).to.be('.tar.gz');

      //       var files = glob.sync('**/*', { cwd: testWorkingPath });
      //       var expected = [
      //         'archive.part'
      //       ];
      //       expect(files.sort()).to.eql(expected.sort());
      //     });
      //   });

      // });

    });

    // describe('download', function () {
    //   it('should loop through bad urls until it finds a good one.', function () {
    //     var filename = join(__dirname, 'replies/test-plugin-master.tar.gz');
    //     var settings = {
    //       urls: [
    //         'http://www.files.com/badfile1.tar.gz',
    //         'http://www.files.com/badfile2.tar.gz',
    //         'I am a bad uri',
    //         'http://www.files.com/goodfile.tar.gz'
    //       ],
    //       workingPath: testWorkingPath,
    //       tempArchiveFile: tempArchiveFilePath,
    //       timeout: 0
    //     };
    //     downloader = pluginDownloader(settings, logger);

    //     var couchdb = nock('http://www.files.com')
    //     .defaultReplyHeaders({
    //       'content-length': '10'
    //     })
    //     .get('/badfile1.tar.gz')
    //     .reply(404)
    //     .get('/badfile2.tar.gz')
    //     .reply(404)
    //     .get('/goodfile.tar.gz')
    //     .replyWithFile(200, filename);

    //     return downloader.download(settings, logger)
    //     .then(function (data) {
    //       expect(logger.log.getCall(0).args[0]).to.match(/badfile1.tar.gz/);
    //       expect(logger.log.getCall(1).args[0]).to.match(/badfile2.tar.gz/);
    //       expect(logger.log.getCall(2).args[0]).to.match(/I am a bad uri/);
    //       expect(logger.log.getCall(3).args[0]).to.match(/goodfile.tar.gz/);
    //       // expect(logger.log.lastCall.args[0]).to.match(/complete/i);

    //       var files = glob.sync('**/*', { cwd: testWorkingPath });
    //       var expected = [
    //         'archive.part'
    //       ];
    //       expect(files.sort()).to.eql(expected.sort());
    //     });
    //   });

    //   it('should stop looping through urls when it finds a good one.', function () {
    //     var filename = join(__dirname, 'replies/test-plugin-master.tar.gz');
    //     var settings = {
    //       urls: [
    //         'http://www.files.com/badfile1.tar.gz',
    //         'http://www.files.com/badfile2.tar.gz',
    //         'http://www.files.com/goodfile.tar.gz',
    //         'http://www.files.com/badfile3.tar.gz'
    //       ],
    //       workingPath: testWorkingPath,
    //       tempArchiveFile: tempArchiveFilePath,
    //       timeout: 0
    //     };
    //     downloader = pluginDownloader(settings, logger);

    //     var couchdb = nock('http://www.files.com')
    //     .defaultReplyHeaders({
    //       'content-length': '10'
    //     })
    //     .get('/badfile1.tar.gz')
    //     .reply(404)
    //     .get('/badfile2.tar.gz')
    //     .reply(404)
    //     .get('/goodfile.tar.gz')
    //     .replyWithFile(200, filename)
    //     .get('/badfile3.tar.gz')
    //     .reply(404);

    //     return downloader.download(settings, logger)
    //     .then(function (data) {
    //       for (var i = 0; i < logger.log.callCount; i++) {
    //         expect(logger.log.getCall(i).args[0]).to.not.match(/badfile3.tar.gz/);
    //       }

    //       var files = glob.sync('**/*', { cwd: testWorkingPath });
    //       var expected = [
    //         'archive.part'
    //       ];
    //       expect(files.sort()).to.eql(expected.sort());
    //     });
    //   });

    //   it('should throw an error when it doesn\'t find a good url.', function () {
    //     var settings = {
    //       urls: [
    //         'http://www.files.com/badfile1.tar.gz',
    //         'http://www.files.com/badfile2.tar.gz',
    //         'http://www.files.com/badfile3.tar.gz'
    //       ],
    //       workingPath: testWorkingPath,
    //       tempArchiveFile: tempArchiveFilePath,
    //       timeout: 0
    //     };
    //     downloader = pluginDownloader(settings, logger);

    //     var couchdb = nock('http://www.files.com')
    //     .defaultReplyHeaders({
    //       'content-length': '10'
    //     })
    //     .get('/badfile1.tar.gz')
    //     .reply(404)
    //     .get('/badfile2.tar.gz')
    //     .reply(404)
    //     .get('/badfile3.tar.gz')
    //     .reply(404);

    //     return downloader.download(settings, logger)
    //     .then(shouldReject, function (err) {
    //       expect(err.message).to.match(/no valid url specified/i);

    //       var files = glob.sync('**/*', { cwd: testWorkingPath });
    //       expect(files).to.eql([]);
    //     });
    //   });

    // });

  });

});
