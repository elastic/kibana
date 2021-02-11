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
import { ToolingLog } from '@kbn/dev-utils';

import { Archives } from '../archives';

const FIXTURE = Path.resolve(__dirname, '__fixtures__');
const TMP = Path.resolve(__dirname, '__tmp__');

beforeAll(() => del(TMP, { force: true }));
beforeEach(() => cpy('.', TMP, { cwd: FIXTURE, parents: true }));
afterEach(() => del(TMP, { force: true }));

const log = new ToolingLog();

it('deletes invalid files', async () => {
  const path = Path.resolve(TMP, 'archives/foo.txt');
  Fs.writeFileSync(path, 'hello');
  const archives = await Archives.create(log, TMP);

  expect(archives.size()).toBe(2);
  expect(Fs.existsSync(path)).toBe(false);
});
