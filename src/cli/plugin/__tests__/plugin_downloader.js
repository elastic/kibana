import expect from 'expect.js';
import sinon from 'sinon';
import nock from 'nock';
import glob from 'glob-all';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import pluginLogger from '../plugin_logger';
import pluginDownloader from '../plugin_downloader';
import { join } from 'path';

describe('kibana cli', function () {

  describe('plugin downloader', function () {
    const testWorkingPath = join(__dirname, '.test.data');
    const tempArchiveFilePath = join(testWorkingPath, 'archive.part');
    let logger;
    let downloader;

    function expectWorkingPathEmpty() {
      const files = glob.sync('**/*', { cwd: testWorkingPath });
      expect(files).to.eql([]);
    }

    function expectWorkingPathNotEmpty() {
      const files = glob.sync('**/*', { cwd: testWorkingPath });
      const expected = [
        'archive.part'
      ];

      expect(files.sort()).to.eql(expected.sort());
    }

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
        const settings = {
          urls: [],
          workingPath: testWorkingPath,
          tempArchiveFile: tempArchiveFilePath,
          timeout: 0
        };
        downloader = pluginDownloader(settings, logger);
      });

      describe('http downloader', function () {

        it('should download an unsupported file type, but return undefined for archiveType', function () {
          const filePath = join(__dirname, 'replies/banana.jpg');
          const couchdb = nock('http://www.files.com')
            .defaultReplyHeaders({
              'content-length': '10',
              'content-type': 'image/jpeg'
            })
            .get('/banana.jpg')
            .replyWithFile(200, filePath);

          const sourceUrl = 'http://www.files.com/banana.jpg';
          return downloader._downloadSingle(sourceUrl)
          .then(function (data) {
            expect(data.archiveType).to.be(undefined);
            expectWorkingPathNotEmpty();
          });
        });

        it('should throw an ENOTFOUND error for a http ulr that returns 404', function () {
          const couchdb = nock('http://www.files.com')
            .get('/plugin.tar.gz')
            .reply(404);

          const sourceUrl = 'http://www.files.com/plugin.tar.gz';

          return downloader._downloadSingle(sourceUrl)
          .then(shouldReject, function (err) {
            expect(err.message).to.match(/ENOTFOUND/);
            expectWorkingPathEmpty();
          });
        });

        it('should throw an ENOTFOUND error for an invalid url', function () {
          const sourceUrl = 'i am an invalid url';

          return downloader._downloadSingle(sourceUrl)
          .then(shouldReject, function (err) {
            expect(err.message).to.match(/ENOTFOUND/);
            expectWorkingPathEmpty();
          });
        });

        it('should download a tarball from a valid http url', function () {
          const filePath = join(__dirname, 'replies/test_plugin_master.tar.gz');

          const couchdb = nock('http://www.files.com')
            .defaultReplyHeaders({
              'content-length': '10',
              'content-type': 'application/x-gzip'
            })
            .get('/plugin.tar.gz')
            .replyWithFile(200, filePath);

          const sourceUrl = 'http://www.files.com/plugin.tar.gz';

          return downloader._downloadSingle(sourceUrl)
          .then(function (data) {
            expect(data.archiveType).to.be('.tar.gz');
            expectWorkingPathNotEmpty();
          });
        });

        it('should consider .tgz files as archive type .tar.gz', function () {
          const filePath = join(__dirname, 'replies/test_plugin_master.tar.gz');

          const couchdb = nock('http://www.files.com')
            .defaultReplyHeaders({
              'content-length': '10'
            })
            .get('/plugin.tgz')
            .replyWithFile(200, filePath);

          const sourceUrl = 'http://www.files.com/plugin.tgz';

          return downloader._downloadSingle(sourceUrl)
          .then(function (data) {
            expect(data.archiveType).to.be('.tar.gz');
            expectWorkingPathNotEmpty();
          });
        });

        it('should download a zip from a valid http url', function () {
          const filePath = join(__dirname, 'replies/test_plugin_master.zip');

          const couchdb = nock('http://www.files.com')
            .defaultReplyHeaders({
              'content-length': '341965',
              'content-type': 'application/zip'
            })
            .get('/plugin.zip')
            .replyWithFile(200, filePath);

          const sourceUrl = 'http://www.files.com/plugin.zip';

          return downloader._downloadSingle(sourceUrl)
          .then(function (data) {
            expect(data.archiveType).to.be('.zip');
            expectWorkingPathNotEmpty();
          });
        });

      });

      describe('local file downloader', function () {

        it('should copy an unsupported file type, but return undefined for archiveType', function () {
          const filePath = join(__dirname, 'replies/banana.jpg');
          const sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

          const couchdb = nock('http://www.files.com')
            .defaultReplyHeaders({
              'content-length': '10',
              'content-type': 'image/jpeg'
            })
            .get('/banana.jpg')
            .replyWithFile(200, filePath);

          return downloader._downloadSingle(sourceUrl)
          .then(function (data) {
            expect(data.archiveType).to.be(undefined);
            expectWorkingPathNotEmpty();
          });
        });

        it('should throw an ENOTFOUND error for an invalid local file', function () {
          const filePath = join(__dirname, 'replies/i-am-not-there.tar.gz');
          const sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

          return downloader._downloadSingle(sourceUrl)
          .then(shouldReject, function (err) {
            expect(err.message).to.match(/ENOTFOUND/);
            expectWorkingPathEmpty();
          });
        });

        it('should copy a tarball from a valid local file', function () {
          const filePath = join(__dirname, 'replies/test_plugin_master.tar.gz');
          const sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

          return downloader._downloadSingle(sourceUrl)
          .then(function (data) {
            expect(data.archiveType).to.be('.tar.gz');
            expectWorkingPathNotEmpty();
          });
        });

        it('should copy a zip from a valid local file', function () {
          const filePath = join(__dirname, 'replies/test_plugin_master.zip');
          const sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

          return downloader._downloadSingle(sourceUrl)
          .then(function (data) {
            expect(data.archiveType).to.be('.zip');
            expectWorkingPathNotEmpty();
          });
        });

      });

    });

    describe('download', function () {
      it('should loop through bad urls until it finds a good one.', function () {
        const filePath = join(__dirname, 'replies/test_plugin_master.tar.gz');
        const settings = {
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

        const couchdb = nock('http://www.files.com')
        .defaultReplyHeaders({
          'content-length': '10'
        })
        .get('/badfile1.tar.gz')
        .reply(404)
        .get('/badfile2.tar.gz')
        .reply(404)
        .get('/goodfile.tar.gz')
        .replyWithFile(200, filePath);

        return downloader.download(settings, logger)
        .then(function (data) {
          expect(logger.log.getCall(0).args[0]).to.match(/badfile1.tar.gz/);
          expect(logger.log.getCall(1).args[0]).to.match(/badfile2.tar.gz/);
          expect(logger.log.getCall(2).args[0]).to.match(/I am a bad uri/);
          expect(logger.log.getCall(3).args[0]).to.match(/goodfile.tar.gz/);
          expectWorkingPathNotEmpty();
        });
      });

      it('should stop looping through urls when it finds a good one.', function () {
        const filePath = join(__dirname, 'replies/test_plugin_master.tar.gz');
        const settings = {
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

        const couchdb = nock('http://www.files.com')
        .defaultReplyHeaders({
          'content-length': '10'
        })
        .get('/badfile1.tar.gz')
        .reply(404)
        .get('/badfile2.tar.gz')
        .reply(404)
        .get('/goodfile.tar.gz')
        .replyWithFile(200, filePath)
        .get('/badfile3.tar.gz')
        .reply(404);

        return downloader.download(settings, logger)
        .then(function (data) {
          for (let i = 0; i < logger.log.callCount; i++) {
            expect(logger.log.getCall(i).args[0]).to.not.match(/badfile3.tar.gz/);
          }
          expectWorkingPathNotEmpty();
        });
      });

      it('should throw an error when it doesn\'t find a good url.', function () {
        const settings = {
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

        const couchdb = nock('http://www.files.com')
        .defaultReplyHeaders({
          'content-length': '10'
        })
        .get('/badfile1.tar.gz')
        .reply(404)
        .get('/badfile2.tar.gz')
        .reply(404)
        .get('/badfile3.tar.gz')
        .reply(404);

        return downloader.download(settings, logger)
        .then(shouldReject, function (err) {
          expect(err.message).to.match(/no valid url specified/i);
          expectWorkingPathEmpty();
        });
      });

    });

  });

});
