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
import { flatten, once } from 'lodash';
import { Lifecycle } from '../lifecycle';
import { Test, Suite } from '../../fake_mocha_types';

type ISnapshotState = InstanceType<typeof SnapshotState>;

interface SnapshotContext {
  snapshotState: ISnapshotState;
  currentTestName: string;
}

let testContext: {
  file: string;
  snapshotTitle: string;
  snapshotContext: SnapshotContext;
} | null = null;

let registered: boolean = false;

function getSnapshotMeta(currentTest: Test) {
  // Make sure snapshot title is unique per-file, rather than entire
  // suite. This allows reuse of tests, for instance to compare
  // results for different configurations.

  const titles = [currentTest.title];
  const file = currentTest.file;

  let test: Suite | undefined = currentTest?.parent;

  while (test && test.file === file) {
    titles.push(test.title);
    test = test.parent;
  }

  const snapshotTitle = titles.reverse().join(' ');

  if (!file || !snapshotTitle) {
    throw new Error(`file or snapshotTitle not available in Mocha test context`);
  }

  return {
    file,
    snapshotTitle,
  };
}

const modifyStackTracePrepareOnce = once(() => {
  const originalPrepareStackTrace = Error.prepareStackTrace;

  // jest-snapshot uses a stack trace to determine which file/line/column
  // an inline snapshot should be written to. We filter out match_snapshot
  // from the stack trace to prevent it from wanting to write to this file.

  Error.prepareStackTrace = (error, structuredStackTrace) => {
    let filteredStrackTrace: NodeJS.CallSite[] = structuredStackTrace;
    if (registered) {
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

export function decorateSnapshotUi(lifecycle: Lifecycle, updateSnapshots: boolean) {
  let snapshotStatesByFilePath: Record<
    string,
    { snapshotState: ISnapshotState; testsInFile: Test[] }
  > = {};

  registered = true;

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

  lifecycle.beforeEachTest.add((currentTest: Test) => {
    const { file, snapshotTitle } = getSnapshotMeta(currentTest);

    if (!snapshotStatesByFilePath[file]) {
      snapshotStatesByFilePath[file] = getSnapshotState(file, currentTest, updateSnapshots);
    }

    testContext = {
      file,
      snapshotTitle,
      snapshotContext: {
        snapshotState: snapshotStatesByFilePath[file].snapshotState,
        currentTestName: snapshotTitle,
      },
    };
  });

  lifecycle.afterTestSuite.add(function (testSuite) {
    // save snapshot & check unused after top-level test suite completes
    if (testSuite.parent?.parent) {
      return;
    }

    const unused: string[] = [];

    Object.keys(snapshotStatesByFilePath).forEach((file) => {
      const { snapshotState, testsInFile } = snapshotStatesByFilePath[file];

      testsInFile.forEach((test) => {
        const snapshotMeta = getSnapshotMeta(test);
        // If test is failed or skipped, mark snapshots as used. Otherwise,
        // running a test in isolation will generate false positives.
        if (!test.isPassed()) {
          snapshotState.markSnapshotsAsCheckedForTest(snapshotMeta.snapshotTitle);
        }
      });

      if (!updateSnapshots) {
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

    snapshotStatesByFilePath = {};
  });
}

function recursivelyGetTestsFromSuite(suite: Suite): Test[] {
  return suite.tests.concat(flatten(suite.suites.map((s) => recursivelyGetTestsFromSuite(s))));
}

function getSnapshotState(file: string, test: Test, updateSnapshots: boolean) {
  const dirname = path.dirname(file);
  const filename = path.basename(file);

  let parent: Suite | undefined = test.parent;

  while (parent && parent.parent?.file === file) {
    parent = parent.parent;
  }

  if (!parent) {
    throw new Error('Top-level suite not found');
  }

  const snapshotState = new SnapshotState(
    path.join(dirname + `/__snapshots__/` + filename.replace(path.extname(filename), '.snap')),
    {
      updateSnapshot: updateSnapshots ? 'all' : 'new',
      getPrettier: () => prettier,
      getBabelTraverse: () => babelTraverse,
    }
  );

  return { snapshotState, testsInFile: recursivelyGetTestsFromSuite(parent) };
}

export function expectSnapshot(received: any) {
  if (!registered) {
    throw new Error(
      'Mocha hooks were not registered before expectSnapshot was used. Call `registerMochaHooksForSnapshots` in your top-level describe().'
    );
  }

  if (!testContext) {
    throw new Error('A current Mocha context is needed to match snapshots');
  }

  return {
    toMatch: expectToMatchSnapshot.bind(null, testContext.snapshotContext, received),
    // use bind to support optional 3rd argument (actual)
    toMatchInline: expectToMatchInlineSnapshot.bind(null, testContext.snapshotContext, received),
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
