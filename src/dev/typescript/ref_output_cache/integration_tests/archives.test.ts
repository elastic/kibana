/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import { Readable } from 'stream';

import del from 'del';
import cpy from 'cpy';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import {
  createAbsolutePathSerializer,
  createRecursiveSerializer,
  createStripAnsiSerializer,
} from '@kbn/jest-serializers';

expect.addSnapshotSerializer(createAbsolutePathSerializer());
expect.addSnapshotSerializer(createStripAnsiSerializer());
expect.addSnapshotSerializer(
  createRecursiveSerializer(
    (v) => typeof v === 'object' && v && typeof v.time === 'number',
    (v) => ({ ...v, time: '<number>' })
  )
);

jest.mock('axios', () => {
  return {
    request: jest.fn(),
  };
});
const mockRequest: jest.Mock = jest.requireMock('axios').request;

import { Archives } from '../archives';

const FIXTURE = Path.resolve(__dirname, '__fixtures__');
const TMP = Path.resolve(__dirname, '__tmp__');

beforeAll(() => del(TMP, { force: true }));
beforeEach(() => cpy('.', TMP, { cwd: FIXTURE, parents: true }));
afterEach(async () => {
  await del(TMP, { force: true });
  jest.resetAllMocks();
});

const readArchiveDir = () =>
  Fs.readdirSync(Path.resolve(TMP, 'archives')).sort((a, b) => a.localeCompare(b));

const log = new ToolingLog();
const logWriter = new ToolingLogCollectingWriter();
log.setWriters([logWriter]);
afterEach(() => (logWriter.messages.length = 0));

it('deletes invalid files', async () => {
  const path = Path.resolve(TMP, 'archives/foo.txt');
  Fs.writeFileSync(path, 'hello');
  const archives = await Archives.create(log, TMP);

  expect(archives.size()).toBe(2);
  expect(Fs.existsSync(path)).toBe(false);
});

it('exposes archives by sha', async () => {
  const archives = await Archives.create(log, TMP);
  expect(archives.get('1234')).toMatchInlineSnapshot(`
    Object {
      "path": <absolute path>/src/dev/typescript/ref_output_cache/integration_tests/__tmp__/archives/1234.zip,
      "sha": "1234",
      "time": "<number>",
    }
  `);
  expect(archives.get('5678')).toMatchInlineSnapshot(`
    Object {
      "path": <absolute path>/src/dev/typescript/ref_output_cache/integration_tests/__tmp__/archives/5678.zip,
      "sha": "5678",
      "time": "<number>",
    }
  `);
  expect(archives.get('foo')).toMatchInlineSnapshot(`undefined`);
});

it('deletes archives', async () => {
  const archives = await Archives.create(log, TMP);
  expect(archives.size()).toBe(2);
  await archives.delete('1234');
  expect(archives.size()).toBe(1);
  expect(readArchiveDir()).toMatchInlineSnapshot(`
    Array [
      "5678.zip",
    ]
  `);
});

it('returns false when attempting to download for sha without cache', async () => {
  const archives = await Archives.create(log, TMP);

  mockRequest.mockImplementation(() => {
    throw new Error('404!');
  });

  await expect(archives.attemptToDownload('foobar')).resolves.toBe(false);
});

it('returns true when able to download an archive for a sha', async () => {
  const archives = await Archives.create(log, TMP);

  mockRequest.mockImplementation(() => {
    return {
      data: Readable.from('foobar zip contents'),
    };
  });

  expect(archives.size()).toBe(2);
  await expect(archives.attemptToDownload('foobar')).resolves.toBe(true);
  expect(archives.size()).toBe(3);
  expect(readArchiveDir()).toMatchInlineSnapshot(`
    Array [
      "1234.zip",
      "5678.zip",
      "foobar.zip",
    ]
  `);
  expect(Fs.readFileSync(Path.resolve(TMP, 'archives/foobar.zip'), 'utf-8')).toBe(
    'foobar zip contents'
  );
});

it('returns true if attempting to download a cache which is already downloaded', async () => {
  const archives = await Archives.create(log, TMP);

  mockRequest.mockImplementation(() => {
    throw new Error(`it shouldn't try to download anything`);
  });

  expect(archives.size()).toBe(2);
  await expect(archives.attemptToDownload('1234')).resolves.toBe(true);
  expect(archives.size()).toBe(2);
  expect(readArchiveDir()).toMatchInlineSnapshot(`
    Array [
      "1234.zip",
      "5678.zip",
    ]
  `);
});

it('returns false and deletes the zip if the download fails part way', async () => {
  const archives = await Archives.create(log, TMP);

  mockRequest.mockImplementation(() => {
    let readCounter = 0;
    return {
      data: new Readable({
        read() {
          readCounter++;
          if (readCounter === 1) {
            this.push('foo');
          } else {
            this.emit('error', new Error('something went wrong'));
          }
        },
      }),
    };
  });

  await expect(archives.attemptToDownload('foo')).resolves.toBe(false);
  expect(archives.size()).toBe(2);
  expect(readArchiveDir()).toMatchInlineSnapshot(`
    Array [
      "1234.zip",
      "5678.zip",
    ]
  `);
});

it('resolves to first sha if it is available locally', async () => {
  const archives = await Archives.create(log, TMP);

  expect(await archives.getFirstAvailable(['1234', '5678'])).toHaveProperty('sha', '1234');
  expect(await archives.getFirstAvailable(['5678', '1234'])).toHaveProperty('sha', '5678');
});

it('resolves to first local sha when it tried to reach network and gets errors', async () => {
  const archives = await Archives.create(log, TMP);

  mockRequest.mockImplementation(() => {
    throw new Error('no network available');
  });

  expect(await archives.getFirstAvailable(['foo', 'bar', '1234'])).toHaveProperty('sha', '1234');
  expect(mockRequest).toHaveBeenCalledTimes(2);
  expect(logWriter.messages).toMatchInlineSnapshot(`
    Array [
      " sill identified archive for 1234",
      " sill identified archive for 5678",
      " debg attempting to download cache for foo from https://ts-refs-cache.kibana.dev/foo.zip",
      " debg failed to download cache, ignoring error: no network available",
      " debg no archive available for foo",
      " debg attempting to download cache for bar from https://ts-refs-cache.kibana.dev/bar.zip",
      " debg failed to download cache, ignoring error: no network available",
      " debg no archive available for bar",
    ]
  `);
});

it('resolves to first remote that downloads successfully', async () => {
  const archives = await Archives.create(log, TMP);

  mockRequest.mockImplementation((params) => {
    if (params.url === `https://ts-refs-cache.kibana.dev/bar.zip`) {
      return {
        data: Readable.from('bar cache data'),
      };
    }

    throw new Error('no network available');
  });

  const archive = await archives.getFirstAvailable(['foo', 'bar', '1234']);
  expect(archive).toHaveProperty('sha', 'bar');
  expect(mockRequest).toHaveBeenCalledTimes(2);
  expect(logWriter.messages).toMatchInlineSnapshot(`
    Array [
      " sill identified archive for 1234",
      " sill identified archive for 5678",
      " debg attempting to download cache for foo from https://ts-refs-cache.kibana.dev/foo.zip",
      " debg failed to download cache, ignoring error: no network available",
      " debg no archive available for foo",
      " debg attempting to download cache for bar from https://ts-refs-cache.kibana.dev/bar.zip",
      " debg download complete, renaming tmp",
      " debg download of cache for bar complete",
    ]
  `);

  expect(Fs.readFileSync(archive!.path, 'utf-8')).toBe('bar cache data');
});
