/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { readRecordings, readResponseFixtures } from './load_responses';

const recording = (name: string) => ({
  exchanges: [
    {
      operation: { method: 'GET', path: '/items' },
      response: { status: 200, body: [{ name }] },
    },
  ],
});

describe('load_responses', () => {
  let directory: string;
  const write = async (file: string, content: unknown) => {
    const target = path.join(directory, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, typeof content === 'string' ? content : JSON.stringify(content));
    return target;
  };

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'load-responses-'));
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  describe('readResponseFixtures', () => {
    it('reads response overrides as fixtures', async () => {
      const file = await write('fixtures.json', [
        { method: 'GET', path: '/items', status: 200, body: [] },
        {
          source: 'v2',
          method: 'POST',
          path: '/items',
          status: 429,
          headers: { 'retry-after': '1' },
        },
      ]);

      expect(await readResponseFixtures(file)).toEqual([
        { operation: { method: 'GET', path: '/items' }, response: { status: 200, body: [] } },
        {
          operation: { method: 'POST', path: '/items', source: 'v2' },
          response: { status: 429, headers: { 'retry-after': '1' }, body: undefined },
        },
      ]);
    });

    it('names the file and the problem when the shape is wrong', async () => {
      const file = await write('fixtures.json', [{ method: 'GET', path: '/items' }]);

      await expect(readResponseFixtures(file)).rejects.toThrow(
        new RegExp(`${file} doesn't have the expected shape[\\s\\S]*status`)
      );
    });
  });

  describe('readRecordings', () => {
    it('reads one recording file', async () => {
      const file = await write('one.json', recording('a'));

      expect(await readRecordings(file)).toEqual([recording('a')]);
    });

    it('reads every JSON file of a folder, in name order', async () => {
      await write('recordings/b.json', recording('b'));
      await write('recordings/a.json', recording('a'));
      await write('recordings/notes.txt', 'not a recording');

      expect(await readRecordings(path.join(directory, 'recordings'))).toEqual([
        recording('a'),
        recording('b'),
      ]);
    });

    it('reads a missing folder as no recordings only when optional', async () => {
      const missing = path.join(directory, 'missing');

      expect(await readRecordings(missing, { optional: true })).toEqual([]);
      await expect(readRecordings(missing)).rejects.toThrow(/ENOENT/);
    });

    it('rejects recordings with unknown keys', async () => {
      const file = await write('one.json', { ...recording('a'), extra: true });

      await expect(readRecordings(file)).rejects.toThrow(/doesn't have the expected shape/);
    });
  });
});
