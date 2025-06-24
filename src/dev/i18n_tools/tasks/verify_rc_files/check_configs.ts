/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { I18N_RC } from '../../constants';
import { arrayify, ErrorReporter, makeAbsolutePath } from '../../utils';
import { checkConfigNamespacePrefix } from './i18n_config';
import { I18nCheckTaskContext } from '../../types';

export function checkConfigs(additionalConfigPaths: string | string[] = []) {
  const kibanaRC = makeAbsolutePath(I18N_RC);
  const xpackRC = makeAbsolutePath(join('x-pack', I18N_RC));

  const configPaths = [kibanaRC, xpackRC, ...arrayify(additionalConfigPaths)];

  return configPaths.map((configPath) => ({
    task: async (context: I18nCheckTaskContext) => {
      const errorReporter = new ErrorReporter({ name: `Checking config path ${configPath}` });

      try {
        await checkConfigNamespacePrefix(configPath);
      } catch (err) {
        throw errorReporter.reportFailure(err);
      }
    },
    title: `Checking configs in ${configPath}`,
  }));
}
