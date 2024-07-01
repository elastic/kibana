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
import { ErrorReporter } from '../../utils/error_reporter';
import { getLocalesFromFiles } from './get_locale_from_file';

import { TaskSignature } from '../../types';
import { makeAbsolutePath } from '../../utils';

export interface TaskOptions {
  fix?: boolean;
  filterNamespaces?: string[];
  filterTranslationFiles?: string[];
}
export const validateTranslationFiles: TaskSignature<TaskOptions> = (context, task, options) => {
  const { config } = context;
  const { filterNamespaces, filterTranslationFiles, fix = false } = options;
  const errorReporter = new ErrorReporter({ name: 'Validate Translation Files' });

  if (!config || !Object.keys(config.paths).length) {
    throw errorReporter.reportFailure(
      'None of input paths is covered by the mappings in .i18nrc.json'
    );
  }

  const namespaces = Object.keys(config.paths);
  return task.newListr(
    (parent) => [
      {
        title: `Verifying messages inside translation files`,
        task: async () => {
          const translationFiles = getLocalesFromFiles(config.translations);
          for (const filePath of translationFiles.values()) {
            const translationInput = await parseTranslationFile(filePath);
            if (filterTranslationFiles && filterTranslationFiles.length) {
              const matchingFilteredFile = filterTranslationFiles.find((filterTranslationFile) => {
                return makeAbsolutePath(filterTranslationFile) === makeAbsolutePath(filePath);
              });
              if (!matchingFilteredFile) {
                continue;
              }
            }

            parent.title = `Verifying transltion file ${filePath}`;
            task.output = `Grouping by namespace`;
            const namespacedTranslatedMessages = groupMessagesByNamespace(
              translationInput,
              namespaces
            );

            parent.title = `Removing unused translations`;
            const withoutUnusedTranslation = removeUnusedTranslations({
              namespacedTranslatedMessages,
              filterNamespaces,
              context,
            });

            parent.title = `Removing outdated translations`;
            const withoutOutdatedTranslations = removeOutdatedTranslations({
              namespacedTranslatedMessages: withoutUnusedTranslation,
              filterNamespaces,
              context,
            });

            parent.title = fix
              ? `Updating translation file`
              : `Dry-run detected. No fixes will be commited to file.`;
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
