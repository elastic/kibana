/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve, join } from 'path';
import { I18N_RC } from '../constants';
import { ErrorReporter, checkConfigNamespacePrefix, arrayify } from '..';

export function checkConfigs(additionalConfigPaths: string | string[] = []) {
  const root = join(__dirname, '../../../../');
  const kibanaRC = resolve(root, I18N_RC);
  const xpackRC = resolve(root, 'x-pack', I18N_RC);

  const configPaths = [kibanaRC, xpackRC, ...arrayify(additionalConfigPaths)];

  return configPaths.map((configPath) => ({
    task: async (context: { reporter: ErrorReporter }) => {
      try {
        await checkConfigNamespacePrefix(configPath);
      } catch (err) {
        const { reporter } = context;
        const reporterWithContext = reporter.withContext({ name: configPath });
        reporterWithContext.report(err);
        throw reporter;
      }
    },
    title: `Checking configs in ${configPath}`,
  }));
}
