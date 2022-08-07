/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import fs from 'fs';

import { ToolingLog } from '@kbn/tooling-log';

import { Suite, Test } from '../../fake_mocha_types';
import { Lifecycle } from '../lifecycle';
import { decorateSnapshotUi, expectSnapshot } from './decorate_snapshot_ui';

const createRootSuite = () => {
  const suite = {
    tests: [] as Test[],
    root: true,
    eachTest: (cb) => {
      suite.tests.forEach((test) => cb(test));
    },
    parent: undefined,
  } as Suite;

  return suite;
};

const registerTest = ({
  parent,
  title = 'Test',
  passed = true,
}: {
  parent: Suite;
  title?: string;
  passed?: boolean;
}) => {
  const test = {
    file: __filename,
    fullTitle: () => title,
    isPassed: () => passed,
  } as unknown as Test;

  parent.tests.push(test);
  test.parent = parent;

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
    let rootSuite: Suite;
    beforeEach(async () => {
      lifecycle = new Lifecycle(new ToolingLog());
      rootSuite = createRootSuite();
      decorateSnapshotUi({ lifecycle, updateSnapshots: false, isCi: false });

      await lifecycle.beforeTests.trigger(rootSuite);
    });

    it('passes when the snapshot matches the actual value', async () => {
      const test = registerTest({ parent: rootSuite });

      await lifecycle.beforeEachTest.trigger(test);

      expect(() => {
        expectSnapshot('foo').toMatchInline(`"foo"`);
      }).not.toThrow();

      await lifecycle.cleanup.trigger();
    });

    it('throws when the snapshot does not match the actual value', async () => {
      const test = registerTest({ parent: rootSuite });

      await lifecycle.beforeEachTest.trigger(test);

      expect(() => {
        expectSnapshot('foo').toMatchInline(`"bar"`);
      }).toThrow();

      await lifecycle.cleanup.trigger();
    });

    it('writes a snapshot to an external file if it does not exist', async () => {
      const test = registerTest({ parent: rootSuite });
      await lifecycle.beforeEachTest.trigger(test);

      expect(fs.existsSync(snapshotFile)).toBe(false);

      expect(() => {
        expectSnapshot('foo').toMatch();
      }).not.toThrow();

      await lifecycle.cleanup.trigger();

      expect(fs.existsSync(snapshotFile)).toBe(true);
    });
  });

  describe('when writing multiple snapshots to a single file', () => {
    let lifecycle: Lifecycle;
    let rootSuite: Suite;
    beforeEach(async () => {
      lifecycle = new Lifecycle(new ToolingLog());
      rootSuite = createRootSuite();
      decorateSnapshotUi({ lifecycle, updateSnapshots: false, isCi: false });

      await lifecycle.beforeTests.trigger(rootSuite);
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
      const test1 = registerTest({ parent: rootSuite, title: 'Test1' });

      await lifecycle.beforeEachTest.trigger(test1);

      expect(() => {
        expectSnapshot('foo').toMatch();
      }).not.toThrow();

      const test2 = registerTest({ parent: rootSuite, title: 'Test2' });

      await lifecycle.beforeEachTest.trigger(test2);

      expect(() => {
        expectSnapshot('foo').toMatch();
      }).toThrow();

      await lifecycle.cleanup.trigger();
    });
  });

  describe('when updating snapshots', () => {
    let lifecycle: Lifecycle;
    let rootSuite: Suite;
    beforeEach(async () => {
      lifecycle = new Lifecycle(new ToolingLog());
      rootSuite = createRootSuite();
      decorateSnapshotUi({ lifecycle, updateSnapshots: true, isCi: false });

      await lifecycle.beforeTests.trigger(rootSuite);
    });

    it("doesn't throw if the value does not match", async () => {
      const test = registerTest({ parent: rootSuite });

      await lifecycle.beforeEachTest.trigger(test);

      expect(() => {
        expectSnapshot('bar').toMatchInline(`"foo"`);
      }).not.toThrow();
    });

    describe('writing to disk', () => {
      beforeEach(() => {
        fs.mkdirSync(path.resolve(__dirname, '__snapshots__'));
        fs.writeFileSync(
          snapshotFile,
          `// Jest Snapshot v1, https://goo.gl/fbAQLP

  exports[\`Test 1\`] = \`"foo"\`;
        `,
          { encoding: 'utf-8' }
        );
      });

      it('updates existing external snapshots', async () => {
        const test = registerTest({ parent: rootSuite });

        await lifecycle.beforeEachTest.trigger(test);

        expect(() => {
          expectSnapshot('bar').toMatch();
        }).not.toThrow();

        await lifecycle.cleanup.trigger();

        const file = fs.readFileSync(snapshotFile, { encoding: 'utf-8' });

        expect(file).toMatchInlineSnapshot(`
          "// Jest Snapshot v1, https://goo.gl/fbAQLP

          exports[\`Test 1\`] = \`\\"bar\\"\`;
          "
        `);
      });
    });
  });

  describe('when running on ci', () => {
    let lifecycle: Lifecycle;
    let rootSuite: Suite;
    beforeEach(async () => {
      lifecycle = new Lifecycle(new ToolingLog());
      rootSuite = createRootSuite();
      decorateSnapshotUi({ lifecycle, updateSnapshots: false, isCi: true });

      await lifecycle.beforeTests.trigger(rootSuite);
    });

    it('throws on new snapshots', async () => {
      const test = registerTest({ parent: rootSuite });

      await lifecycle.beforeEachTest.trigger(test);

      expect(() => {
        expectSnapshot('bar').toMatchInline();
      }).toThrow();

      await lifecycle.cleanup.trigger();
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
        const test = registerTest({ parent: rootSuite });

        await lifecycle.beforeEachTest.trigger(test);

        expect(() => {
          expectSnapshot('foo').toMatch();
        }).not.toThrow();

        const test2 = registerTest({ parent: rootSuite, title: 'Test2' });

        await lifecycle.beforeEachTest.trigger(test2);

        expect(() => {
          expectSnapshot('bar').toMatch();
        }).not.toThrow();

        await lifecycle.cleanup.trigger();
      });

      it('throws on a new test', async () => {
        const test = registerTest({ parent: rootSuite, title: 'New test' });

        await lifecycle.beforeEachTest.trigger(test);

        expect(() => {
          expectSnapshot('foo').toMatch();
        }).toThrow();
      });

      it('does not throw when all snapshots are used', async () => {
        const test = registerTest({ parent: rootSuite });

        await lifecycle.beforeEachTest.trigger(test);

        expect(() => {
          expectSnapshot('foo').toMatch();
        }).not.toThrow();

        const test2 = registerTest({ parent: rootSuite, title: 'Test2' });

        await lifecycle.beforeEachTest.trigger(test2);

        expect(() => {
          expectSnapshot('bar').toMatch();
        }).not.toThrow();

        const afterCleanup = lifecycle.cleanup.trigger();

        await expect(afterCleanup).resolves.toBe(undefined);
      });

      it('throws on unused snapshots', async () => {
        const test = registerTest({ parent: rootSuite });

        await lifecycle.beforeEachTest.trigger(test);

        expect(() => {
          expectSnapshot('foo').toMatch();
        }).not.toThrow();

        const afterCleanup = lifecycle.cleanup.trigger();

        await expect(afterCleanup).rejects.toMatchInlineSnapshot(`
                [Error: 1 obsolete snapshot(s) found:
                Test2 1.

                Run tests again with \`--updateSnapshots\` to remove them.]
              `);
      });

      it('does not throw on unused when some tests are skipped', async () => {
        const test = registerTest({ parent: rootSuite, passed: true });

        registerTest({
          title: 'Test2',
          parent: rootSuite,
          passed: false,
        });

        await lifecycle.beforeEachTest.trigger(test);

        expect(() => {
          expectSnapshot('foo').toMatch();
        }).not.toThrow();

        const afterCleanup = lifecycle.cleanup.trigger();

        await expect(afterCleanup).resolves.toBeUndefined();
      });
    });
  });
});
