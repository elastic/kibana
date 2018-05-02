import { createServer } from 'http';
import { resolve } from 'path';
import { readFileSync } from 'fs';

import del from 'del';
import sinon from 'sinon';
import expect from 'expect.js';
import Wreck from 'wreck';

import { createToolingLog } from '../../../../tooling_log';
import { download } from '../download';

const TMP_DESTINATION = resolve(__dirname, '__tmp__');
beforeEach(async () => {
  await del(TMP_DESTINATION);
});
after(async () => {
  await del(TMP_DESTINATION);
});

describe('src/dev/build/tasks/nodejs/download', () => {
  const sandbox = sinon.sandbox.create();
  afterEach(() => sandbox.reset());

  const log = createToolingLog('verbose');
  const onLogLine = sandbox.stub();
  log.on('data', onLogLine);

  const FOO_SHA256 = '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';
  const createSendHandler = (send) => (req, res) => {
    res.statusCode = 200;
    res.end(send);
  };
  const sendErrorHandler = (req, res) => {
    res.statusCode = 500;
    res.end();
  };

  let server;
  let serverUrl;
  let nextHandler;
  afterEach(() => nextHandler = null);

  before(async () => {
    server = createServer((req, res) => {
      if (!nextHandler) {
        nextHandler = sendErrorHandler;
      }

      const handler = nextHandler;
      nextHandler = null;
      handler(req, res);
    });

    await Promise.race([
      new Promise((resolve, reject) => {
        server.once('error', reject);
      }),
      new Promise((resolve) => {
        server.listen(resolve);
      })
    ]);

    serverUrl = `http://localhost:${server.address().port}/`;
  });

  after(async () => {
    server.close();
    server = null;
  });

  it('downloads from URL and checks that content matches sha256', async () => {
    nextHandler = createSendHandler('foo');
    await download({
      log,
      url: serverUrl,
      destination: TMP_DESTINATION,
      sha256: FOO_SHA256
    });
    expect(readFileSync(TMP_DESTINATION, 'utf8')).to.be('foo');
  });

  it('rejects and deletes destination if sha256 does not match', async () => {
    nextHandler = createSendHandler('foo');

    try {
      await download({
        log,
        url: serverUrl,
        destination: TMP_DESTINATION,
        sha256: 'bar'
      });
      throw new Error('Expected download() to reject');
    } catch (error) {
      expect(error).to.have.property('message').contain('does not match the expected sha256 checksum');
    }

    try {
      readFileSync(TMP_DESTINATION);
      throw new Error('Expected download to be deleted');
    } catch (error) {
      expect(error).to.have.property('code', 'ENOENT');
    }
  });

  describe('reties download retries: number of times', () => {
    it('resolves if retries = 1 and first attempt fails', async () => {
      let reqCount = 0;
      nextHandler = function sequenceHandler(req, res) {
        switch (++reqCount) {
          case 1:
            nextHandler = sequenceHandler;
            return sendErrorHandler(req, res);
          default:
            return createSendHandler('foo')(req, res);
        }
      };

      await download({
        log,
        url: serverUrl,
        destination: TMP_DESTINATION,
        sha256: FOO_SHA256,
        retries: 2,
      });

      expect(readFileSync(TMP_DESTINATION, 'utf8')).to.be('foo');
    });

    it('resolves if first fails, second is bad shasum, but third succeeds', async () => {
      let reqCount = 0;
      nextHandler = function sequenceHandler(req, res) {
        switch (++reqCount) {
          case 1:
            nextHandler = sequenceHandler;
            return sendErrorHandler(req, res);
          case 2:
            nextHandler = sequenceHandler;
            return createSendHandler('bar')(req, res);
          default:
            return createSendHandler('foo')(req, res);
        }
      };

      await download({
        log,
        url: serverUrl,
        destination: TMP_DESTINATION,
        sha256: FOO_SHA256,
        retries: 2,
      });
    });

    it('makes 6 sequests if `retries: 5` and all failed', async () => {
      let reqCount = 0;
      nextHandler = function sequenceHandler(req, res) {
        reqCount += 1;
        nextHandler = sequenceHandler;
        sendErrorHandler(req, res);
      };

      try {
        await download({
          log,
          url: serverUrl,
          destination: TMP_DESTINATION,
          sha256: FOO_SHA256,
          retries: 5,
        });
        throw new Error('Expected download() to reject');
      } catch (error) {
        expect(error).to.have.property('message').contain('Unexpected status code 500');
        expect(reqCount).to.be(6);
      }
    });
  });

  describe('sha256 option not supplied', () => {
    before(() => {
      sinon.spy(Wreck, 'request');
    });
    after(() => {
      Wreck.request.restore();
    });

    it('refuses to download', async () => {
      try {
        await download({
          log,
          url: 'http://google.com',
          destination: TMP_DESTINATION
        });

        throw new Error('expected download() to reject');
      } catch (error) {
        expect(error).to.have.property('message').contain('refusing to download');
      }
    });
  });
});
