/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LanguageDefinition, LanguageDefinitionSnippetArguments } from './types';

export const getLanguageDefinitionCodeSnippet = (
  language: Partial<LanguageDefinition>,
  key: keyof LanguageDefinition,
  args: LanguageDefinitionSnippetArguments
): string => {
  const snippetVal = language[key];
  if (snippetVal === undefined) return '';
  switch (typeof snippetVal) {
    case 'string':
      return snippetVal;
    case 'function':
      return snippetVal(args);
    default:
      return '';
  }
};
