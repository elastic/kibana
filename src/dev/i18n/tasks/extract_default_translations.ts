/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import chalk from 'chalk';
import { createFailError } from '@kbn/dev-utils';
import { ErrorReporter, extractMessagesFromPathToMap, filterConfigPaths, I18nConfig } from '..';

export function extractDefaultMessages(config: I18nConfig, inputPaths: string[]) {
  const filteredPaths = filterConfigPaths(inputPaths, config) as string[];
  if (filteredPaths.length === 0) {
    throw createFailError(
      `${chalk.white.bgRed(
        ' I18N ERROR '
      )} None of input paths is covered by the mappings in .i18nrc.json.`
    );
  }
  return filteredPaths.map((filteredPath) => ({
    task: async (context: {
      messages: Map<string, { message: string }>;
      reporter: ErrorReporter;
    }) => {
      const { messages, reporter } = context;
      const initialErrorsNumber = reporter.errors.length;

      // Return result if no new errors were reported for this path.
      const result = await extractMessagesFromPathToMap(filteredPath, messages, config, reporter);
      if (reporter.errors.length === initialErrorsNumber) {
        return result;
      }

      throw reporter;
    },
    title: filteredPath,
  }));
}
