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

import chalk from 'chalk';
import Listr from 'listr';
import execa from 'execa';

import { run, createFailError } from './run';
import {
  extractDefaultTranslations,
  filterPaths,
  validateDefaultMessages,
} from './i18n/extract_default_translations';

run(async ({ flags: { path, output, 'output-format': outputFormat } }) => {
  const paths = Array.isArray(path) ? path : [path || './'];

  if (output) {
    await extractDefaultTranslations({
      paths,
      output,
      outputFormat,
    });
  } else {
    const filteredPaths = filterPaths(paths);

    if (filteredPaths.length === 0) {
      throw createFailError(
        `${chalk.white.bgRed(' I18N ERROR ')} \
None of input paths is available for extraction or validation. See .i18nrc.json.`
      );
    }

    if (filteredPaths.length === 1) {
      await validateDefaultMessages(filteredPaths[0]);
    } else {
      const list = new Listr(
        filteredPaths.map(filteredPath => ({
          task: () =>
            execa('node', ['scripts/i18n_check', '--path', filteredPath], {
              env: chalk.enabled ? { FORCE_COLOR: 'true' } : {},
            }),
          title: filteredPath,
        })),
        {
          concurrent: true,
        }
      );

      await list.run();
    }
  }
});
