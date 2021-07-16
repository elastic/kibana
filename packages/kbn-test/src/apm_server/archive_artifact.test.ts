/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import {
  REPO_ROOT,
  ToolingLog,
  ToolingLogCollectingWriter,
  createAnyInstanceSerializer,
  createAbsolutePathSerializer,
  createStripAnsiSerializer,
} from '@kbn/dev-utils';

import { ArchiveArtifact } from './archive_artifact';
import type { Platform } from './platforms';
import { ChecksumFile } from './checksum_file';

jest.mock('fs/promises');
const Fs = jest.requireMock('fs/promises');
Fs.readFile.mockImplementation((path: string) => {
  return `[content of <repoRoot>/${Path.relative(REPO_ROOT, path)}]`;
});

jest.mock('./download');
const { downloadText, downloadAndValidate } = jest.requireMock('./download');
downloadText.mockImplementation((_: unknown, url: string) => {
  return `from-${url}`;
});

jest.mock('./platforms');
const { getThisPlatform } = jest.requireMock('./platforms');
getThisPlatform.mockImplementation(() => {
  const p: Platform = {
    archiveName: 'archive-name-for-this-platform.zip',
    archiveType: 'zip',
    executableName: 'apm-server',
    getApiPackage() {
      return undefined;
    },
  };

  return p;
});

jest.mock('./checksum');
const { isExistingAndValid } = jest.requireMock('./checksum');

expect.addSnapshotSerializer(createStripAnsiSerializer());
expect.addSnapshotSerializer(createAbsolutePathSerializer());
expect.addSnapshotSerializer(createAnyInstanceSerializer(ToolingLog));
expect.addSnapshotSerializer(createAnyInstanceSerializer(ChecksumFile, (c) => `${c}`));

const logCollector = new ToolingLogCollectingWriter();
const log = new ToolingLog();
log.setWriters([logCollector]);

beforeEach(() => {
  logCollector.messages.length = 0;
  jest.clearAllMocks();
  isExistingAndValid.mockReset();
  downloadAndValidate.mockReset();
});

describe('::forBranch()', () => {
  it('fetches the snapshot version and checksum from GCS bucket', async () => {
    const artifact = await ArchiveArtifact.forBranch(log, 'foo');
    expect(logCollector.messages).toMatchInlineSnapshot(`
      Array [
        " debg fetching latest snapshot version",
        " debg fetching checksum of latest snapshot",
      ]
    `);
    expect(downloadText).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            <ToolingLog>,
            "https://storage.googleapis.com/apm-server-snapshots/foo/LATEST",
          ],
          Array [
            <ToolingLog>,
            "https://storage.googleapis.com/apm-server-snapshots/foo/from-https%3A%2F%2Fstorage.googleapis.com%2Fapm-server-snapshots%2Ffoo%2FLATEST/archive-name-for-this-platform.zip.sha512",
          ],
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": "from-https://storage.googleapis.com/apm-server-snapshots/foo/LATEST",
          },
          Object {
            "type": "return",
            "value": "from-https://storage.googleapis.com/apm-server-snapshots/foo/from-https%3A%2F%2Fstorage.googleapis.com%2Fapm-server-snapshots%2Ffoo%2FLATEST/archive-name-for-this-platform.zip.sha512",
          },
        ],
      }
    `);
    expect(artifact.path).toMatchInlineSnapshot(
      `<absolute path>/data/test-apm-server/archives/branch-foo/archive-name-for-this-platform.zip`
    );
    expect(artifact.url).toMatchInlineSnapshot(
      `"https://storage.googleapis.com/apm-server-snapshots/foo/from-https%3A%2F%2Fstorage.googleapis.com%2Fapm-server-snapshots%2Ffoo%2FLATEST/archive-name-for-this-platform.zip"`
    );
    expect(artifact.checksum).toMatchInlineSnapshot(
      `<# from-https://storage.googleapis.com/apm-server-snapshots/foo/from-https%3A%2F%2Fstorage.googleapis.com%2Fapm-server-snapshots%2Ffoo%2FLATEST/archive-name-for-this-platform.zip.sha512>`
    );
  });
});

