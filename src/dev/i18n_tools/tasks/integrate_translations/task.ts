/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PRESET_TIMER } from 'listr2';
import { readFile as readFileAsync } from 'fs/promises';
import { TaskSignature } from '../../types';
import { ErrorReporter } from '../../utils/error_reporter';
import { makeAbsolutePath } from '../../utils';
import { updateTranslationFile } from '../validate_translation_files';
import { groupMessagesByNamespace } from '../validate_translation_files/group_messages_by_namespace';

export interface TaskOptions {
  source: string;
  target: string;
}

export const integrateTranslations: TaskSignature<TaskOptions> = (
  context,
  task,
  { source, target }
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
        title: `Integrating ${source}`,
        task: async () => {
          const namespaces = Object.keys(config.paths);

          const sourceFilePath = makeAbsolutePath(source);
          const localizedMessages = JSON.parse((await readFileAsync(sourceFilePath)).toString());
          const namespacedTranslatedMessages = groupMessagesByNamespace(
            localizedMessages,
            namespaces
          );
          await updateTranslationFile({
            namespacedTranslatedMessages,
            targetFilePath: target,
            formats: localizedMessages.formats,
          });
        },
      },
    ],
    { exitOnError: true, rendererOptions: { timer: PRESET_TIMER }, collectErrors: 'minimal' }
  );
};
