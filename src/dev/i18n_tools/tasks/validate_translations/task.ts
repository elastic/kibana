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
import { runForNamespacePath } from './per_namespace';
import { ErrorReporter } from '../../utils/error_reporter';

export interface TaskOptions {
  filterNamespaces?: string[];
  ignoreMalformed?: boolean;
}

export const validateTranslationsTask: TaskSignature<TaskOptions> = (
  context,
  task,
  { filterNamespaces, ignoreMalformed }
) => {
  const { config } = context;
  const errorReporter = new ErrorReporter({ name: 'Validate Translations' });

  if (!config || !Object.keys(config.paths).length) {
    throw errorReporter.reportFailure(
      'None of input paths is covered by the mappings in .i18nrc.json'
    );
  }

  return task.newListr(
    (parent) => [
      {
        title: `Verifying i18n messages inside namespaces`,
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
            const countMessage = `Verifying i18n messages inside "${namespace}" namespace`;
            task.output = countMessage;
            const allNamespaceMessages = await runForNamespacePath(
              namespace,
              namespacePaths,
              errorReporter,
              { ignoreMalformed }
            );
            const messagesCount = allNamespaceMessages.size;
            parent.title = `[${iter + 1}/${
              namespacesDetails.length
            }] Successfully verified Namespace "${namespace}" with ${messagesCount} defined i18n messages.`;
            iter++;
            totalMessagesCount += messagesCount;
            context.messages.set(namespace, [...allNamespaceMessages.values()]);
          }

          parent.title = `[${iter}/${namespacesDetails.length}] Successfully verified all namespaces with ${totalMessagesCount} total defined i18n messages.`;
        },
      },
    ],
    { exitOnError: true, rendererOptions: { timer: PRESET_TIMER }, collectErrors: 'minimal' }
  );
};
