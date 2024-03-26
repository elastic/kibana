/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DevToolsVariable } from '../../components';

const whitespacesRegex = /\s/;
export const removeTrailingWhitespaces = (url: string): string => {
  /*
   * This helper removes any trailing inline comments, for example
   * "_search // comment" -> "_search"
   * Ideally the parser removes those comments initially
   */
  return url.trim().split(whitespacesRegex)[0];
};

const variableRegex = /\${(\w+)}/g;
export const replaceVariables = (text: string, variables: DevToolsVariable[]): string => {
  if (variableRegex.test(text)) {
    text = text.replaceAll(variableRegex, (match, key) => {
      const variable = variables.find(({ name }) => name === key);

      return variable?.value ?? match;
    });
  }
  return text;
};
