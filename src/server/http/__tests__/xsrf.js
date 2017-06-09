import expect from 'expect.js';
import sinon from 'sinon';
import { fromNode as fn } from 'bluebird';
import { resolve } from 'path';
import * as kbnTestServer from '../../../test_utils/kbn_server';

const destructiveMethods = ['POST', 'PUT', 'DELETE'];
const src = resolve.bind(null, __dirname, '../../../../src');

const xsrfHeader = 'kbn-xsrf';
const versionHeader = 'kbn-version';
const contentTypeHeader = 'content-type';
const testPath = '/xsrf/test/route';
const actualVersion = require(src('../package.json')).version;

describe('xsrf request filter', function () {
  function inject(kbnServer, opts) {
    return fn(cb => {
      kbnTestServer.makeRequest(kbnServer, opts, (resp) => {
        cb(null, resp);
      });
    });
  }

  const makeServer = async function () {
    const kbnServer = kbnTestServer.createServer({
      server: {
        xsrf: { disableProtection: false }
      }
    });

    await kbnServer.ready();

    kbnServer.server.route({
      path: testPath,
      method: 'GET',
      handler: function (req, reply) {
        reply(null, 'ok');
      }
    });

    kbnServer.server.route({
      path: testPath,
      method: destructiveMethods,
      config: {
        // Disable payload parsing to make HapiJS server accept any content-type header.
        payload: {
          parse: false
        }
      },
      handler: function (req, reply) {
        reply(null, 'ok');
      }
    });

    return kbnServer;
  };

  let kbnServer;
  beforeEach(async () => {
    kbnServer = await makeServer();
    sinon.spy(kbnServer.server, 'log');
  });

  afterEach(async () => {
    await kbnServer.close();
  });

  describe(`nonDestructiveMethod: GET`, function () {
    it('accepts requests without a token', async function () {
      const resp = await inject(kbnServer, {
        url: testPath,
        method: 'GET'
      });

      expect(resp.statusCode).to.be(200);
      expect(resp.payload).to.be('ok');
      sinon.assert.notCalled(kbnServer.server.log);
    });

    it('accepts requests with the xsrf header', async function () {
      const resp = await inject(kbnServer, {
        url: testPath,
        method: 'GET',
        headers: {
          [xsrfHeader]: 'anything',
        },
      });

      expect(resp.statusCode).to.be(200);
      expect(resp.payload).to.be('ok');
      sinon.assert.notCalled(kbnServer.server.log);
    });

    it('accepts requests with any content-type header', async function () {
      const resp = await inject(kbnServer, {
        url: testPath,
        method: 'GET',
        headers: {
          [contentTypeHeader]: 'anything',
        },
      });

      expect(resp.statusCode).to.be(200);
      expect(resp.payload).to.be('ok');
      sinon.assert.notCalled(kbnServer.server.log);
    });
  });

  describe(`nonDestructiveMethod: HEAD`, function () {
    it('accepts requests without a token', async function () {
      const resp = await inject(kbnServer, {
        url: testPath,
        method: 'HEAD'
      });

      expect(resp.statusCode).to.be(200);
      expect(resp.payload).to.be.empty();
      sinon.assert.notCalled(kbnServer.server.log);
    });

    it('accepts requests with the xsrf header', async function () {
      const resp = await inject(kbnServer, {
        url: testPath,
        method: 'HEAD',
        headers: {
          [xsrfHeader]: 'anything',
        },
      });

      expect(resp.statusCode).to.be(200);
      expect(resp.payload).to.be.empty();
      sinon.assert.notCalled(kbnServer.server.log);
    });

    it('accepts requests with any content-type header', async function () {
      const resp = await inject(kbnServer, {
        url: testPath,
        method: 'HEAD',
        headers: {
          [contentTypeHeader]: 'anything',
        },
      });

      expect(resp.statusCode).to.be(200);
      expect(resp.payload).to.be.empty();
      sinon.assert.notCalled(kbnServer.server.log);
    });
  });

  for (const method of destructiveMethods) {
    describe(`destructiveMethod: ${method}`, function () { // eslint-disable-line no-loop-func
      it('accepts requests with the xsrf header', async function () {
        const resp = await inject(kbnServer, {
          url: testPath,
          method: method,
          headers: {
            [xsrfHeader]: 'anything',
          },
        });

        expect(resp.statusCode).to.be(200);
        expect(resp.payload).to.be('ok');
        sinon.assert.calledOnce(kbnServer.server.log);
        sinon.assert.calledWith(
          kbnServer.server.log,
          ['warning', 'deprecation'],
          `The ${xsrfHeader} header is deprecated and will be removed in a future version of Kibana.` +
          ` Specify a ${contentTypeHeader} header of either application/json or application/x-ndjson instead.`
        );
      });

      // this is still valid for existing csrf protection support
      // it does not actually do any validation on the version value itself
      it('accepts requests with the version header', async function () {
        const resp = await inject(kbnServer, {
          url: testPath,
          method: method,
          headers: {
            [versionHeader]: actualVersion,
          },
        });

        expect(resp.statusCode).to.be(200);
        expect(resp.payload).to.be('ok');
        sinon.assert.calledOnce(kbnServer.server.log);
        sinon.assert.calledWith(
          kbnServer.server.log,
          ['warning', 'deprecation'],
          `The ${versionHeader} header will no longer be accepted for CSRF protection in a future version of Kibana.` +
          ` Specify a ${contentTypeHeader} header of either application/json or application/x-ndjson instead.`
        );
      });

      it('accepts requests with any allowed media type', async function () {
        const allowedContentTypes = [
          'application/json',
          'application/x-ndjson',
          'application/x-ndjson;charset=UTF-8',
          'application/json;charset=UTF-8'
        ];

        for (const contentType of allowedContentTypes) {
          const resp = await inject(kbnServer, {
            url: testPath,
            method: method,
            headers: {
              [contentTypeHeader]: contentType,
            }
          });

          expect(resp.statusCode).to.be(200);
          expect(resp.payload).to.be('ok');
          sinon.assert.notCalled(kbnServer.server.log);
        }
      });

      it('accepts requests with any allowed media type, but warns if xsrf header is presented', async function () {
        const allowedContentTypes = [
          'application/json',
          'application/x-ndjson',
          'application/x-ndjson;charset=UTF-8',
          'application/json;charset=UTF-8'
        ];

        for (const contentType of allowedContentTypes) {
          const resp = await inject(kbnServer, {
            url: testPath,
            method: method,
            headers: {
              [contentTypeHeader]: contentType,
              [xsrfHeader]: 'anything',
            }
          });

          expect(resp.statusCode).to.be(200);
          expect(resp.payload).to.be('ok');

          sinon.assert.calledOnce(kbnServer.server.log);
          sinon.assert.calledWith(
            kbnServer.server.log,
            ['warning', 'deprecation'],
            `The ${xsrfHeader} header is deprecated and will be removed in a future version of Kibana.`
          );

          kbnServer.server.log.reset();
        }
      });

      it('does not warn about version header if warned about xsrf header already', async function () {
        const resp = await inject(kbnServer, {
          url: testPath,
          method: method,
          headers: {
            [contentTypeHeader]: 'plain/text',
            [xsrfHeader]: 'anything',
            [versionHeader]: actualVersion,
          }
        });

        expect(resp.statusCode).to.be(200);
        expect(resp.payload).to.be('ok');

        sinon.assert.calledOnce(kbnServer.server.log);
        sinon.assert.calledWith(
          kbnServer.server.log,
          ['warning', 'deprecation'],
          `The ${xsrfHeader} header is deprecated and will be removed in a future version of Kibana.` +
          ` Specify a ${contentTypeHeader} header of either application/json or application/x-ndjson instead.`
        );
      });

      it('rejects requests without either an xsrf, version header or acceptable content-type', async function () {
        const resp = await inject(kbnServer, {
          url: testPath,
          method: method
        });

        expect(resp.statusCode).to.be(400);
        expect(resp.result.message).to.be(
          'Request must contain a content-type header of either application/json or application/x-ndjson.' +
          ` The content-type header for current request is undefined.`
        );
        sinon.assert.notCalled(kbnServer.server.log);
      });

      it('rejects requests with content-type that is not allowed', async function () {
        const notAllowedContentTypes = [
          'application/json-like',
          'application/x-www-form-urlencoded',
          'multipart/form-data; boundary=0',
          'text/plain;charset=UTF-8'
        ];

        for (const contentType of notAllowedContentTypes) {
          const resp = await inject(kbnServer, {
            url: testPath,
            method: method,
            headers: {
              [contentTypeHeader]: contentType,
            }
          });

          expect(resp.statusCode).to.be(400);
          expect(resp.result.message).to.be(
            'Request must contain a content-type header of either application/json or application/x-ndjson.' +
            ` The content-type header for current request is ${contentType}.`
          );
          sinon.assert.notCalled(kbnServer.server.log);
        }
      });
    });
  }
});
