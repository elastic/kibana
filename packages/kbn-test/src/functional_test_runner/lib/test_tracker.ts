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

export interface SuiteWithDuration {
  duration: number;
}

const getTestMetadataPath = () => {
  return process.env.TEST_METADATA_PATH || resolve(REPO_ROOT, 'target', 'test_metadata.json');
};

const setSuccessStatus = (suite: any) => {
  if (suite.tests && suite.tests.length) {
    suite.success = !suite.tests.find((t: any) => t.state === 'failed');

    if (!suite.success) {
      return;
    }
  }

  if (suite.suites && suite.suites.length) {
    suite.success = !suite.suites.find((s: any) => !s.success);
  }
};

export class TestTracker {
  lifecycle: Lifecycle;
  allSuites: any = {};

  constructor(lifecycle: Lifecycle) {
    this.lifecycle = lifecycle;

    if (fs.existsSync(getTestMetadataPath())) {
      fs.unlinkSync(getTestMetadataPath());
    }

    lifecycle.beforeTestSuite.add(s => {
      s.startTime = new Date();
      s.success = true;
    });

    lifecycle.afterTestSuite.add(suite => {
      suite.endTime = new Date();
      suite.duration = new Date(suite.endTime).getTime() - new Date(suite.startTime).getTime();
      suite.duration = Math.floor(suite.duration / 1000);
      suite.durationMin = Math.round(suite.duration / 60);

      setSuccessStatus(suite);

      const config = suite.ftrConfig.path.replace(REPO_ROOT + sep, '');
      const file = suite.file.replace(REPO_ROOT + sep, '');

      // TODO should non-leaf suite (e.g. index files) still be included here? is it confusing?
      this.allSuites[config] = this.allSuites[config] || {};
      this.allSuites[config][file] = {
        config,
        file,
        tag: suite.suiteTag,
        title: suite.title,
        startTime: suite.startTime,
        endTime: suite.endTime,
        duration: suite.duration,
        success: suite.success,
        leafSuite: !!(
          (suite.tests && suite.tests.length) ||
          (this.allSuites[config][file] && this.allSuites[config][file].leafSuite)
        ),
      };
    });

    // TODO gate behind a CI env var or something
    lifecycle.cleanup.add(() => {
      const flattened: SuiteWithDuration[] = [];
      Object.values(this.allSuites).forEach((x: any) =>
        Object.values(x).forEach((y: any) => flattened.push(y))
      );
      flattened.sort((a: SuiteWithDuration, b: SuiteWithDuration) => b.duration - a.duration);
      fs.writeFileSync(getTestMetadataPath(), JSON.stringify(flattened, null, 2));
    });
  }
}
