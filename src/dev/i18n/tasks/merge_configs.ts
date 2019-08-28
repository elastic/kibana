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

import { resolve, join } from 'path';
import { ErrorReporter, I18nConfig, assignConfigFromPath, arrayify } from '..';

export function mergeConfigs(additionalConfigPaths: string | string[] = []) {
  const root = join(__dirname, '../../../../');
  const kibanaRC = resolve(root, '.i18nrc.json');
  const xpackRC = resolve(root, 'x-pack/.i18nrc.json');

  const configPaths = [kibanaRC, xpackRC, ...arrayify(additionalConfigPaths)];

  return configPaths.map(configPath => ({
    task: async (context: { reporter: ErrorReporter; config?: I18nConfig }) => {
      try {
        context.config = await assignConfigFromPath(context.config, configPath);
      } catch (err) {
        const { reporter } = context;
        const reporterWithContext = reporter.withContext({ name: configPath });
        reporterWithContext.report(err);
        throw reporter;
      }
    },
    title: `Merging configs in ${configPath}`,
  }));
}
