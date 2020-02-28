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
import { resolve, sep } from 'path';

import { REPO_ROOT } from '@kbn/dev-utils';

import { Lifecycle } from './lifecycle';

export interface TrackedSuiteMetadata {
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  success?: boolean;
}

export interface TrackedSuite {
  config: string;
  file: string;
  tag: string;
  title: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  leafSuite: boolean;
}

const getTestMetadataPath = () => {
  return process.env.TEST_METADATA_PATH || resolve(REPO_ROOT, 'target', 'test_metadata.json');
};

export class TestTracker {
  lifecycle: Lifecycle;
  allSuites: Record<string, Record<string, TrackedSuite>> = {};
  trackedSuites: Map<object, TrackedSuiteMetadata> = new Map<object, TrackedSuiteMetadata>();

  getTracked(suite: object): TrackedSuiteMetadata {
    if (!this.trackedSuites.has(suite)) {
      this.trackedSuites.set(suite, { success: true } as TrackedSuiteMetadata);
    }
    return this.trackedSuites.get(suite) || ({} as TrackedSuiteMetadata);
  }

  constructor(lifecycle: Lifecycle) {
    this.lifecycle = lifecycle;

    if (fs.existsSync(getTestMetadataPath())) {
      fs.unlinkSync(getTestMetadataPath());
    }

    lifecycle.beforeTestSuite.add(suite => {
      const tracked = this.getTracked(suite);
      tracked.startTime = new Date();
      tracked.success = true;
    });

    const handleFailure = (error: any, test: any) => {
      let parent = test.parent;
      for (let i = 0; i < 100 && parent; i++) {
        if (this.trackedSuites.has(parent)) {
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
      tracked.duration = tracked.endTime.getTime() - (tracked.startTime || new Date()).getTime();
      tracked.duration = Math.floor(tracked.duration / 1000);

      const config = suite.ftrConfig.path.replace(REPO_ROOT + sep, '');
      const file = suite.file.replace(REPO_ROOT + sep, '');

      // TODO should non-leaf suite (e.g. index files) still be included here? is it confusing?
      this.allSuites[config] = this.allSuites[config] || {};
      this.allSuites[config][file] = {
        ...tracked,
        config,
        file,
        tag: suite.suiteTag,
        title: suite.title,
        leafSuite: !!(
          (suite.tests && suite.tests.length) ||
          (this.allSuites[config][file] && this.allSuites[config][file].leafSuite)
        ),
      } as TrackedSuite;
    });

    // TODO gate behind a CI env var or something
    lifecycle.cleanup.add(() => {
      const flattened: TrackedSuite[] = [];
      Object.values(this.allSuites).forEach((x: Record<string, TrackedSuite>) =>
        Object.values(x).forEach((y: TrackedSuite) => flattened.push(y))
      );
      flattened.sort((a, b) => b.duration - a.duration);
      fs.writeFileSync(getTestMetadataPath(), JSON.stringify(flattened, null, 2));
    });
  }
}
