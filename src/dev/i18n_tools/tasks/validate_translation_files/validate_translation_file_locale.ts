/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TranslationInput } from '@kbn/i18n';

import type { ErrorReporter } from '../../utils/error_reporter';
import { getLocaleFromFile } from './get_locale_from_file';

export const validateTranslationFileLocale = ({
  filePath,
  translationInput,
  errorReporter,
}: {
  filePath: string;
  translationInput: TranslationInput;
  errorReporter: ErrorReporter;
}) => {
  const expectedLocale = getLocaleFromFile(filePath);

  if (!translationInput.locale) {
    errorReporter.report(
      `Translation file "${filePath}" is missing a top-level "locale" field. Expected "locale": "${expectedLocale}". Run "node scripts/i18n_check --fix" to add it.`
    );
    return;
  }

  if (translationInput.locale !== expectedLocale) {
    errorReporter.report(
      `Translation file "${filePath}" has locale "${translationInput.locale}" but the filename implies "${expectedLocale}". Run "node scripts/i18n_check --fix" to correct it.`
    );
  }
};
