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

import { isAbsolute } from 'path';

import { ToolingLog } from '@kbn/dev-utils';

import { loadTracer } from '../load_tracer';
import { ProviderCollection } from '../providers';
import { SuiteDefinition } from './suite_definition';
import { createFakeMochaUi } from './create_fake_mocha_ui';
import { Matcher } from './matcher';

interface Options {
  testFiles: string[];
  log: ToolingLog;
  providers: ProviderCollection;
  updateBaselines?: boolean;
  excludePaths?: string[];
  includeTags?: string[];
  excludeTags?: string[];
  grep?: string;
  invertGrep?: boolean;
}

export function loadTests({
  testFiles,
  log,
  providers,
  updateBaselines = false,
  excludePaths = [],
  includeTags = [],
  excludeTags = [],
  grep,
  invertGrep = false,
}: Options) {
  const pendingExcludes = new Set(excludePaths.slice(0));
  const rootSuite = new SuiteDefinition(undefined, undefined, false, false);
  const fakeMochaUi = createFakeMochaUi(rootSuite);
  for (const [key, value] of Object.entries(fakeMochaUi)) {
    (global as any)[key] = value;
  }

  const innerLoadTestFile = (path: string) => {
    if (typeof path !== 'string' || !isAbsolute(path)) {
      throw new TypeError('loadTestFile() only accepts absolute paths');
    }

    if (pendingExcludes.has(path)) {
      pendingExcludes.delete(path);
      log.warning('Skipping test file %s', path);
      return;
    }

    loadTracer(path, `testFile[${path}]`, () => {
      log.verbose('Loading test file %s', path);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const testModule = require(path);
      const testProvider = testModule.__esModule ? testModule.default : testModule;

      const returnVal = testProvider({
        loadTestFile: innerLoadTestFile,
        getService: providers.getService,
        getPageObject: providers.getPageObject,
        getPageObjects: providers.getPageObjects,
        updateBaselines,
      });

      if (returnVal && typeof returnVal.then === 'function') {
        throw new TypeError('Default export of test files must not be an async function');
      }
    });
  };

  for (const testFile of testFiles) {
    innerLoadTestFile(testFile);
  }

  if (pendingExcludes.size) {
    throw new Error(
      `After loading all test files some exclude paths were not consumed:${[
        '',
        ...pendingExcludes,
      ].join('\n  -')}`
    );
  }

  for (const key of Object.keys(fakeMochaUi)) {
    delete (global as any)[key];
  }

  return rootSuite.finalize(
    new Matcher({
      excludeTags,
      includeTags,
      exclusive: rootSuite.hasAnyExclusiveChildren(),
      grep,
      invertGrep,
    })
  );
}
