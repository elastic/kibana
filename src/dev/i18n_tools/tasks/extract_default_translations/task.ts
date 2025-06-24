/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PRESET_TIMER } from 'listr2';
import { TaskSignature } from '../../types';
import { runForNamespacePath } from './extract_with_formatjs';
import { ErrorReporter } from '../../utils/error_reporter';

export interface TaskOptions {
  filterNamespaces?: string[];
}

export const extractDefaultMessagesTask: TaskSignature<TaskOptions> = (
  context,
  task,
  { filterNamespaces }
) => {
  const { config } = context;
  const errorReporter = new ErrorReporter({ name: 'Extract Translations' });

  if (!config || !Object.keys(config.paths).length) {
    throw errorReporter.reportFailure(
      'None of input paths is covered by the mappings in .i18nrc.json'
    );
  }

  return task.newListr(
    (parent) => [
      {
        title: `Extracting i18n messages inside namespaces`,
        task: async () => {
          const namespacesDetails = Object.entries(config.paths).filter(([namespace]) => {
            if (filterNamespaces && filterNamespaces.length) {
              return filterNamespaces.some((filterNamespace) => filterNamespace === namespace);
            }

            return true;
          });

          let iter = 0;
          let totalMessagesCount = 0;
          for (const [namespace, namespacePaths] of namespacesDetails) {
            const countMessage = `Extracting i18n messages inside "${namespace}" namespace`;
            task.output = countMessage;
            const allNamespaceMessages = await runForNamespacePath(namespacePaths);
            const messagesCount = allNamespaceMessages.size;
            parent.title = `[${iter + 1}/${
              namespacesDetails.length
            }] Successfully extracted Namespace "${namespace}" with ${messagesCount} defined i18n messages.`;
            iter++;
            totalMessagesCount += messagesCount;
            context.messages.set(namespace, [...allNamespaceMessages.values()]);
          }

          parent.title = `[${iter}/${namespacesDetails.length}] Successfully extracted all namespaces with ${totalMessagesCount} total defined i18n messages.`;
        },
      },
    ],
    { exitOnError: true, rendererOptions: { timer: PRESET_TIMER }, collectErrors: 'minimal' }
  );
};
