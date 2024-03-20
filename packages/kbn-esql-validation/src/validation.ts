/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  AstProviderFn,
  ESQLCallbacks,
  ESQLMessage,
  ESQLValidationErrorTypes,
} from '@kbn/esql-ast-core';
import { validateAst } from '@kbn/esql-ast-core';

export const ignoreErrorsMap: Record<keyof ESQLCallbacks, ESQLValidationErrorTypes[]> = {
  getFieldsFor: ['unknownColumn', 'wrongArgumentType', 'unsupportedFieldType'],
  getSources: ['unknownIndex'],
  getPolicies: ['unknownPolicy'],
  getMetaFields: ['unknownMetadataField'],
  getPolicyFields: [],
  getPolicyMatchingField: [],
};

/**
 * ES|QL validation public API
 * It takes a query string and returns a list of messages (errors and warnings) after validate
 * The astProvider is optional, but if not provided the default one from @kbn/esql-ast-core will be used.
 * This is useful for async loading the ES|QL parser and reduce the bundle size, or to swap grammar version.
 * As for the callbacks, while optional, the validation function will selectively ignore some errors types based on each callback missing.
 */
export async function validate(
  queryString: string,
  astProvider: AstProviderFn | undefined,
  callbacks?: ESQLCallbacks
): Promise<{ errors: ESQLMessage[]; warnings: ESQLMessage[] }> {
  let finalAstProvider = astProvider;
  if (finalAstProvider == null) {
    const { getAstAndSyntaxErrors } = await import('@kbn/esql-ast-core');
    finalAstProvider = getAstAndSyntaxErrors;
  }
  const { errors, warnings } = await validateAst(queryString, finalAstProvider, callbacks);
  const finalCallbacks = callbacks || {};
  const errorTypoesToIgnore = Object.entries(ignoreErrorsMap).reduce((acc, [key, errorCodes]) => {
    if (
      !(key in finalCallbacks) ||
      (key in finalCallbacks && finalCallbacks[key as keyof ESQLCallbacks] == null)
    ) {
      for (const e of errorCodes) {
        acc[e] = true;
      }
    }
    return acc;
  }, {} as Partial<Record<ESQLValidationErrorTypes, boolean>>);
  const filteredErrors = errors
    .filter((error) => {
      if ('severity' in error) {
        return true;
      }
      return !errorTypoesToIgnore[error.code as ESQLValidationErrorTypes];
    })
    .map((error) =>
      'severity' in error
        ? {
            text: error.message,
            code: error.code!,
            type: 'error' as const,
            location: { min: error.startColumn, max: error.endColumn },
          }
        : error
    );
  return { errors: filteredErrors, warnings };
}
