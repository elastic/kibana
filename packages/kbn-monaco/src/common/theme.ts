/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const themeRuleGroupBuilderFactory =
  (postfix: string = '') =>
  (tokens: string[], color: string, isBold: boolean = false) =>
    tokens.map((i) => ({
      token: i + postfix,
      foreground: color,
      fontStyle: isBold ? 'bold' : '',
    }));
