/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../monaco_imports';

export const themeRuleGroupBuilderFactory =
  (postfix: string = '') =>
  (tokens: string[], color: string, isBold: boolean = false): monaco.editor.ITokenThemeRule[] =>
    tokens.map((i) => ({
      token: i + postfix,
      foreground: color,
      fontStyle: isBold ? 'bold' : '',
    }));
