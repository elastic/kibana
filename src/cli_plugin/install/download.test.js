/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import sinon from 'sinon';
import nock from 'nock';
import glob from 'glob-all';
import rimraf from 'rimraf';
import Fs from 'fs';
import Logger from '../lib/logger';
import { UnsupportedProtocolError } from '../lib/errors';
import { download, _downloadSingle, _getFilePath, _checkFilePathDeprecation } from './download';
import { join } from 'path';
import http from 'http';

describe('kibana cli', function() {
  describe('plugin downloader', function() {
    const testWorkingPath = join(__dirname, '.test.data.download');
    const tempArchiveFilePath = join(testWorkingPath, 'archive.part');

    const settings = {
      urls: [],
      workingPath: testWorkingPath,
      tempArchiveFile: tempArchiveFilePath,
      timeout: 0,
    };
    const logger = new Logger(settings);

    function expectWorkingPathEmpty() {
      const files = glob.sync('**/*', { cwd: testWorkingPath });
      expect(files).toEqual([]);
    }

    function expectWorkingPathNotEmpty() {
      const files = glob.sync('**/*', { cwd: testWorkingPath });
      const expected = ['archive.part'];

      expect(files.sort()).toEqual(expected.sort());
    }

    function shouldReject() {
      throw new Error('expected the promise to reject');
    }

    beforeEach(function() {
      sinon.stub(logger, 'log');
      sinon.stub(logger, 'error');
      rimraf.sync(testWorkingPath);
      Fs.mkdirSync(testWorkingPath, { recursive: true });
    });

    afterEach(function() {
      logger.log.restore();
      logger.error.restore();
      rimraf.sync(testWorkingPath);
    });

    describe('_downloadSingle', function() {
      beforeEach(function() {});

      describe('http downloader', function() {
        it('should throw an ENOTFOUND error for a http ulr that returns 404', function() {
          nock('http://example.com')
            .get('/plugin.tar.gz')
            .reply(404);

          const sourceUrl = 'http://example.com/plugin.tar.gz';

          return _downloadSingle(settings, logger, sourceUrl).then(shouldReject, function(err) {
            expect(err.message).toMatch(/ENOTFOUND/);
            expectWorkingPathEmpty();
          });
        });

        it('should throw an UnsupportedProtocolError for an invalid url', function() {
          const sourceUrl = 'i am an invalid url';

          return _downloadSingle(settings, logger, sourceUrl).then(shouldReject, function(err) {
            expect(err).toBeInstanceOf(UnsupportedProtocolError);
            expectWorkingPathEmpty();
          });
        });

        it('should download a file from a valid http url', function() {
          const filePath = join(__dirname, '__fixtures__/replies/banana.jpg');

          nock('http://example.com')
            .defaultReplyHeaders({
              'content-length': '341965',
              'content-type': 'application/zip',
            })
            .get('/plugin.zip')
            .replyWithFile(200, filePath);

          const sourceUrl = 'http://example.com/plugin.zip';

          return _downloadSingle(settings, logger, sourceUrl).then(function() {
            expectWorkingPathNotEmpty();
          });
        });
      });

      describe('local file downloader', function() {
        it('should throw an ENOTFOUND error for an invalid local file', function() {
          const filePath = join(__dirname, '__fixtures__/replies/i-am-not-there.zip');
          const sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

          return _downloadSingle(settings, logger, sourceUrl).then(shouldReject, function(err) {
            expect(err.message).toMatch(/ENOTFOUND/);
            expectWorkingPathEmpty();
          });
        });

        it('should copy a valid local file', function() {
          const filePath = join(__dirname, '__fixtures__/replies/banana.jpg');
          const sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

          return _downloadSingle(settings, logger, sourceUrl).then(function() {
            expectWorkingPathNotEmpty();
          });
        });
      });
    });

    describe('_getFilePath', function() {
      it('should decode paths', function() {
        expect(_getFilePath('Test%20folder/file.zip')).toBe('Test folder/file.zip');
      });

      it('should remove the leading slash from windows paths', function() {
        const platform = Object.getOwnPropertyDescriptor(process, 'platform');
        Object.defineProperty(process, 'platform', { value: 'win32' });

        expect(_getFilePath('/C:/foo/bar')).toBe('C:/foo/bar');

        Object.defineProperty(process, 'platform', platform);
      });
    });

    describe('Windows file:// deprecation', function() {
      it('should log a warning if a file:// path is used', function() {
        const platform = Object.getOwnPropertyDescriptor(process, 'platform');
        Object.defineProperty(process, 'platform', { value: 'win32' });
        const logger = {
          log: sinon.spy(),
        };
        _checkFilePathDeprecation('file://foo/bar', logger);
        _checkFilePathDeprecation('file:///foo/bar', logger);
        expect(logger.log.callCount).toBe(1);
        expect(
          logger.log.calledWith('Install paths with file:// are deprecated, use file:/// instead')
        ).toBe(true);
        Object.defineProperty(process, 'platform', platform);
      });
    });

    describe('download', function() {
      it('should loop through bad urls until it finds a good one.', function() {
        const filePath = join(__dirname, '__fixtures__/replies/test_plugin.zip');
        settings.urls = [
          'http://example.com/badfile1.tar.gz',
          'http://example.com/badfile2.tar.gz',
          'I am a bad uri',
          'http://example.com/goodfile.tar.gz',
        ];

        nock('http://example.com')
          .defaultReplyHeaders({
            'content-length': '10',
          })
          .get('/badfile1.tar.gz')
          .reply(404)
          .get('/badfile2.tar.gz')
          .reply(404)
          .get('/goodfile.tar.gz')
          .replyWithFile(200, filePath);

        return download(settings, logger).then(function() {
          expect(logger.log.getCall(0).args[0]).toMatch(/badfile1.tar.gz/);
          expect(logger.log.getCall(1).args[0]).toMatch(/badfile2.tar.gz/);
          expect(logger.log.getCall(2).args[0]).toMatch(/I am a bad uri/);
          expect(logger.log.getCall(3).args[0]).toMatch(/goodfile.tar.gz/);
          expectWorkingPathNotEmpty();
        });
      });

      it('should stop looping through urls when it finds a good one.', function() {
        const filePath = join(__dirname, '__fixtures__/replies/test_plugin.zip');
        settings.urls = [
          'http://example.com/badfile1.tar.gz',
          'http://example.com/badfile2.tar.gz',
          'http://example.com/goodfile.tar.gz',
          'http://example.com/badfile3.tar.gz',
        ];

        nock('http://example.com')
          .defaultReplyHeaders({
            'content-length': '10',
          })
          .get('/badfile1.tar.gz')
          .reply(404)
          .get('/badfile2.tar.gz')
          .reply(404)
          .get('/goodfile.tar.gz')
          .replyWithFile(200, filePath)
          .get('/badfile3.tar.gz')
          .reply(404);

        return download(settings, logger).then(function() {
          for (let i = 0; i < logger.log.callCount; i++) {
            expect(logger.log.getCall(i).args[0]).not.toMatch(/badfile3.tar.gz/);
          }
          expectWorkingPathNotEmpty();
        });
      });

      it("should throw an error when it doesn't find a good url.", function() {
        settings.urls = [
          'http://example.com/badfile1.tar.gz',
          'http://example.com/badfile2.tar.gz',
          'http://example.com/badfile3.tar.gz',
        ];

        nock('http://example.com')
          .defaultReplyHeaders({
            'content-length': '10',
          })
          .get('/badfile1.tar.gz')
          .reply(404)
          .get('/badfile2.tar.gz')
          .reply(404)
          .get('/badfile3.tar.gz')
          .reply(404);

        return download(settings, logger).then(shouldReject, function(err) {
          expect(err.message).toMatch(/no valid url specified/i);
          expectWorkingPathEmpty();
        });
      });

      afterAll(function() {
        nock.cleanAll();
      });
    });

    describe('proxy support', function() {
      const proxyPort = 2626;
      const proxyUrl = `http://localhost:${proxyPort}`;

      let proxyHit = false;
      let proxyConnectHit = false;

      const proxy = http.createServer(function(req, res) {
        proxyHit = true;
        // Our test proxy simply returns an empty 200 response, since we only
        // care about the download promise being resolved.
        res.writeHead(200);
        res.end();
      });

      proxy.on('connect', (req, socket) => {
        // When the proxy is hit with a HTTPS request instead of a HTTP request,
        // the above call handler will never be triggered. Instead the client
        // sends a CONNECT request to the proxy, so that the proxy can setup
        // a HTTPS connection between the client and the upstream server.
        // We just intercept this CONNECT call here, write it an empty response
        // and close the socket, which will fail the actual request, but we know
        // that it tried to use the proxy.
        proxyConnectHit = true;
        socket.write('\r\n\r\n');
        socket.end();
      });

      function expectProxyHit() {
        expect(proxyHit).toBe(true);
      }

      function expectNoProxyHit() {
        expect(proxyHit).toBe(false);
        expect(proxyConnectHit).toBe(false);
      }

      function nockPluginForUrl(url) {
        nock(url)
          .get('/plugin.zip')
          .replyWithFile(200, join(__dirname, '__fixtures__/replies/test_plugin.zip'));
      }

      beforeAll(function(done) {
        proxy.listen(proxyPort, done);
      });

      beforeEach(function() {
        proxyHit = false;
        proxyConnectHit = false;
      });

      afterEach(function() {
        delete process.env.http_proxy;
        delete process.env.https_proxy;
        delete process.env.no_proxy;
      });

      it('should use http_proxy env variable', function() {
        process.env.http_proxy = proxyUrl;
        settings.urls = ['http://example.com/plugin.zip'];

        return download(settings, logger).then(expectProxyHit);
      });

      it('should use https_proxy for secure URLs', function() {
        process.env.https_proxy = proxyUrl;
        settings.urls = ['https://example.com/plugin.zip'];

        return download(settings, logger).then(
          () => {
            // If the proxy is hit, the request should fail, since our test proxy
            // doesn't actually forward HTTPS requests.
            expect().fail('Should not succeed a HTTPS proxy request.');
          },
          () => {
            // Check if the proxy was actually hit before the failure.
            expect(proxyConnectHit).toBe(true);
          }
        );
      });

      it('should not use http_proxy for HTTPS urls', function() {
        process.env.http_proxy = proxyUrl;
        settings.urls = ['https://example.com/plugin.zip'];

        nockPluginForUrl('https://example.com');

        return download(settings, logger).then(expectNoProxyHit);
      });

      it('should not use https_proxy for HTTP urls', function() {
        process.env.https_proxy = proxyUrl;
        settings.urls = ['http://example.com/plugin.zip'];

        nockPluginForUrl('http://example.com');

        return download(settings, logger).then(expectNoProxyHit);
      });

      it('should support domains in no_proxy', function() {
        process.env.http_proxy = proxyUrl;
        process.env.no_proxy = 'foo.bar, example.com';
        settings.urls = ['http://example.com/plugin.zip'];

        nockPluginForUrl('http://example.com');

        return download(settings, logger).then(expectNoProxyHit);
      });

      it('should support subdomains in no_proxy', function() {
        process.env.http_proxy = proxyUrl;
        process.env.no_proxy = 'foo.bar,plugins.example.com';
        settings.urls = ['http://plugins.example.com/plugin.zip'];

        nockPluginForUrl('http://plugins.example.com');

        return download(settings, logger).then(expectNoProxyHit);
      });

      it('should accept wildcard subdomains in no_proxy', function() {
        process.env.http_proxy = proxyUrl;
        process.env.no_proxy = 'foo.bar, .example.com';
        settings.urls = ['http://plugins.example.com/plugin.zip'];

        nockPluginForUrl('http://plugins.example.com');

        return download(settings, logger).then(expectNoProxyHit);
      });

      it('should support asterisk wildcard no_proxy syntax', function() {
        process.env.http_proxy = proxyUrl;
        process.env.no_proxy = '*.example.com';
        settings.urls = ['http://plugins.example.com/plugin.zip'];

        nockPluginForUrl('http://plugins.example.com');

        return download(settings, logger).then(expectNoProxyHit);
      });

      it('should support implicit ports in no_proxy', function() {
        process.env.https_proxy = proxyUrl;
        process.env.no_proxy = 'example.com:443';
        settings.urls = ['https://example.com/plugin.zip'];

        nockPluginForUrl('https://example.com');

        return download(settings, logger).then(expectNoProxyHit);
      });

      afterAll(function(done) {
        proxy.close(done);
      });
    });
  });
});
