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

import { join } from 'path';
import { run, createFlagError } from '../run';
import { storybookAliases } from './aliases';

const rootDir = join(__dirname, '..', '..');

run(
  async params => {
    const { flags, log } = params;
    const {
      _: [alias],
    } = flags;

    if (!alias) {
      throw createFlagError('missing alias');
    }

    if (!storybookAliases.hasOwnProperty(alias)) {
      throw createFlagError(`unknown alias [${alias}]`);
    }

    const relative = (storybookAliases as any)[alias];
    const absolute = join(rootDir, relative);

    log.info('Loading Storybook:', absolute);
    process.chdir(join(absolute, '..', '..'));
    require(absolute);
  },
  {
    usage: `node scripts/storybook <alias>`,
    description: `
      Start a 📕 Storybook for a plugin

      Available aliases:
        ${Object.keys(storybookAliases)
          .map(alias => `📕 ${alias}`)
          .join('\n        ')}

      Add your alias in src/dev/storybook/aliases.ts
    `,
    flags: {
      boolean: ['fix'],
      default: {
        fix: false,
      },
    },
  }
);
