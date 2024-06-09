/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve, join } from 'path';
import { arrayify } from '../../utils';
import { assignConfigFromPath } from './i18n_config';
import { I18nCheckTaskContext } from '../../types';

export function mergeConfigs(additionalConfigPaths: string | string[] = []) {
  const root = join(__dirname, '../../../../../');
  const kibanaRC = resolve(root, '.i18nrc.json');
  const xpackRC = resolve(root, 'x-pack/.i18nrc.json');

  const configPaths = [kibanaRC, xpackRC, ...arrayify(additionalConfigPaths)];

  return configPaths.map((configPath) => ({
    task: async (context: I18nCheckTaskContext) => {
      try {
        context.config = await assignConfigFromPath(context.config, configPath);
      } catch (err) {
        const { errorReporter } = context;
        const reporterWithContext = errorReporter.withContext({ name: configPath });
        reporterWithContext.reportError(err);
        throw errorReporter;
      }
    },
    title: `Merging configs in ${configPath}`,
  }));
}
