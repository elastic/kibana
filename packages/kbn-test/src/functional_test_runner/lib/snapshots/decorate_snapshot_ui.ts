/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SnapshotState,
  toMatchSnapshot,
  toMatchInlineSnapshot,
  addSerializer,
} from 'jest-snapshot';
import path from 'path';
import prettier from 'prettier';
import babelTraverse from '@babel/traverse';
import { once } from 'lodash';
import { Lifecycle } from '../lifecycle';
import { Suite, Test } from '../../fake_mocha_types';

type ISnapshotState = InstanceType<typeof SnapshotState>;

type SnapshotUpdateState = 'all' | 'new' | 'none';

interface SnapshotContext {
  snapshotState: ISnapshotState;
  currentTestName: string;
}

const globalState: {
  updateSnapshot: SnapshotUpdateState;
  registered: boolean;
  currentTest: Test | null;
  snapshotStates: Record<string, ISnapshotState>;
} = {
  updateSnapshot: 'none',
  registered: false,
  currentTest: null,
  snapshotStates: {},
};

const modifyStackTracePrepareOnce = once(() => {
  const originalPrepareStackTrace = Error.prepareStackTrace;

  // jest-snapshot uses a stack trace to determine which file/line/column
  // an inline snapshot should be written to. We filter out match_snapshot
  // from the stack trace to prevent it from wanting to write to this file.

  Error.prepareStackTrace = (error, structuredStackTrace) => {
    let filteredStrackTrace: NodeJS.CallSite[] = structuredStackTrace;
    if (globalState.registered) {
      filteredStrackTrace = filteredStrackTrace.filter((callSite) => {
        // check for both compiled and uncompiled files
        return !callSite.getFileName()?.match(/decorate_snapshot_ui\.(js|ts)/);
      });
    }

    if (originalPrepareStackTrace) {
      return originalPrepareStackTrace(error, filteredStrackTrace);
    }
  };
});

export function decorateSnapshotUi({
  lifecycle,
  updateSnapshots,
  isCi,
}: {
  lifecycle: Lifecycle;
  updateSnapshots: boolean;
  isCi: boolean;
}) {
  let rootSuite: Suite | undefined;

  lifecycle.beforeTests.add((root) => {
    if (!root) {
      throw new Error('Root suite was not set');
    }
    rootSuite = root;

    globalState.registered = true;
    globalState.snapshotStates = {};
    globalState.currentTest = null;

    if (isCi) {
      // make sure snapshots that have not been committed
      // are not written to file on CI, passing the test
      globalState.updateSnapshot = 'none';
    } else {
      globalState.updateSnapshot = updateSnapshots ? 'all' : 'new';
    }

    modifyStackTracePrepareOnce();

    addSerializer({
      serialize: (num: number) => {
        return String(parseFloat(num.toPrecision(15)));
      },
      test: (value: any) => {
        return typeof value === 'number';
      },
    });

    // @ts-expect-error
    global.expectSnapshot = expectSnapshot;
  });

  lifecycle.beforeEachTest.add((test: Test) => {
    globalState.currentTest = test;
  });

  lifecycle.cleanup.add(() => {
    if (!rootSuite) {
      return;
    }

    rootSuite.eachTest((test) => {
      const file = test.file;

      if (!file) {
        return;
      }

      const snapshotState = globalState.snapshotStates[file];

      if (snapshotState && !test.isPassed()) {
        snapshotState.markSnapshotsAsCheckedForTest(test.fullTitle());
      }
    });

    const unused: string[] = [];

    Object.values(globalState.snapshotStates).forEach((state) => {
      if (globalState.updateSnapshot === 'all') {
        state.removeUncheckedKeys();
      }

      unused.push(...state.getUncheckedKeys());

      state.save();
    });

    if (unused.length) {
      throw new Error(
        `${unused.length} obsolete snapshot(s) found:\n${unused.join(
          '\n\t'
        )}.\n\nRun tests again with \`--updateSnapshots\` to remove them.`
      );
    }

    globalState.snapshotStates = {};
  });
}

function getSnapshotState(file: string, updateSnapshot: SnapshotUpdateState) {
  const dirname = path.dirname(file);
  const filename = path.basename(file);

  const snapshotState = new SnapshotState(
    path.join(dirname + `/__snapshots__/` + filename.replace(path.extname(filename), '.snap')),
    {
      updateSnapshot,
      // @ts-expect-error
      getPrettier: () => prettier,
      getBabelTraverse: () => babelTraverse,
    }
  );

  return snapshotState;
}

export function expectSnapshot(received: any) {
  if (!globalState.registered) {
    throw new Error('expectSnapshot UI was not initialized before calling expectSnapshot()');
  }

  const test = globalState.currentTest;

  if (!test) {
    throw new Error('expectSnapshot can only be called inside of an it()');
  }

  if (!test.file) {
    throw new Error('File for test not found');
  }

  let snapshotState = globalState.snapshotStates[test.file];

  if (!snapshotState) {
    snapshotState = getSnapshotState(test.file, globalState.updateSnapshot);
    globalState.snapshotStates[test.file] = snapshotState;
  }

  const context: SnapshotContext = {
    snapshotState,
    currentTestName: test.fullTitle(),
  };

  return {
    toMatch: expectToMatchSnapshot.bind(null, context, received),
    // use bind to support optional 3rd argument (actual)
    toMatchInline: expectToMatchInlineSnapshot.bind(null, context, received),
  };
}

function expectToMatchSnapshot(snapshotContext: SnapshotContext, received: any) {
  const matcher = toMatchSnapshot.bind(snapshotContext as any);
  const result = matcher(received);

  if (!result.pass) {
    throw new Error(result.message());
  }
}

function expectToMatchInlineSnapshot(
  snapshotContext: SnapshotContext,
  received: any,
  _actual?: any
) {
  const matcher = toMatchInlineSnapshot.bind(snapshotContext as any);

  const result = arguments.length === 2 ? matcher(received) : matcher(received, _actual);

  if (!result.pass) {
    throw new Error(result.message());
  }
}
