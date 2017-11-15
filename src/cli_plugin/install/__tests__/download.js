import expect from 'expect.js';
import sinon from 'sinon';
import nock from 'nock';
import glob from 'glob-all';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import Logger from '../../lib/logger';
import { UnsupportedProtocolError } from '../../lib/errors';
import { download, _downloadSingle, _getFilePath, _checkFilePathDeprecation } from '../download';
import { join } from 'path';
import http from 'http';

describe('kibana cli', function () {

  describe('plugin downloader', function () {
    const testWorkingPath = join(__dirname, '.test.data');
    const tempArchiveFilePath = join(testWorkingPath, 'archive.part');

    const settings = {
      urls: [],
      workingPath: testWorkingPath,
      tempArchiveFile: tempArchiveFilePath,
      timeout: 0
    };
    const logger = new Logger(settings);

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
      });

      describe('http downloader', function () {

        it('should throw an ENOTFOUND error for a http ulr that returns 404', function () {
          nock('http://example.com')
            .get('/plugin.tar.gz')
            .reply(404);

          const sourceUrl = 'http://example.com/plugin.tar.gz';

          return _downloadSingle(settings, logger, sourceUrl)
            .then(shouldReject, function (err) {
              expect(err.message).to.match(/ENOTFOUND/);
              expectWorkingPathEmpty();
            });
        });

        it('should throw an UnsupportedProtocolError for an invalid url', function () {
          const sourceUrl = 'i am an invalid url';

          return _downloadSingle(settings, logger, sourceUrl)
            .then(shouldReject, function (err) {
              expect(err).to.be.an(UnsupportedProtocolError);
              expectWorkingPathEmpty();
            });
        });

        it('should download a file from a valid http url', function () {
          const filePath = join(__dirname, 'replies/banana.jpg');

          nock('http://example.com')
            .defaultReplyHeaders({
              'content-length': '341965',
              'content-type': 'application/zip'
            })
            .get('/plugin.zip')
            .replyWithFile(200, filePath);

          const sourceUrl = 'http://example.com/plugin.zip';

          return _downloadSingle(settings, logger, sourceUrl)
            .then(function () {
              expectWorkingPathNotEmpty();
            });
        });

      });

      describe('local file downloader', function () {

        it('should throw an ENOTFOUND error for an invalid local file', function () {
          const filePath = join(__dirname, 'replies/i-am-not-there.zip');
          const sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

          return _downloadSingle(settings, logger, sourceUrl)
            .then(shouldReject, function (err) {
              expect(err.message).to.match(/ENOTFOUND/);
              expectWorkingPathEmpty();
            });
        });

        it('should copy a valid local file', function () {
          const filePath = join(__dirname, 'replies/banana.jpg');
          const sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

          return _downloadSingle(settings, logger, sourceUrl)
            .then(function () {
              expectWorkingPathNotEmpty();
            });
        });

      });

    });

    describe('_getFilePath', function () {
      it('should decode paths', function () {
        expect(_getFilePath('Test%20folder/file.zip')).to.equal('Test folder/file.zip');
      });

      it('should remove the leading slash from windows paths', function () {
        const platform = Object.getOwnPropertyDescriptor(process, 'platform');
        Object.defineProperty(process, 'platform', { value: 'win32' });

        expect(_getFilePath('/C:/foo/bar')).to.equal('C:/foo/bar');

        Object.defineProperty(process, 'platform', platform);
      });

    });

    describe('Windows file:// deprecation', function () {
      it('should log a warning if a file:// path is used', function () {
        const platform = Object.getOwnPropertyDescriptor(process, 'platform');
        Object.defineProperty(process, 'platform', { value: 'win32' });
        const logger = {
          log: sinon.spy()
        };
        _checkFilePathDeprecation('file://foo/bar', logger);
        _checkFilePathDeprecation('file:///foo/bar', logger);
        expect(logger.log.callCount).to.be(1);
        expect(logger.log.calledWith('Install paths with file:// are deprecated, use file:/// instead')).to.be(true);
        Object.defineProperty(process, 'platform', platform);
      });
    });

    describe('download', function () {
      it('should loop through bad urls until it finds a good one.', function () {
        const filePath = join(__dirname, 'replies/test_plugin.zip');
        settings.urls = [
          'http://example.com/badfile1.tar.gz',
          'http://example.com/badfile2.tar.gz',
          'I am a bad uri',
          'http://example.com/goodfile.tar.gz'
        ];

        nock('http://example.com')
          .defaultReplyHeaders({
            'content-length': '10'
          })
          .get('/badfile1.tar.gz')
          .reply(404)
          .get('/badfile2.tar.gz')
          .reply(404)
          .get('/goodfile.tar.gz')
          .replyWithFile(200, filePath);

        return download(settings, logger)
          .then(function () {
            expect(logger.log.getCall(0).args[0]).to.match(/badfile1.tar.gz/);
            expect(logger.log.getCall(1).args[0]).to.match(/badfile2.tar.gz/);
            expect(logger.log.getCall(2).args[0]).to.match(/I am a bad uri/);
            expect(logger.log.getCall(3).args[0]).to.match(/goodfile.tar.gz/);
            expectWorkingPathNotEmpty();
          });
      });

      it('should stop looping through urls when it finds a good one.', function () {
        const filePath = join(__dirname, 'replies/test_plugin.zip');
        settings.urls = [
          'http://example.com/badfile1.tar.gz',
          'http://example.com/badfile2.tar.gz',
          'http://example.com/goodfile.tar.gz',
          'http://example.com/badfile3.tar.gz'
        ];

        nock('http://example.com')
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

        return download(settings, logger)
          .then(function () {
            for (let i = 0; i < logger.log.callCount; i++) {
              expect(logger.log.getCall(i).args[0]).to.not.match(/badfile3.tar.gz/);
            }
            expectWorkingPathNotEmpty();
          });
      });

      it('should throw an error when it doesn\'t find a good url.', function () {
        settings.urls = [
          'http://example.com/badfile1.tar.gz',
          'http://example.com/badfile2.tar.gz',
          'http://example.com/badfile3.tar.gz'
        ];

        nock('http://example.com')
          .defaultReplyHeaders({
            'content-length': '10'
          })
          .get('/badfile1.tar.gz')
          .reply(404)
          .get('/badfile2.tar.gz')
          .reply(404)
          .get('/badfile3.tar.gz')
          .reply(404);

        return download(settings, logger)
          .then(shouldReject, function (err) {
            expect(err.message).to.match(/no valid url specified/i);
            expectWorkingPathEmpty();
          });
      });

      after(function () {
        nock.cleanAll();
      });

    });

    describe('proxy support', function () {

      const proxyPort = 2626;
      const proxyUrl = `http://localhost:${proxyPort}`;

      let proxyHit = false;

      const proxy = http.createServer(function (req, res) {
        proxyHit = true;
        // Our test proxy simply returns an empty 200 response, since we only
        // care about the download promise being resolved.
        res.writeHead(200);
        res.end();
      });

      function expectProxyHit() {
        expect(proxyHit).to.be(true);
      }

      function expectNoProxyHit() {
        expect(proxyHit).to.be(false);
      }

      function nockPluginForUrl(url) {
        nock(url)
          .get('/plugin.zip')
          .replyWithFile(200, join(__dirname, 'replies/test_plugin.zip'));
      }

      before(function (done) {
        proxy.listen(proxyPort, done);
      });

      beforeEach(function () {
        proxyHit = false;
      });

      afterEach(function () {
        delete process.env.http_proxy;
        delete process.env.https_proxy;
        delete process.env.no_proxy;
      });

      it('should use http_proxy env variable', function () {
        process.env.http_proxy = proxyUrl;
        settings.urls = ['http://example.com/plugin.zip'];

        return download(settings, logger)
          .then(expectProxyHit);
      });

      it('should use https_proxy for secure URLs', function () {
        process.env.https_proxy = proxyUrl;
        settings.urls = ['https://example.com/plugin.zip'];

        return download(settings, logger)
          .then(expectProxyHit);
      });

      it('should not use http_proxy for HTTPS urls', function () {
        process.env.http_proxy = proxyUrl;
        settings.urls = ['https://example.com/plugin.zip'];

        nockPluginForUrl('https://example.com');

        return download(settings, logger)
          .then(expectNoProxyHit);
      });

      it('should not use https_proxy for HTTP urls', function () {
        process.env.https_proxy = proxyUrl;
        settings.urls = ['http://example.com/plugin.zip'];

        nockPluginForUrl('http://example.com');

        return download(settings, logger)
          .then(expectNoProxyHit);
      });

      it('should support domains in no_proxy', function () {
        process.env.http_proxy = proxyUrl;
        process.env.no_proxy = 'foo.bar, example.com';
        settings.urls = ['http://example.com/plugin.zip'];

        nockPluginForUrl('http://example.com');

        return download(settings, logger)
          .then(expectNoProxyHit);
      });

      it('should support subdomains in no_proxy', function () {
        process.env.http_proxy = proxyUrl;
        process.env.no_proxy = 'foo.bar,plugins.example.com';
        settings.urls = ['http://plugins.example.com/plugin.zip'];

        nockPluginForUrl('http://plugins.example.com');

        return download(settings, logger)
          .then(expectNoProxyHit);
      });

      it('should accept wildcard subdomains in no_proxy', function () {
        process.env.http_proxy = proxyUrl;
        process.env.no_proxy = 'foo.bar, .example.com';
        settings.urls = ['http://plugins.example.com/plugin.zip'];

        nockPluginForUrl('http://plugins.example.com');

        return download(settings, logger)
          .then(expectNoProxyHit);
      });

      it('should support asterisk wildcard no_proxy syntax', function () {
        process.env.http_proxy = proxyUrl;
        process.env.no_proxy = '*.example.com';
        settings.urls = ['http://plugins.example.com/plugin.zip'];

        nockPluginForUrl('http://plugins.example.com');

        return download(settings, logger)
          .then(expectNoProxyHit);
      });

      it('should support implicit ports in no_proxy', function () {
        process.env.https_proxy = proxyUrl;
        process.env.no_proxy = 'example.com:443';
        settings.urls = ['https://example.com/plugin.zip'];

        nockPluginForUrl('https://example.com');

        return download(settings, logger)
          .then(expectNoProxyHit);
      });

      after(function (done) {
        proxy.close(done);
      });

    });

  });

});
