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

import Path from 'path';
import Fs from 'fs';

import del from 'del';
import * as Rx from 'rxjs';
import chokidar from 'chokidar';
import { take, tap } from 'rxjs/operators';
import { firstValueFrom } from '@kbn/std';

import { observeFileChanges } from '../observe_file_changes';

expect.addSnapshotSerializer({
  test: (v) => v instanceof chokidar.FSWatcher,
  serialize: () => '<chokidar.FSWatcher>',
});

const FIXTURES = Path.resolve(__dirname, '__fixtures__/watch');
const cleanFixtures = () => {
  for (const fname of Fs.readdirSync(FIXTURES)) {
    if (fname !== 'foo.js' && fname !== 'bar.js') {
      del.sync(Path.resolve(FIXTURES, fname));
    }
  }
};

const subs: Rx.Subscription[] = [];

beforeEach(cleanFixtures);
afterEach(() => {
  for (const sub of subs) {
    sub.unsubscribe();
  }
  subs.length = 0;
});
afterAll(cleanFixtures);

it('emits the number of files being watched in ready state', async () => {
  const firstState = await firstValueFrom(
    observeFileChanges({
      paths: ['*.js'],
      ignore: [],
      cwd: FIXTURES,
    }).pipe(take(1))
  );

  expect(firstState).toMatchInlineSnapshot(`
    Object {
      "fileCount": 2,
      "type": "ready",
    }
  `);
});

it('emits list of changed files and debounces multiple changes', async () => {
  const all$ = new Rx.ReplaySubject();
  const state$ = new Rx.Subject();

  subs.push(
    observeFileChanges({
      paths: ['**/*'],
      ignore: [],
      cwd: FIXTURES,
    })
      .pipe(tap(all$), tap(state$))
      .subscribe()
  );

  // wait for ready
  expect(await firstValueFrom(state$)).toMatchInlineSnapshot(`
    Object {
      "fileCount": 2,
      "type": "ready",
    }
  `);

  // trigger two changes
  const start = Date.now();
  Fs.writeFileSync(Path.resolve(FIXTURES, 'baz.js'), `export const hello = 'world';`);
  Fs.writeFileSync(Path.resolve(FIXTURES, 'box.js'), `export * from './baz';`);

  expect(await firstValueFrom(state$)).toMatchInlineSnapshot(`
    Object {
      "paths": Array [
        "baz.js",
        "box.js",
      ],
      "type": "change",
    }
  `);

  if (Date.now() - start > 5000) {
    throw new Error('expected debounce to take less than 5 seconds');
  }
});

it('ignores files based on absolute paths', async () => {
  const ready = await firstValueFrom(
    observeFileChanges({
      paths: ['**/*'],
      ignore: [Path.resolve(FIXTURES, 'foo.js')],
      cwd: FIXTURES,
    })
  );

  expect(ready).toHaveProperty('fileCount', 1);
});

it('ignores files based on relative paths', async () => {
  const ready = await firstValueFrom(
    observeFileChanges({
      paths: ['**/*'],
      ignore: ['foo.js'],
      cwd: FIXTURES,
    })
  );

  expect(ready).toHaveProperty('fileCount', 1);
});

it('ignores files based on regex', async () => {
  const ready = await firstValueFrom(
    observeFileChanges({
      paths: ['**/*'],
      ignore: [/foo/],
      cwd: FIXTURES,
    })
  );

  expect(ready).toHaveProperty('fileCount', 1);
});
