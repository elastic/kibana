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

import { Lifecycle } from '../lifecycle';
import { Mocha } from '../../fake_mocha_types';

const allSuites: any = {};
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

const BASE_PATH = resolve(__dirname, '..', '..', '..', '..', '..', '..');

const getTestMetadataPath = () => {
  return process.env.TEST_METADATA_PATH || resolve(BASE_PATH, 'target', 'test_metadata.json');
};

/**
 *  Run the tests that have already been loaded into
 *  mocha. aborts tests on 'cleanup' lifecycle runs
 *
 *  @param  {Lifecycle} lifecycle
 *  @param  {ToolingLog} log
 *  @param  {Mocha} mocha
 *  @return {Promise<Number>} resolves to the number of test failures
 */
export async function runTests(lifecycle: Lifecycle, mocha: Mocha) {
  let runComplete = false;
  const runner = mocha.run(() => {
    runComplete = true;
  });

  if (fs.existsSync(getTestMetadataPath())) {
    fs.unlinkSync(getTestMetadataPath());
  }

  lifecycle.cleanup.add(() => {
    if (!runComplete) runner.abort();
  });

  lifecycle.beforeTestSuite.add(s => {
    // console.log('before', s.title + '\n' + s.file);
    s.startTime = new Date();
    s.success = true;
  });

  lifecycle.afterTestSuite.add(suite => {
    suite.endTime = new Date();
    suite.duration = new Date(suite.endTime).getTime() - new Date(suite.startTime).getTime();
    suite.duration = Math.floor(suite.duration / 1000);
    suite.durationMin = Math.round(suite.duration / 60);

    setSuccessStatus(suite);

    const config = suite.ftrConfig.path.replace(BASE_PATH + sep, '');
    const file = suite.file.replace(BASE_PATH + sep, '');

    allSuites[config] = allSuites[config] || {};

    // highest level suite in lowest level files?

    allSuites[config][file] = {
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
        (allSuites[config][file] && allSuites[config][file].leafSuite)
      ),
    };
  });

  lifecycle.cleanup.add(() => {
    const flattened: object[] = [];
    Object.values(allSuites).forEach((x: any) =>
      Object.values(x).forEach((y: any) => flattened.push(y))
    );
    flattened.sort((a: object, b: object) => b.duration - a.duration);
    fs.writeFileSync(getTestMetadataPath(), JSON.stringify(flattened, null, 2));
  });

  return new Promise(res => {
    const respond = () => res(runner.failures);

    // if there are no tests, mocha.run() is sync
    // and the 'end' event can't be listened to
    if (runComplete) {
      respond();
    } else {
      runner.on('end', respond);
    }
  });
}
