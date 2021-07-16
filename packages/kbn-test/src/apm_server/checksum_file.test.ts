/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ToolingLog,
  ToolingLogCollectingWriter,
  createAnyInstanceSerializer,
} from '@kbn/dev-utils';

import { ChecksumFile } from './checksum_file';

jest.mock('fs/promises');
const Fs = jest.requireMock('fs/promises');
Fs.readFile.mockImplementation(async (path: string) => {
  if (path.startsWith('/missing')) {
    const error: any = new Error('file not found');
    error.code = 'ENOENT';
    throw error;
  }

  return 'checksum-from-disk file.tar.gz';
});

jest.mock('./download');
const { downloadText } = jest.requireMock('./download');
downloadText.mockImplementation(async () => {
  return 'downloaded-checksum file.tar.gz';
});

expect.addSnapshotSerializer(createAnyInstanceSerializer(ToolingLog));

const logCollector = new ToolingLogCollectingWriter();
const log = new ToolingLog();
log.setWriters([logCollector]);

beforeEach(() => {
  logCollector.messages.length = 0;
  jest.clearAllMocks();
});

describe('::fromArchiveUrl', () => {
  it('downloads the checksum', async () => {
    const checksum = await ChecksumFile.fromArchiveUrl(log, 'https://foo/bar');
    expect(downloadText.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <ToolingLog>,
          "https://foo/bar.sha512",
        ],
      ]
    `);
    expect(checksum).toMatchInlineSnapshot(`
      ChecksumFile {
        "content": "downloaded-checksum file.tar.gz",
        "sha512Hex": "downloaded-checksum",
      }
    `);
  });
});

describe('::fromArchivePath', () => {
  it('reads checksum from filesystem', async () => {
    const checksum = await ChecksumFile.fromArchivePath(log, '/foo/bar');
    expect(Fs.readFile.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/foo/bar.sha512",
          "utf-8",
        ],
      ]
    `);
    expect(checksum).toMatchInlineSnapshot(`
      ChecksumFile {
        "content": "checksum-from-disk file.tar.gz",
        "sha512Hex": "checksum-from-disk",
      }
    `);
  });

  it(`returns undefined if file doesn't exist`, async () => {
    const checksum = await ChecksumFile.fromArchivePath(log, '/missing/bar');
    expect(Fs.readFile.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/missing/bar.sha512",
          "utf-8",
        ],
      ]
    `);
    expect(checksum).toMatchInlineSnapshot(`undefined`);
  });
});
