/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PRESET_TIMER } from 'listr2';
import { TaskSignature } from '../../types';
import { ErrorReporter } from '../../utils/error_reporter';
import {
  extractUntrackedMessages,
  getNamespacePathsForRoot,
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
          const definedNamespacesPaths = Object.values(config.paths).flat();

          for (const rootPath of rootPaths) {
            parent.title = `Checking untracked messages inside "${rootPath}"`;
            const definedPathsForRoot = getNamespacePathsForRoot(rootPath, definedNamespacesPaths);

            for await (const untrackedMessageDetails of extractUntrackedMessages(
              rootPath,
              definedPathsForRoot
            )) {
              const { untrackedFilePath, extractedMessages, totalChecked, totalToCheck } =
                untrackedMessageDetails;

              task.output = `[${totalChecked}/${totalToCheck}] Found ${extractedMessages.size} untracked messages in file ${untrackedFilePath}`;
              if (extractedMessages.size > 0) {
                const error = new Error(
                  `The file ${untrackedFilePath} contains i18n messages but is not defined in the .i18nrc namespaces paths`
                );
                errorReporter.report(error);
              }
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
