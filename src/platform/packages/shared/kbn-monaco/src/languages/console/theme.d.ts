/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type UseEuiTheme } from '@elastic/eui';
export declare const buildConsoleTheme: ({ colorMode, euiTheme, ...rest }: UseEuiTheme) => {
  base: import('monaco-types').editor.BuiltinTheme;
  inherit: boolean;
  encodedTokensColors?: string[];
  rules: (
    | import('monaco-types').editor.ITokenThemeRule
    | {
        token: string;
        foreground: string;
        fontStyle: string;
      }
  )[];
  colors: {
    'editorLineNumber.foreground': string;
  };
};
