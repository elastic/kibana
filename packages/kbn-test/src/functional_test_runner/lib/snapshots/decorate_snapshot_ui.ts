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
import callsites from 'callsites';
import { Lifecycle } from '../lifecycle';
import { Test } from '../../fake_mocha_types';

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
  snapshots: Array<{ tests: Test[]; file: string; snapshotState: ISnapshotState }>;
} = {
  updateSnapshot: 'none',
  registered: false,
  currentTest: null,
  snapshots: [],
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
  globalState.registered = true;

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

  lifecycle.beforeEachTest.add((test: Test) => {
    globalState.currentTest = test;
  });

  lifecycle.afterTestSuite.add(function (testSuite) {
    // save snapshot & check unused after top-level test suite completes
    if (testSuite.parent?.parent) {
      return;
    }

    const unused: string[] = [];

    globalState.snapshots.forEach((snapshot) => {
      const { tests, snapshotState } = snapshot;
      tests.forEach((test) => {
        const title = test.fullTitle();
        // If test is failed or skipped, mark snapshots as used. Otherwise,
        // running a test in isolation will generate false positives.
        if (!test.isPassed()) {
          snapshotState.markSnapshotsAsCheckedForTest(title);
        }
      });

      if (!globalState.updateSnapshot) {
        unused.push(...snapshotState.getUncheckedKeys());
      } else {
        snapshotState.removeUncheckedKeys();
      }

      snapshotState.save();
    });

    if (unused.length) {
      throw new Error(
        `${unused.length} obsolete snapshot(s) found:\n${unused.join(
          '\n\t'
        )}.\n\nRun tests again with \`--updateSnapshots\` to remove them.`
      );
    }

    globalState.snapshots.length = 0;
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
    throw new Error(
      'Mocha hooks were not registered before expectSnapshot was used. Call `registerMochaHooksForSnapshots` in your top-level describe().'
    );
  }

  if (!globalState.currentTest) {
    throw new Error('expectSnapshot can only be called inside of an it()');
  }

  const [, fileOfTest] = callsites().map((site) => site.getFileName());

  if (!fileOfTest) {
    throw new Error("Couldn't infer a filename for the current test");
  }

  let snapshot = globalState.snapshots.find(({ file }) => file === fileOfTest);

  if (!snapshot) {
    snapshot = {
      file: fileOfTest,
      tests: [],
      snapshotState: getSnapshotState(fileOfTest, globalState.updateSnapshot),
    };
    globalState.snapshots.unshift(snapshot!);
  }

  if (!snapshot) {
    throw new Error('Snapshot is undefined');
  }

  if (!snapshot.tests.includes(globalState.currentTest)) {
    snapshot.tests.push(globalState.currentTest);
  }

  const context: SnapshotContext = {
    snapshotState: snapshot.snapshotState,
    currentTestName: globalState.currentTest.fullTitle(),
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
