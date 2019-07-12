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
import { run } from './run';
import { storybookAliases } from './storybook/aliases';

const rootDir = join(__dirname, '..', '..');

const help = `
        Usage:

        yarn storybook <alias>

        Available aliases:

        ${Object.entries(storybookAliases)
          .map(([alias, path]) => `📕 ${alias}`)
          .join('\n        ')}

        Add your alias in src/dev/storybook/aliases.ts:20
`;

run(
  async params => {
    const { flags, log } = params;
    const {
      _: [alias],
    } = flags;

    if (!alias || !(storybookAliases as any)[alias]) {
      // eslint-disable-next-line no-console
      console.log(help);
      return;
    }

    const relative = (storybookAliases as any)[alias];
    const absolute = join(rootDir, relative);

    log.info('Loading Storybook:', absolute);

    process.chdir(join(absolute, '..', '..'));
    require(absolute);
  },
  {
    description: `
    Start a 📕 Storybook for a plugin
  `,
    flags: {
      boolean: ['fix'],
      default: {
        fix: false,
      },
      help,
    },
  }
);
