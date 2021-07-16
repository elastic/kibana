/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createListStream, createConcatStream, createPromiseFromStreams } from '@kbn/utils';
import { ToolingLog, ToolingLogCollectingWriter, createStripAnsiSerializer } from '@kbn/dev-utils';

import { Sha512PassThrough, isExistingAndValid } from './checksum';
import { ChecksumFile } from './checksum_file';

jest.mock('fs/promises');
const Fs = jest.requireMock('fs/promises');

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    createReadStream: jest.fn(),
  };
});
const { createReadStream } = jest.requireMock('fs');

expect.addSnapshotSerializer(createStripAnsiSerializer());

const logCollector = new ToolingLogCollectingWriter();
const log = new ToolingLog();
log.setWriters([logCollector]);

const DATA = 'foobarbaz';
const HASH =
  'cb377c10b0f5a62c803625a799d9e908be45e767f5d147d4744907cb05597aa4edd329a0af147add0cf4181ed328fa1e7994265826b3ed3d7ef6f067ca99185a';

beforeEach(() => {
  logCollector.messages.length = 0;
  jest.clearAllMocks();
  Fs.readFile.mockReset();
  createReadStream.mockReset();
});

describe('Sha512PassThrough', () => {
  it('hashes content in pipeline and passes it through to the next stream', async () => {
    const hash = new Sha512PassThrough();
    const result = await createPromiseFromStreams([
      createListStream(DATA.split('')),
      hash,
      createConcatStream(''),
    ]);

    expect(result).toBe(DATA);
    expect(hash.getHex()).toBe(HASH);
  });
});

describe('isExistingAndValid', () => {
  it('validates a file by reading it and its hash file from disk', async () => {
    // used to read archive
    createReadStream.mockImplementation(() => createListStream(DATA.split('')));
    // used to read hash file
    Fs.readFile.mockImplementation(async () => {
      return `${HASH}  filename.tar.gz`;
    });

    expect(await isExistingAndValid(log, '/foo/filename.tar.gz')).toBe(true);

    expect(logCollector.messages).toMatchInlineSnapshot(`
      Array [
        " sill reading checksum for archive at /foo/filename.tar.gz",
        " debg [/foo/filename.tar.gz] matches checksum",
      ]
    `);
    expect(createReadStream.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/foo/filename.tar.gz",
        ],
      ]
    `);
    expect(Fs.readFile.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/foo/filename.tar.gz.sha512",
          "utf-8",
        ],
      ]
    `);
    expect(Fs.rm.mock.calls).toMatchInlineSnapshot(`Array []`);
  });

  it(`deleted the source file if its hash file doesn't exist`, async () => {
    // used to read archive
    createReadStream.mockImplementation(() => createListStream(DATA.split('')));
    // used to read hash file
    Fs.readFile.mockImplementation(async () => {
      const error: any = new Error('file not found');
      error.code = 'ENOENT';
      throw error;
    });

    expect(await isExistingAndValid(log, '/foo/filename.tar.gz')).toBe(false);

    expect(logCollector.messages).toMatchInlineSnapshot(`
      Array [
        " sill reading checksum for archive at /foo/filename.tar.gz",
        " debg [/foo/filename.tar.gz.sha512] does not exist",
      ]
    `);
    expect(Fs.rm.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/foo/filename.tar.gz",
          Object {
            "force": true,
            "recursive": true,
          },
        ],
        Array [
          "/foo/filename.tar.gz.sha512",
          Object {
            "force": true,
            "recursive": true,
          },
        ],
      ]
    `);
  });

  it(`deletes the source file and its hash file if hash doesn't match`, async () => {
    // used to read archive
    createReadStream.mockImplementation(() => createListStream(DATA.split('')));
    // used to read hash file
    Fs.readFile.mockImplementation(async () => {
      return `invalid  filename.tar.gz`;
    });

    expect(await isExistingAndValid(log, '/foo/filename.tar.gz')).toBe(false);

    expect(logCollector.messages).toMatchInlineSnapshot(`
      Array [
        " sill reading checksum for archive at /foo/filename.tar.gz",
        " debg [/foo/filename.tar.gz] does not match checksum, deleting",
      ]
    `);
    expect(Fs.rm.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/foo/filename.tar.gz",
          Object {
            "force": true,
            "recursive": true,
          },
        ],
        Array [
          "/foo/filename.tar.gz.sha512",
          Object {
            "force": true,
            "recursive": true,
          },
        ],
      ]
    `);
  });

  it(`deletes the source file and its hash file if the required checksum doesn't match`, async () => {
    // used to read archive
    createReadStream.mockImplementation(() => createListStream(DATA.split('')));
    // used to read hash file
    Fs.readFile.mockImplementation(async () => {
      return `${HASH}  filename.tar.gz`;
    });

    expect(await isExistingAndValid(log, '/foo/filename.tar.gz', new ChecksumFile('invalid'))).toBe(
      false
    );

    expect(logCollector.messages).toMatchInlineSnapshot(`
      Array [
        " sill reading checksum for archive at /foo/filename.tar.gz",
        " debg [/foo/filename.tar.gz] does not match required checksum, deleting",
      ]
    `);
    expect(Fs.rm.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/foo/filename.tar.gz",
          Object {
            "force": true,
            "recursive": true,
          },
        ],
        Array [
          "/foo/filename.tar.gz.sha512",
          Object {
            "force": true,
            "recursive": true,
          },
        ],
      ]
    `);
  });
});
