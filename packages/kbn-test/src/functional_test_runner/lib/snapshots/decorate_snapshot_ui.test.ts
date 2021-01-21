/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Test } from '../../fake_mocha_types';
import { Lifecycle } from '../lifecycle';
import { decorateSnapshotUi, expectSnapshot } from './decorate_snapshot_ui';
import path from 'path';
import fs from 'fs';

describe('decorateSnapshotUi', () => {
  describe('when running a test', () => {
    let lifecycle: Lifecycle;
    beforeEach(() => {
      lifecycle = new Lifecycle();
      decorateSnapshotUi({ lifecycle, updateSnapshots: false, isCi: false });
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
      decorateSnapshotUi({ lifecycle, updateSnapshots: true, isCi: false });
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

  describe('when running on ci', () => {
    let lifecycle: Lifecycle;
    beforeEach(() => {
      lifecycle = new Lifecycle();
      decorateSnapshotUi({ lifecycle, updateSnapshots: false, isCi: true });
    });

    it('throws on new snapshots', async () => {
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
        expectSnapshot('bar').toMatchInline();
      }).toThrow();
    });
  });
});
