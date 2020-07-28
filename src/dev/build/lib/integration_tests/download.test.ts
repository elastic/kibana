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

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { join } from 'path';
import { tmpdir } from 'os';
import { readFileSync } from 'fs';

import del from 'del';
import { CI_PARALLEL_PROCESS_PREFIX } from '@kbn/test';
import { ToolingLog } from '@kbn/dev-utils';

import { mkdirp } from '../fs';
import { download } from '../download';

const TMP_DIR = join(tmpdir(), CI_PARALLEL_PROCESS_PREFIX, 'download-js-test-tmp-dir');
const TMP_DESTINATION = join(TMP_DIR, '__tmp_download_js_test_file__');

beforeEach(async () => {
  await del(TMP_DIR, { force: true });
  await mkdirp(TMP_DIR);
  jest.clearAllMocks();
});

afterEach(async () => {
  await del(TMP_DIR, { force: true });
});

const onLogLine = jest.fn();
const log = new ToolingLog({
  level: 'verbose',
  writeTo: {
    write: onLogLine,
  },
});

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

const FOO_SHA256 = '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';
const createSendHandler = (send: any): Handler => (req, res) => {
  res.statusCode = 200;
  res.end(send);
};
const sendErrorHandler: Handler = (req, res) => {
  res.statusCode = 500;
  res.end();
};

let serverUrl: string;
let nextHandler: Handler | null = null;
const server = createServer((req, res) => {
  if (!nextHandler) {
    nextHandler = sendErrorHandler;
  }

  const handler = nextHandler;
  nextHandler = null;
  handler(req, res);
});

afterEach(() => (nextHandler = null));

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

it('downloads from URL and checks that content matches sha256', async () => {
  nextHandler = createSendHandler('foo');
  await download({
    log,
    url: serverUrl,
    destination: TMP_DESTINATION,
    sha256: FOO_SHA256,
  });
  expect(readFileSync(TMP_DESTINATION, 'utf8')).toBe('foo');
});

it('rejects and deletes destination if sha256 does not match', async () => {
  nextHandler = createSendHandler('foo');

  try {
    await download({
      log,
      url: serverUrl,
      destination: TMP_DESTINATION,
      sha256: 'bar',
    });
    throw new Error('Expected download() to reject');
  } catch (error) {
    expect(error).toHaveProperty(
      'message',
      expect.stringContaining('does not match the expected sha256 checksum')
    );
  }

  try {
    readFileSync(TMP_DESTINATION);
    throw new Error('Expected download to be deleted');
  } catch (error) {
    expect(error).toHaveProperty('code', 'ENOENT');
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

    expect(readFileSync(TMP_DESTINATION, 'utf8')).toBe('foo');
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

  it('makes 6 requests if `retries: 5` and all failed', async () => {
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
      expect(error).toHaveProperty(
        'message',
        expect.stringContaining('Request failed with status code 500')
      );
      expect(reqCount).toBe(6);
    }
  });
});

describe('sha256 option not supplied', () => {
  it('refuses to download', async () => {
    try {
      // @ts-expect-error missing sha256 param is intentional
      await download({
        log,
        url: 'http://google.com',
        destination: TMP_DESTINATION,
      });

      throw new Error('expected download() to reject');
    } catch (error) {
      expect(error).toHaveProperty('message', expect.stringContaining('refusing to download'));
    }
  });
});
