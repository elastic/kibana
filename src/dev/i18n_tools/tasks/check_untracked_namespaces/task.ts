/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PRESET_TIMER } from 'listr2';
import type { TaskSignature } from '../../types';
import { ErrorReporter } from '../../utils/error_reporter';
import {
  extractUntrackedMessages,
  reportUntrackedExtraction,
} from './extract_untracked_translations';

export interface TaskOptions {
  rootPaths: string[];
}
export const checkUntrackedNamespacesTask: TaskSignature<TaskOptions> = (
  context,
  task,
  options
) => {
  const { config } = context;
  const { rootPaths } = options;
  const errorReporter = new ErrorReporter({ name: 'Untracked Translations' });

  if (!config || !Object.keys(config.paths).length) {
    throw errorReporter.reportFailure(
      'None of input paths is covered by the mappings in .i18nrc.json'
    );
  }

  return task.newListr(
    (parent) => [
      {
        title: `Checking Untracked Messages not defined in .i18nrc namespaces`,
        task: async () => {
          const ignoredDirs = [...Object.values(config.paths).flat(), ...config.exclude];

          for (const rootPath of rootPaths) {
            parent.title = `Checking untracked messages inside "${rootPath}"`;

            for await (const extraction of extractUntrackedMessages(rootPath, ignoredDirs)) {
              const {
                untrackedFilePath,
                extractedMessages,
                parseError,
                totalChecked,
                totalToCheck,
              } = extraction;

              if (extractedMessages.size > 0 || parseError) {
                task.output = `[${totalChecked}/${totalToCheck}] Found ${extractedMessages.size} untracked messages in file ${untrackedFilePath}`;
              }
              reportUntrackedExtraction(errorReporter, extraction);
            }
          }

          if (errorReporter.hasErrors()) {
            throw errorReporter.throwErrors();
          }
          const formattedRootPaths = rootPaths.map((rootPath) => `"${rootPath}"`).join(', ');
          parent.title = `Check all untracked messages inside [${formattedRootPaths}]`;
        },
      },
    ],
    { exitOnError: true, rendererOptions: { timer: PRESET_TIMER }, collectErrors: 'full' }
  );
};
