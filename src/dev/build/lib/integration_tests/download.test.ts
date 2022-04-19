/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { join } from 'path';
import { tmpdir } from 'os';
import { readFileSync } from 'fs';

import del from 'del';
import { CI_PARALLEL_PROCESS_PREFIX } from '@kbn/test';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import { createStripAnsiSerializer, createReplaceSerializer } from '@kbn/jest-serializers';

import { mkdirp } from '../fs';
import { downloadToDisk, downloadToString } from '../download';

const TMP_DIR = join(tmpdir(), CI_PARALLEL_PROCESS_PREFIX, 'download-js-test-tmp-dir');
const TMP_DESTINATION = join(TMP_DIR, '__tmp_download_js_test_file__');

expect.addSnapshotSerializer(createStripAnsiSerializer());
expect.addSnapshotSerializer(createReplaceSerializer(TMP_DIR, 'TMP_DIR'));
expect.addSnapshotSerializer(
  createReplaceSerializer(/http:\/\/localhost:\d+\//g, 'TEST_SERVER_URL')
);

beforeEach(async () => {
  await del(TMP_DIR, { force: true });
  await mkdirp(TMP_DIR);
  jest.clearAllMocks();
});

afterEach(async () => {
  await del(TMP_DIR, { force: true });
});

const logWritter = new ToolingLogCollectingWriter('verbose');
const log = new ToolingLog();
log.setWriters([logWritter]);
afterEach(() => {
  logWritter.messages.length = 0;
});

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

const FOO_SHA256 = '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';
const createSendHandler =
  (send: any): Handler =>
  (req, res) => {
    res.statusCode = 200;
    res.end(send);
  };
const sendErrorHandler: Handler = (req, res) => {
  res.statusCode = 500;
  res.end();
};

let serverUrl: string;
const handlers: Handler[] = [];
const server = createServer((req, res) => {
  (handlers.shift() ?? sendErrorHandler)(req, res);
});

afterEach(() => {
  handlers.length = 0;
});

beforeAll(async () => {
  await Promise.race([
    new Promise((_, reject) => {
      server.once('error', reject);
    }),
    new Promise((resolve) => {
      server.listen(resolve);
    }),
  ]);

  // address is only a string when listening to a UNIX socket, and undefined when we haven't called listen() yet
  const address = server.address() as { port: number };

  serverUrl = `http://localhost:${address.port}/`;
});

afterAll(async () => {
  server.close();
});

describe('downloadToDisk', () => {
  it('downloads from URL and checks that content matches sha256', async () => {
    handlers.push(createSendHandler('foo'));
    await downloadToDisk({
      log,
      url: serverUrl,
      destination: TMP_DESTINATION,
      shaChecksum: FOO_SHA256,
      shaAlgorithm: 'sha256',
    });
    expect(readFileSync(TMP_DESTINATION, 'utf8')).toBe('foo');
  });

  it('rejects and deletes destination if sha256 does not match', async () => {
    handlers.push(createSendHandler('foo'));

    const promise = downloadToDisk({
      log,
      url: serverUrl,
      destination: TMP_DESTINATION,
      shaChecksum: 'bar',
      shaAlgorithm: 'sha256',
    });
    await expect(promise).rejects.toMatchInlineSnapshot(
      `[Error: Downloaded checksum 2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae does not match the expected sha256 checksum.]`
    );

    try {
      readFileSync(TMP_DESTINATION);
      throw new Error('Expected download to be deleted');
    } catch (error) {
      expect(error).toHaveProperty('code', 'ENOENT');
    }
  });

  describe('reties download retries: number of times', () => {
    it('resolves if retries = 1 and first attempt fails', async () => {
      handlers.push(sendErrorHandler, createSendHandler('foo'));

      await downloadToDisk({
        log,
        url: serverUrl,
        destination: TMP_DESTINATION,
        shaChecksum: FOO_SHA256,
        shaAlgorithm: 'sha256',
        maxAttempts: 2,
        retryDelaySecMultiplier: 0.1,
      });

      expect(readFileSync(TMP_DESTINATION, 'utf8')).toBe('foo');
      expect(logWritter.messages).toMatchInlineSnapshot(`
        Array [
          " debg [1/2] Attempting download of TEST_SERVER_URL sha256",
          " debg Downloaded 0 bytes to TMP_DIR/__tmp_download_js_test_file__",
          " debg Download failed: Request failed with status code 500",
          " debg Deleting downloaded data at TMP_DIR/__tmp_download_js_test_file__",
          " info Retrying in 0.1 seconds",
          " debg [2/2] Attempting download of TEST_SERVER_URL sha256",
          " debg Downloaded 3 bytes to TMP_DIR/__tmp_download_js_test_file__",
          " debg Downloaded TEST_SERVER_URL and verified checksum",
        ]
      `);
    });

    it('resolves if first fails, second is bad shasum, but third succeeds', async () => {
      handlers.push(sendErrorHandler, createSendHandler('bar'), createSendHandler('foo'));

      await downloadToDisk({
        log,
        url: serverUrl,
        destination: TMP_DESTINATION,
        shaChecksum: FOO_SHA256,
        shaAlgorithm: 'sha256',
        maxAttempts: 3,
        retryDelaySecMultiplier: 0.1,
      });

      expect(logWritter.messages).toMatchInlineSnapshot(`
        Array [
          " debg [1/3] Attempting download of TEST_SERVER_URL sha256",
          " debg Downloaded 0 bytes to TMP_DIR/__tmp_download_js_test_file__",
          " debg Download failed: Request failed with status code 500",
          " debg Deleting downloaded data at TMP_DIR/__tmp_download_js_test_file__",
          " info Retrying in 0.1 seconds",
          " debg [2/3] Attempting download of TEST_SERVER_URL sha256",
          " debg Downloaded 3 bytes to TMP_DIR/__tmp_download_js_test_file__",
          " debg Download failed: Downloaded checksum fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9 does not match the expected sha256 checksum.",
          " debg Deleting downloaded data at TMP_DIR/__tmp_download_js_test_file__",
          " info Retrying in 0.2 seconds",
          " debg [3/3] Attempting download of TEST_SERVER_URL sha256",
          " debg Downloaded 3 bytes to TMP_DIR/__tmp_download_js_test_file__",
          " debg Downloaded TEST_SERVER_URL and verified checksum",
        ]
      `);
    });

    it('makes 5 requests if `maxAttempts: 5` and all failed', async () => {
      const promise = downloadToDisk({
        log,
        url: serverUrl,
        destination: TMP_DESTINATION,
        shaChecksum: FOO_SHA256,
        shaAlgorithm: 'sha256',
        maxAttempts: 5,
        retryDelaySecMultiplier: 0.1,
      });
      await expect(promise).rejects.toMatchInlineSnapshot(
        `[Error: Request failed with status code 500]`
      );
      expect(logWritter.messages).toMatchInlineSnapshot(`
        Array [
          " debg [1/5] Attempting download of TEST_SERVER_URL sha256",
          " debg Downloaded 0 bytes to TMP_DIR/__tmp_download_js_test_file__",
          " debg Download failed: Request failed with status code 500",
          " debg Deleting downloaded data at TMP_DIR/__tmp_download_js_test_file__",
          " info Retrying in 0.1 seconds",
          " debg [2/5] Attempting download of TEST_SERVER_URL sha256",
          " debg Downloaded 0 bytes to TMP_DIR/__tmp_download_js_test_file__",
          " debg Download failed: Request failed with status code 500",
          " debg Deleting downloaded data at TMP_DIR/__tmp_download_js_test_file__",
          " info Retrying in 0.2 seconds",
          " debg [3/5] Attempting download of TEST_SERVER_URL sha256",
          " debg Downloaded 0 bytes to TMP_DIR/__tmp_download_js_test_file__",
          " debg Download failed: Request failed with status code 500",
          " debg Deleting downloaded data at TMP_DIR/__tmp_download_js_test_file__",
          " info Retrying in 0.30000000000000004 seconds",
          " debg [4/5] Attempting download of TEST_SERVER_URL sha256",
          " debg Downloaded 0 bytes to TMP_DIR/__tmp_download_js_test_file__",
          " debg Download failed: Request failed with status code 500",
          " debg Deleting downloaded data at TMP_DIR/__tmp_download_js_test_file__",
          " info Retrying in 0.4 seconds",
          " debg [5/5] Attempting download of TEST_SERVER_URL sha256",
          " debg Downloaded 0 bytes to TMP_DIR/__tmp_download_js_test_file__",
          " debg Download failed: Request failed with status code 500",
          " debg Deleting downloaded data at TMP_DIR/__tmp_download_js_test_file__",
        ]
      `);
    });
  });

  describe('sha256 option not supplied', () => {
    it('refuses to download', async () => {
      // @ts-expect-error missing sha256 param is intentional
      const promise = downloadToDisk({
        log,
        url: 'http://google.com',
        destination: TMP_DESTINATION,
      });

      await expect(promise).rejects.toMatchInlineSnapshot(
        `[Error: undefined checksum of http://google.com not provided, refusing to download.]`
      );
    });
  });
});

describe('downloadToString', () => {
  it('returns a string from the server', async () => {
    handlers.push(createSendHandler('foo bar'));

    const result = await downloadToString({ log, url: serverUrl });
    expect(result).toBe('foo bar');
    expect(logWritter.messages).toMatchInlineSnapshot(`
      Array [
        " debg [1/3] Attempting download to string of [TEST_SERVER_URL]",
        " succ Downloaded [TEST_SERVER_URL]",
      ]
    `);
  });

  it(`throws when expectStatus doesn't match`, async () => {
    handlers.push(createSendHandler('foo'));

    const promise = downloadToString({
      log,
      url: serverUrl,
      expectStatus: 201,
      maxAttempts: 1,
    });
    await expect(promise).rejects.toMatchInlineSnapshot(
      `[Error: Request failed with status code 200]`
    );
    expect(logWritter.messages).toMatchInlineSnapshot(`
      Array [
        " debg [1/1] Attempting download to string of [TEST_SERVER_URL]",
        " warn Download failed: Request failed with status code 200",
        " debg [200/OK] response: foo",
      ]
    `);
  });

  it(`retries when expectStatus doesn't match`, async () => {
    handlers.push(
      (_, res) => {
        res.statusCode = 500;
        res.end('something went wrong');
      },
      (_, res) => {
        res.statusCode = 404;
        res.end('not found');
      },
      (_, res) => {
        res.statusCode = 201;
        res.end('bar');
      }
    );

    const result = await downloadToString({
      log,
      url: serverUrl,
      expectStatus: 201,
      retryDelaySecMultiplier: 0.1,
    });

    expect(result).toBe('bar');
    expect(logWritter.messages).toMatchInlineSnapshot(`
      Array [
        " debg [1/3] Attempting download to string of [TEST_SERVER_URL]",
        " warn Download failed: Request failed with status code 500",
        " debg [500/Internal Server Error] response: something went wrong",
        " info Retrying in 0.1 seconds",
        " debg [2/3] Attempting download to string of [TEST_SERVER_URL]",
        " warn Download failed: Request failed with status code 404",
        " debg [404/Not Found] response: not found",
        " info Retrying in 0.2 seconds",
        " debg [3/3] Attempting download to string of [TEST_SERVER_URL]",
        " succ Downloaded [TEST_SERVER_URL]",
      ]
    `);
  });
});
