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


import { Extractor } from '@microsoft/api-extractor';
import { run } from './run';

const config = require('../../api-extractor.json');

const options = {
  // Indicates that API Extractor is running as part of a local build,
  // e.g. on developer's machine. For example, if the *.api.ts output file
  // has differences, it will be automatically overwritten for a
  // local build, whereas this should report an error for a production build.
  localBuild: false
};

run(async ({ log }) => {
  const extractor = new Extractor(config, options);
  const apiChanged = !extractor.processProject();
  if (apiChanged) {
    log.warning('Remember to regenarate core documentation with `yarn docs:api`');
  }
});
