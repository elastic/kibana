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

import { Test } from './mocha_types';
import { Lifecycle } from '../lifecycle';
import { decorateSnapshotUi, expectSnapshot } from './decorate_snapshot_ui';
import path from 'path';
import fs from 'fs';

describe('decorateSnapshotUi', () => {
  describe('when running a test', () => {
    let lifecycle: Lifecycle;
    beforeEach(() => {
      lifecycle = new Lifecycle();
      decorateSnapshotUi(lifecycle, false);
    });

    it('passes when the snapshot matches the actual value', async () => {
      const test: Test = {
        title: 'Test',
        file: 'foo.ts',
        parent: {
          file: 'foo.ts',
          tests: [],
          suites: [],
        },
      } as any;

      await lifecycle.beforeEachTest.trigger(test);

      expect(() => {
        expectSnapshot('foo').toMatchInline(`"foo"`);
      }).not.toThrow();
    });

    it('throws when the snapshot does not match the actual value', async () => {
      const test: Test = {
        title: 'Test',
        file: 'foo.ts',
        parent: {
          file: 'foo.ts',
          tests: [],
          suites: [],
        },
      } as any;

      await lifecycle.beforeEachTest.trigger(test);

      expect(() => {
        expectSnapshot('foo').toMatchInline(`"bar"`);
      }).toThrow();
    });

    it('writes a snapshot to an external file if it does not exist', async () => {
      const test: Test = {
        title: 'Test',
        file: __filename,
        isPassed: () => true,
      } as any;

      // @ts-expect-error
      test.parent = {
        file: __filename,
        tests: [test],
        suites: [],
      };

      await lifecycle.beforeEachTest.trigger(test);

      const snapshotFile = path.resolve(
        __dirname,
        '__snapshots__',
        'decorate_snapshot_ui.test.snap'
      );

      expect(fs.existsSync(snapshotFile)).toBe(false);

      expect(() => {
        expectSnapshot('foo').toMatch();
      }).not.toThrow();

      await lifecycle.afterTestSuite.trigger(test.parent);

      expect(fs.existsSync(snapshotFile)).toBe(true);

      fs.unlinkSync(snapshotFile);

      fs.rmdirSync(path.resolve(__dirname, '__snapshots__'));
    });
  });

  describe('when updating snapshots', () => {
    let lifecycle: Lifecycle;
    beforeEach(() => {
      lifecycle = new Lifecycle();
      decorateSnapshotUi(lifecycle, true);
    });

    it("doesn't throw if the value does not match", async () => {
      const test: Test = {
        title: 'Test',
        file: 'foo.ts',
        parent: {
          file: 'foo.ts',
          tests: [],
          suites: [],
        },
      } as any;

      await lifecycle.beforeEachTest.trigger(test);

      expect(() => {
        expectSnapshot('bar').toMatchInline(`"foo"`);
      }).not.toThrow();
    });
  });
});
