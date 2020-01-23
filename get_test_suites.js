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
import { getTests } from '@kbn/test';
import { ALL as ALL_OSS } from './test/all_configs';
import { ALL as ALL_XPACK } from './x-pack/test/all_configs';

module.exports = async () => {
  const configGroups = {
    oss: ALL_OSS,
    xpack: ALL_XPACK,
  };

  const testSuites = {};
  for (const key in configGroups) {
    if (configGroups.hasOwnProperty(key)) {
      testSuites[key] = {};

      for (const file of configGroups[key]) {
        testSuites[key][file] = await getTests(file);
      }
    }
  }

  const ff = require.resolve('./test/functional/config.firefox.js');
  testSuites.ossFirefox = {};
  testSuites.ossFirefox[ff] = await getTests(ff, {
    suiteTags: {
      include: ['smoke'],
    },
  });

  const xpackFF = require.resolve('./x-pack/test/functional/config.firefox.js');
  testSuites.xpackFirefox = {};
  testSuites.xpackFirefox[xpackFF] = await getTests(xpackFF, {
    suiteTags: {
      include: ['smoke'],
    },
  });

  console.log(testSuites);
  fs.writeFileSync('test-suites.json', JSON.stringify(testSuites, null, 4));
};
