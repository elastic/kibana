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
import * as fs from 'fs';
import * as path from 'path';
import { run } from './run';

const config = JSON.parse(fs.readFileSync(path.resolve('./api-extractor.json')).toString());

// Because of the internals of api-extractor ILogger can't be implemented as a typescript Class
const memoryLogger = {
  warnings: [] as string[],
  errors: [] as string[],
  logVerbose(message: string) {
    return null;
  },

  logInfo(message: string) {
    return null;
  },

  logWarning(message: string) {
    this.warnings.push(message);
  },

  logError(message: string) {
    this.errors.push(message);
  },
};

const options = {
  // Indicates that API Extractor is running as part of a local build,
  // e.g. on developer's machine. For example, if the *.api.ts output file
  // has differences, it will be automatically overwritten for a
  // local build, whereas this should report an error for a production build.
  localBuild: false,
  customLogger: memoryLogger,
};

run(({ log }) => {
  const extractor = new Extractor(config, options);
  const apiChanged = !extractor.processProject();

  memoryLogger.errors.forEach(e => log.warning(e));
  memoryLogger.warnings
    .filter(msg => !msg.startsWith('You have changed the public API signature for this project.'))
    .forEach(msg => log.warning(msg));

  if (apiChanged) {
    log.warning('You have changed the public signature of the Kibana Core API\n');
    log.warning(
      'Review your changes and then:\n' +
        '\t 1. Overwrite common/core_api_review/kibana.api.ts with a copy of build/kibana.api.ts\n' +
        '\t 2. Regenarate core documentation with `yarn docs:api`\n' +
        "\t 3. Describe the change in your PR including whether it's a major, minor or patch"
    );
  }
});
