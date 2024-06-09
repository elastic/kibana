/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PRESET_TIMER } from 'listr2';
import { TaskSignature } from '../../types';
import { runForNamespacePath } from './per_namespace';

export const validateTranslationsTask: TaskSignature<{}> = (context, task, options) => {
  const { config, errorReporter } = context;
  const taskErrorReporter = errorReporter.withContext({ name: 'Validate Translations' });

  if (!config || !Object.keys(config.paths).length) {
    throw taskErrorReporter.reportFailure(
      'None of input paths is covered by the mappings in .i18nrc.json'
    );
  }

  return task.newListr(
    (parent) => [
      {
        title: `Verifying i18n messages inside namespaces`,
        task: async () => {
          const namespacesDetails = Object.entries(config.paths);
          let iter = 0;
          let totalMessagesCount = 0;
          for (const [namespace, namespacePaths] of namespacesDetails) {
            const countMessage = `Verifying i18n messages inside "${namespace}" namespace`;
            task.output = countMessage;
            const allNamespaceMessages = await runForNamespacePath(namespace, namespacePaths);
            const messagesCount = allNamespaceMessages.size;
            parent.title = `[${iter + 1}/${
              namespacesDetails.length
            }] Successfully verified Namespace "${namespace}" with ${messagesCount} defined i18n messages.`;
            iter++;
            totalMessagesCount += messagesCount;
            context.messages.set(namespace, Object.values(allNamespaceMessages));
          }

          parent.title = `[${iter}/${namespacesDetails.length}] Successfully verified all namespaces with ${totalMessagesCount} total defined i18n messages.`;
        },
      },
    ],
    { exitOnError: true, rendererOptions: { timer: PRESET_TIMER }, collectErrors: 'full' }
  );
};
