/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LanguageDefinition, LanguageDefinitionSnippetArguments } from './types';
import { consoleDefinition } from './languages/console';

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

export const getConsoleRequest = (
  code: keyof LanguageDefinition,
  args?: LanguageDefinitionSnippetArguments
): string | undefined => {
  if (code in consoleDefinition) {
    const codeType = consoleDefinition[code];

    switch (typeof codeType) {
      case 'string':
        return codeType as string;
      case 'function':
        if (args) {
          return codeType(args) as string;
        }
        return undefined;
      default:
        return undefined;
    }
  }
};
