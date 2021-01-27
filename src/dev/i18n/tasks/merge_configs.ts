/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve, join } from 'path';
import { ErrorReporter, I18nConfig, assignConfigFromPath, arrayify } from '..';

export function mergeConfigs(additionalConfigPaths: string | string[] = []) {
  const root = join(__dirname, '../../../../');
  const kibanaRC = resolve(root, '.i18nrc.json');
  const xpackRC = resolve(root, 'x-pack/.i18nrc.json');

  const configPaths = [kibanaRC, xpackRC, ...arrayify(additionalConfigPaths)];

  return configPaths.map((configPath) => ({
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
