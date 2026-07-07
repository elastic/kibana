/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TranslationInput } from '@kbn/i18n';
import { ErrorReporter } from '../../utils/error_reporter';
import { validateTranslationFileLocale } from './validate_translation_file_locale';

describe('validateTranslationFileLocale', () => {
  const filePath = '/tmp/fr-FR.json';
  let errorReporter: ErrorReporter;

  beforeEach(() => {
    errorReporter = new ErrorReporter({ name: 'Validate Translation Files' });
  });

  test('reports when locale field is missing', () => {
    validateTranslationFileLocale({
      filePath,
      // Cast to simulate a malformed file that lacks the locale field at runtime —
      // TranslationInput types locale as required but JSON.parse has no runtime guard.
      translationInput: { messages: {} } as unknown as TranslationInput,
      errorReporter,
    });

    expect(errorReporter.hasErrors()).toBe(true);
    expect(errorReporter.errors[0]).toContain('missing a top-level "locale" field');
    expect(errorReporter.errors[0]).toContain('"fr-FR"');
  });

  test('reports when locale field does not match the filename', () => {
    validateTranslationFileLocale({
      filePath,
      translationInput: { locale: 'de-DE', formats: {}, messages: {} },
      errorReporter,
    });

    expect(errorReporter.hasErrors()).toBe(true);
    expect(errorReporter.errors[0]).toContain('filename implies "fr-FR"');
  });

  test('passes when locale matches the filename', () => {
    validateTranslationFileLocale({
      filePath,
      translationInput: { locale: 'fr-FR', formats: {}, messages: {} },
      errorReporter,
    });

    expect(errorReporter.hasErrors()).toBe(false);
  });
});
