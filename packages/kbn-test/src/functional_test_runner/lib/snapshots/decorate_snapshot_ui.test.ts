/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Suite, Test } from '../../fake_mocha_types';
import { Lifecycle } from '../lifecycle';
import { decorateSnapshotUi, expectSnapshot } from './decorate_snapshot_ui';
import path from 'path';
import fs from 'fs';

const createMockSuite = ({ tests, root = true }: { tests: Test[]; root?: boolean }) => {
  const suite = {
    tests,
    root,
    eachTest: (cb: (test: Test) => void) => {
      suite.tests.forEach((test) => cb(test));
    },
  } as Suite;

  return suite;
};

const createMockTest = ({
  title = 'Test',
  passed = true,
  filename = __filename,
  parent,
}: { title?: string; passed?: boolean; filename?: string; parent?: Suite } = {}) => {
  const test = ({
    file: filename,
    fullTitle: () => title,
    isPassed: () => passed,
  } as unknown) as Test;

  if (parent) {
    parent.tests.push(test);
    test.parent = parent;
  } else {
    test.parent = createMockSuite({ tests: [test] });
  }

  return test;
};

describe('decorateSnapshotUi', () => {
  const snapshotFolder = path.resolve(__dirname, '__snapshots__');
  const snapshotFile = path.resolve(snapshotFolder, 'decorate_snapshot_ui.test.snap');

  const cleanup = () => {
    if (fs.existsSync(snapshotFile)) {
      fs.unlinkSync(snapshotFile);
      fs.rmdirSync(snapshotFolder);
    }
  };

  beforeEach(cleanup);

  afterAll(cleanup);

  describe('when running a test', () => {
    let lifecycle: Lifecycle;
    beforeEach(() => {
      lifecycle = new Lifecycle();
      decorateSnapshotUi({ lifecycle, updateSnapshots: false, isCi: false });
    });

    it('passes when the snapshot matches the actual value', async () => {
      const test = createMockTest();

      await lifecycle.beforeEachTest.trigger(test);

      expect(() => {
        expectSnapshot('foo').toMatchInline(`"foo"`);
      }).not.toThrow();
    });

    it('throws when the snapshot does not match the actual value', async () => {
      const test = createMockTest();

      await lifecycle.beforeEachTest.trigger(test);

      expect(() => {
        expectSnapshot('foo').toMatchInline(`"bar"`);
      }).toThrow();
    });

    it('writes a snapshot to an external file if it does not exist', async () => {
      const test: Test = createMockTest();

      await lifecycle.beforeEachTest.trigger(test);

      expect(fs.existsSync(snapshotFile)).toBe(false);

      expect(() => {
        expectSnapshot('foo').toMatch();
      }).not.toThrow();

      await lifecycle.afterTestSuite.trigger(test.parent);

      expect(fs.existsSync(snapshotFile)).toBe(true);
    });
  });

  describe('when writing multiple snapshots to a single file', () => {
    let lifecycle: Lifecycle;
    beforeEach(() => {
      lifecycle = new Lifecycle();
      decorateSnapshotUi({ lifecycle, updateSnapshots: false, isCi: false });
    });

    beforeEach(() => {
      fs.mkdirSync(path.resolve(__dirname, '__snapshots__'));
      fs.writeFileSync(
        snapshotFile,
        `// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[\`Test1 1\`] = \`"foo"\`;

exports[\`Test2 1\`] = \`"bar"\`;
      `,
        { encoding: 'utf-8' }
      );
    });

    it('compares to an existing snapshot', async () => {
      const test1 = createMockTest({ title: 'Test1' });

      await lifecycle.beforeEachTest.trigger(test1);

      expect(() => {
        expectSnapshot('foo').toMatch();
      }).not.toThrow();

      const test2 = createMockTest({ title: 'Test2' });

      await lifecycle.beforeEachTest.trigger(test2);

      expect(() => {
        expectSnapshot('foo').toMatch();
      }).toThrow();

      await lifecycle.afterTestSuite.trigger(test1.parent);
    });
  });

  describe('when updating snapshots', () => {
    let lifecycle: Lifecycle;
    beforeEach(() => {
      lifecycle = new Lifecycle();
      decorateSnapshotUi({ lifecycle, updateSnapshots: true, isCi: false });
    });

    it("doesn't throw if the value does not match", async () => {
      const test = createMockTest();

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
      const test = createMockTest();

      await lifecycle.beforeEachTest.trigger(test);

      expect(() => {
        expectSnapshot('bar').toMatchInline();
      }).toThrow();
    });

    describe('when adding to an existing file', () => {
      beforeEach(() => {
        fs.mkdirSync(path.resolve(__dirname, '__snapshots__'));
        fs.writeFileSync(
          snapshotFile,
          `// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[\`Test 1\`] = \`"foo"\`;

exports[\`Test2 1\`] = \`"bar"\`;
      `,
          { encoding: 'utf-8' }
        );
      });

      it('does not throw on an existing test', async () => {
        const test = createMockTest({ title: 'Test' });

        await lifecycle.beforeEachTest.trigger(test);

        expect(() => {
          expectSnapshot('foo').toMatch();
        }).not.toThrow();
      });

      it('throws on a new test', async () => {
        const test = createMockTest({ title: 'New test' });

        await lifecycle.beforeEachTest.trigger(test);

        expect(() => {
          expectSnapshot('foo').toMatch();
        }).toThrow();
      });

      it('does not throw when all snapshots are used ', async () => {
        const test = createMockTest({ title: 'Test' });

        await lifecycle.beforeEachTest.trigger(test);

        expect(() => {
          expectSnapshot('foo').toMatch();
        }).not.toThrow();

        const test2 = createMockTest({ title: 'Test2' });

        await lifecycle.beforeEachTest.trigger(test2);

        expect(() => {
          expectSnapshot('bar').toMatch();
        }).not.toThrow();

        const afterTestSuite = lifecycle.afterTestSuite.trigger(test.parent);

        await expect(afterTestSuite).resolves.toBe(undefined);
      });

      it('throws on unused snapshots', async () => {
        const test = createMockTest({ title: 'Test' });

        await lifecycle.beforeEachTest.trigger(test);

        expect(() => {
          expectSnapshot('foo').toMatch();
        }).not.toThrow();

        const afterTestSuite = lifecycle.afterTestSuite.trigger(test.parent);

        await expect(afterTestSuite).rejects.toMatchInlineSnapshot(`
                [Error: 1 obsolete snapshot(s) found:
                Test2 1.

                Run tests again with \`--updateSnapshots\` to remove them.]
              `);
      });

      it('does not throw on unused when some tests are skipped', async () => {
        const root = createMockSuite({ tests: [] });

        const test = createMockTest({
          title: 'Test',
          parent: root,
          passed: true,
        });

        createMockTest({
          title: 'Test2',
          parent: root,
          passed: false,
        });

        await lifecycle.beforeEachTest.trigger(test);

        expect(() => {
          expectSnapshot('foo').toMatch();
        }).not.toThrow();

        const afterTestSuite = lifecycle.afterTestSuite.trigger(root);

        await expect(afterTestSuite).resolves.toBeUndefined();
      });
    });
  });
});
