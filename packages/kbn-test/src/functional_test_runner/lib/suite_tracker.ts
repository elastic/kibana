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
import fs from 'fs';
import { dirname, relative, resolve } from 'path';

import { REPO_ROOT } from '@kbn/dev-utils';

import { Lifecycle } from './lifecycle';

export interface SuiteInProgress {
  startTime?: Date;
  endTime?: Date;
  success?: boolean;
}

export interface SuiteWithMetadata {
  config: string;
  file: string;
  tag: string;
  title: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  hasTests: boolean;
}

const getTestMetadataPath = () => {
  return process.env.TEST_METADATA_PATH || resolve(REPO_ROOT, 'target', 'test_metadata.json');
};

export class SuiteTracker {
  finishedSuitesByConfig: Record<string, Record<string, SuiteWithMetadata>> = {};
  inProgressSuites: Map<object, SuiteInProgress> = new Map<object, SuiteInProgress>();

  static startTracking(lifecycle: Lifecycle, configPath: string): SuiteTracker {
    const suiteTracker = new SuiteTracker(lifecycle, configPath);
    return suiteTracker;
  }

  getTracked(suite: object): SuiteInProgress {
    if (!this.inProgressSuites.has(suite)) {
      this.inProgressSuites.set(suite, { success: undefined } as SuiteInProgress);
    }
    return this.inProgressSuites.get(suite)!;
  }

  constructor(lifecycle: Lifecycle, configPathAbsolute: string) {
    if (fs.existsSync(getTestMetadataPath())) {
      fs.unlinkSync(getTestMetadataPath());
    } else {
      fs.mkdirSync(dirname(getTestMetadataPath()), { recursive: true });
    }

    const config = relative(REPO_ROOT, configPathAbsolute);

    lifecycle.beforeTestSuite.add(suite => {
      const tracked = this.getTracked(suite);
      tracked.startTime = new Date();
    });

    // If a test fails, we want to make sure all of the ancestors, all the way up to the root, get marked as failed
    // This information is not available on the mocha objects without traversing all descendants of a given node
    const handleFailure = (_: any, test: any) => {
      let parent = test.parent;

      // Infinite loop protection, just in case
      for (let i = 0; i < 500 && parent; i++) {
        if (this.inProgressSuites.has(parent)) {
          this.getTracked(parent).success = false;
        }
        parent = parent.parent;
      }
    };

    lifecycle.testFailure.add(handleFailure);
    lifecycle.testHookFailure.add(handleFailure);

    lifecycle.afterTestSuite.add(suite => {
      const tracked = this.getTracked(suite);
      tracked.endTime = new Date();

      // The suite ended without any children failing, so we can mark it as successful
      if (typeof tracked.success === 'undefined') {
        tracked.success = true;
      }

      let duration = tracked.endTime.getTime() - (tracked.startTime || new Date()).getTime();
      duration = Math.floor(duration / 1000);

      const file = relative(REPO_ROOT, suite.file);

      this.finishedSuitesByConfig[config] = this.finishedSuitesByConfig[config] || {};

      // This will get called multiple times for a test file that has multiple describes in it or similar
      // This is okay, because the last one that fires is always the root of the file, which is is the one we ultimately want
      this.finishedSuitesByConfig[config][file] = {
        ...tracked,
        duration,
        config,
        file,
        tag: suite.suiteTag,
        title: suite.title,
        hasTests: !!(
          (suite.tests && suite.tests.length) ||
          // The below statement is so that `hasTests` will bubble up nested describes in the same file
          (this.finishedSuitesByConfig[config][file] &&
            this.finishedSuitesByConfig[config][file].hasTests)
        ),
      } as SuiteWithMetadata;
    });

    lifecycle.cleanup.add(() => {
      const suites = this.getAllFinishedSuites();

      fs.writeFileSync(getTestMetadataPath(), JSON.stringify(suites, null, 2));
    });
  }

  getAllFinishedSuites() {
    const flattened: SuiteWithMetadata[] = [];
    for (const byFile of Object.values(this.finishedSuitesByConfig)) {
      for (const suite of Object.values(byFile)) {
        flattened.push(suite);
      }
    }

    flattened.sort((a, b) => b.duration - a.duration);
    return flattened;
  }
}
