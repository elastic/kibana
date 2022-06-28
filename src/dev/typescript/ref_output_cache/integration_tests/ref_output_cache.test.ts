/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import del from 'del';
import cpy from 'cpy';
import globby from 'globby';
import normalize from 'normalize-path';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import { createAbsolutePathSerializer, createStripAnsiSerializer } from '@kbn/jest-serializers';

import { RefOutputCache, OUTDIR_MERGE_BASE_FILENAME } from '../ref_output_cache';
import { Archives } from '../archives';
import type { RepoInfo } from '../repo_info';
import { Project } from '../../project';
import { ProjectSet } from '../../project_set';

jest.mock('../repo_info');
const { RepoInfo: MockRepoInfo } = jest.requireMock('../repo_info');

jest.mock('axios');
const { request: mockRequest } = jest.requireMock('axios');

expect.addSnapshotSerializer(createAbsolutePathSerializer());
expect.addSnapshotSerializer(createStripAnsiSerializer());

const FIXTURE = Path.resolve(__dirname, '__fixtures__');
const TMP = Path.resolve(__dirname, '__tmp__');
const repo: jest.Mocked<RepoInfo> = new MockRepoInfo();
const log = new ToolingLog();
const logWriter = new ToolingLogCollectingWriter();
log.setWriters([logWriter]);

beforeAll(() => del(TMP, { force: true }));
beforeEach(() => cpy('.', TMP, { cwd: FIXTURE, parents: true }));
afterEach(async () => {
  await del(TMP, { force: true });
  jest.resetAllMocks();
  logWriter.messages.length = 0;
});

function makeMockProject(path: string) {
  Fs.mkdirSync(Path.resolve(path, 'target/test-types'), { recursive: true });
  Fs.writeFileSync(
    Path.resolve(path, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        outDir: './target/test-types',
      },
      include: ['**/*'],
      exclude: ['test/target/**/*'],
    })
  );

  return Project.load(Path.resolve(path, 'tsconfig.json'));
}

it('creates and extracts caches, ingoring dirs with matching merge-base file, placing merge-base files, and overriding modified time for updated inputs', async () => {
  // setup repo mock
  const HEAD = 'abcdefg';
  repo.getHeadSha.mockResolvedValue(HEAD);
  repo.getRelative.mockImplementation((path) => Path.relative(TMP, path));
  repo.getRecentShasFrom.mockResolvedValue(['5678', '1234']);
  repo.getFilesChangesSinceSha.mockResolvedValue([]);

  // create two fake outDirs
  const projects = new ProjectSet([
    makeMockProject(Path.resolve(TMP, 'test1')),
    makeMockProject(Path.resolve(TMP, 'test2')),
  ]);

  // init an archives instance using tmp
  const archives = await Archives.create(log, TMP);

  // init the RefOutputCache with our mock data
  const refOutputCache = new RefOutputCache(log, repo, archives, projects, HEAD);

  // create the new cache right in the archives dir
  await refOutputCache.captureCache(Path.resolve(TMP));
  const cachePath = Path.resolve(TMP, `${HEAD}.zip`);

  // check that the cache was created and stored in the archives
  if (!Fs.existsSync(cachePath)) {
    throw new Error('zip was not created as expected');
  }

  mockRequest.mockImplementation((params: any) => {
    if (params.url.endsWith(`${HEAD}.zip`)) {
      return {
        data: Fs.createReadStream(cachePath),
      };
    }

    throw new Error(`unexpected url: ${params.url}`);
  });

  // modify the files in the outDirs so we can see which ones are restored from the cache
  for (const dir of projects.outDirs) {
    Fs.writeFileSync(Path.resolve(dir, 'no-cleared.txt'), 'not cleared by cache init');
  }

  // add the mergeBase to test1 outDir so that it is not cleared
  Fs.writeFileSync(Path.resolve(projects.outDirs[0], OUTDIR_MERGE_BASE_FILENAME), HEAD);

  // rebuild the outDir from the refOutputCache
  await refOutputCache.initCaches();

  // verify that "test1" outdir is untouched and that "test2" is cleared out
  const files = Object.fromEntries(
    globby
      .sync(
        projects.outDirs.map((p) => normalize(p)),
        { dot: true }
      )
      .map((path) => [Path.relative(TMP, path), Fs.readFileSync(path, 'utf-8')])
  );

  expect(files).toMatchInlineSnapshot(`
    Object {
      "test1/target/test-types/.ts-ref-cache-merge-base": "abcdefg",
      "test1/target/test-types/no-cleared.txt": "not cleared by cache init",
      "test2/target/test-types/.ts-ref-cache-merge-base": "abcdefg",
    }
  `);
  expect(logWriter.messages).toMatchInlineSnapshot(`
    Array [
      " sill identified archive for 1234",
      " sill identified archive for 5678",
      " debg writing ts-ref cache to abcdefg.zip",
      " succ wrote archive to abcdefg.zip",
      " debg attempting to download cache for abcdefg from https://ts-refs-cache.kibana.dev/abcdefg.zip",
      " debg download complete, renaming tmp",
      " debg download of cache for abcdefg complete",
      " debg extracting archives/abcdefg.zip to rebuild caches in 1 outDirs",
      " debg [test2/target/test-types] clearing outDir and replacing with cache",
    ]
  `);
});

it('cleans up oldest archives when there are more than 10', async () => {
  for (let i = 0; i < 100; i++) {
    const time = i * 10_000;
    const path = Path.resolve(TMP, `archives/${time}.zip`);
    Fs.writeFileSync(path, '');
    Fs.utimesSync(path, time, time);
  }

  const archives = await Archives.create(log, TMP);
  const cache = new RefOutputCache(log, repo, archives, new ProjectSet([]), '1234');
  expect(cache.archives.size()).toBe(102);
  await cache.cleanup();
  expect(cache.archives.size()).toBe(10);
  expect(Fs.readdirSync(Path.resolve(TMP, 'archives')).sort((a, b) => a.localeCompare(b)))
    .toMatchInlineSnapshot(`
      Array [
        "1234.zip",
        "5678.zip",
        "920000.zip",
        "930000.zip",
        "940000.zip",
        "950000.zip",
        "960000.zip",
        "970000.zip",
        "980000.zip",
        "990000.zip",
      ]
    `);
});