describe('::fromStaging()', () => {
  it('creates an artifact from staging directory', async () => {
    const artifact = await ArchiveArtifact.fromStaging(log);
    expect(Fs.readFile.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <absolute path>/data/test-apm-server/archives/staging/LATEST,
          "utf-8",
        ],
      ]
    `);
    expect(logCollector.messages).toMatchInlineSnapshot(`Array []`);
    expect(artifact.path).toMatchInlineSnapshot(
      `<absolute path>/data/test-apm-server/archives/staging/[content of <repoRoot>/data/test-apm-server/archives/staging/LATEST]/archive-name-for-this-platform.zip`
    );
    expect(artifact.url).toMatchInlineSnapshot(`undefined`);
    expect(artifact.checksum).toMatchInlineSnapshot(`undefined`);
  });

  it(`rejects if the LATEST file doesn't exist`, async () => {
    Fs.readFile.mockImplementationOnce(async () => {
      const error = new Error('file not found');
      (error as any).code = 'ENOENT';
      throw error;
    });

    await expect(() => ArchiveArtifact.fromStaging(log)).rejects.toMatchInlineSnapshot(
      `[Error: There doesn't seem to be a valid staging build downloaded, try running [node scripts/apm_server staging-download]]`
    );
  });
});

describe('#ensureDownloaded()', () => {
  it('resolves immediately if downloaded artifact is valid', async () => {
    isExistingAndValid.mockResolvedValue(true);

    const artifact = new ArchiveArtifact(log, getThisPlatform(), '/foo/bar/archive.tar.gz');
    await artifact.ensureDownloaded();

    expect(logCollector.messages).toMatchInlineSnapshot(`
      Array [
        " debg previously downloaded artifact at /foo/bar/archive.tar.gz is valid",
      ]
    `);
    expect(isExistingAndValid.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <ToolingLog>,
          "/foo/bar/archive.tar.gz",
          undefined,
        ],
      ]
    `);
    expect(downloadAndValidate).toHaveBeenCalledTimes(0);
  });

  it('rejects if downloaded artifact is invalid and no url is configured', async () => {
    isExistingAndValid.mockResolvedValue(false);

    const artifact = new ArchiveArtifact(
      log,
      getThisPlatform(),
      '/foo/bar/archive.tar.gz',
      undefined,
      new ChecksumFile('abcdefg1234 archive.tar.gz')
    );

    await expect(() => artifact.ensureDownloaded()).rejects.toMatchInlineSnapshot(
      `[Error: unable to download artifact without a url or checksum file content, do you need to run the "staging-download" command?]`
    );
    expect(logCollector.messages).toMatchInlineSnapshot(`Array []`);
    expect(isExistingAndValid.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <ToolingLog>,
          "/foo/bar/archive.tar.gz",
          <# abcdefg1234>,
        ],
      ]
    `);
    expect(downloadAndValidate).toHaveBeenCalledTimes(0);
  });

  it('rejects if downloaded artifact is invalid and no checksum is configured', async () => {
    isExistingAndValid.mockResolvedValue(false);

    const artifact = new ArchiveArtifact(
      log,
      getThisPlatform(),
      '/foo/bar/archive.tar.gz',
      'http://google.com'
    );

    await expect(() => artifact.ensureDownloaded()).rejects.toMatchInlineSnapshot(
      `[Error: unable to download artifact without a url or checksum file content, do you need to run the "staging-download" command?]`
    );
    expect(logCollector.messages).toMatchInlineSnapshot(`Array []`);
    expect(isExistingAndValid.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <ToolingLog>,
          "/foo/bar/archive.tar.gz",
          undefined,
        ],
      ]
    `);
    expect(downloadAndValidate).toHaveBeenCalledTimes(0);
  });

  it('downloads and validates using checksum and url when not available locally', async () => {
    isExistingAndValid.mockResolvedValue(false);

    const artifact = new ArchiveArtifact(
      log,
      getThisPlatform(),
      '/foo/bar/archive.tar.gz',
      'http://google.com',
      new ChecksumFile('abcdefg1234 archive.tar.gz')
    );

    await artifact.ensureDownloaded();
    expect(logCollector.messages).toMatchInlineSnapshot(`Array []`);
    expect(isExistingAndValid.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <ToolingLog>,
          "/foo/bar/archive.tar.gz",
          <# abcdefg1234>,
        ],
      ]
    `);
    expect(downloadAndValidate.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <ToolingLog>,
          Object {
            "checksum": <# abcdefg1234>,
            "targetPath": "/foo/bar/archive.tar.gz",
            "url": "http://google.com",
          },
        ],
      ]
    `);
  });
});
