/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PRESET_TIMER } from 'listr2';

import { parseTranslationFile } from './parse_translation_file';
import { groupMessagesByNamespace } from './group_messages_by_namespace';
import { removeUnusedTranslations } from './remove_unused_translations';
import { removeOutdatedTranslations } from './remove_outdated_translations';
import { updateTranslationFile } from './update_translation_file';

import { TaskSignature } from '../../types';

export interface TaskOptions {
  translationFiles: Record<string, string>;
  fix?: boolean;
}
export const validateTranslationFiles: TaskSignature<TaskOptions> = (context, task, options) => {
  const { config, errorReporter } = context;
  const { translationFiles, fix = false } = options;
  const taskErrorReporter = errorReporter.withContext({ name: 'Validate Translations' });

  if (!config || !Object.keys(config.paths).length) {
    throw taskErrorReporter.reportFailure(
      'None of input paths is covered by the mappings in .i18nrc.json'
    );
  }
  const namespaces = Object.keys(config.paths);

  /**
   * 1. group messages by namespace so we can filter the verification per namespace
   * 2. remove messages defined in the translation file but not in the extracted messages
   * 3. parse each message in the file and compare it to the one extracted:
   *    a. if the message fails to parse remove it from the file
   *    b. if variables do not match exactly remove it from the file.
   * 4. if --fix flag: update file, otherwise just stdout the errors.
   */

  return task.newListr(
    (parent) => [
      {
        title: `Checking outdated messages inside translation files`,
        task: async () => {
          for (const [locale, filePath] of Object.entries(translationFiles)) {
            const translationInput = await parseTranslationFile(filePath);
            const namespacedTranslatedMessages = groupMessagesByNamespace(
              translationInput,
              namespaces
            );
            const withoutUnusedTranslation = removeUnusedTranslations({
              namespacedTranslatedMessages,
              context,
            });
            const withoutOutdatedTranslations = removeOutdatedTranslations({
              namespacedTranslatedMessages: withoutUnusedTranslation,
              context,
            });
            if (fix) {
              await updateTranslationFile({
                formats: translationInput.formats,
                namespacedTranslatedMessages: withoutOutdatedTranslations,
                targetFilePath: filePath,
              });
            }
          }
        },
      },
    ],
    { exitOnError: true, rendererOptions: { timer: PRESET_TIMER }, collectErrors: 'full' }
  );
};
