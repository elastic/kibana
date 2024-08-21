/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import { arrayify, ErrorReporter, makeAbsolutePath } from '../../utils';
import { assignConfigFromPath } from './i18n_config';
import { I18nCheckTaskContext } from '../../types';
import { I18N_RC } from '../../constants';

export function mergeConfigs(additionalConfigPaths: string | string[] = []) {
  const kibanaRC = makeAbsolutePath(I18N_RC);
  const xpackRC = makeAbsolutePath(join('x-pack', I18N_RC));

  const configPaths = [kibanaRC, xpackRC, ...arrayify(additionalConfigPaths)];

  return configPaths.map((configPath) => ({
    task: async (context: I18nCheckTaskContext) => {
      const errorReporter = new ErrorReporter({ name: `Merging config path ${configPath}` });
      try {
        context.config = await assignConfigFromPath(context.config, configPath);
      } catch (err) {
        throw errorReporter.reportFailure(err);
      }
    },
    title: `Merging configs in ${configPath}`,
  }));
}
