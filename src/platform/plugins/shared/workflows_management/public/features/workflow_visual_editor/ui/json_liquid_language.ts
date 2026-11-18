/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/code-editor';

/**
 * JSON text that may hold Liquid (`{{ }}` / `{% %}`), also inside strings. It is only valid JSON
 * once the engine has rendered it, so there is no worker and no error markers: the form validates
 * it (see `validateStepField`).
 */
export const JSON_LIQUID_LANG_ID = 'workflows-json-liquid';

const LIQUID_STARTS: monaco.languages.IMonarchLanguageRule[] = [
  [/\{\{-?/, { token: 'delimiter.liquid', next: '@liquidOutput' }],
  [/\{%-?/, { token: 'delimiter.liquid', next: '@liquidTag' }],
];

const LIQUID_EXPRESSION: monaco.languages.IMonarchLanguageRule[] = [
  [/"[^"]*"|'[^']*'/, 'string.liquid'],
  [/\d+(?:\.\d+)?/, 'number.liquid'],
  [
    /\b(?:if|elsif|else|endif|unless|endunless|case|when|endcase|for|endfor|in|break|continue|assign|capture|endcapture|and|or|contains|true|false|nil|empty)\b/,
    'keyword.liquid',
  ],
  [/[A-Za-z_][\w-]*/, 'variable.liquid'],
  [/[|:,.[\]()=<>!]+/, 'operator.liquid'],
  [/\s+/, 'white'],
];

const tokenizer: monaco.languages.IMonarchLanguage['tokenizer'] = {
  root: [
    ...LIQUID_STARTS,
    [/"/, { token: 'string.quote', next: '@string' }],
    [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number'],
    [/\b(?:true|false|null)\b/, 'keyword'],
    [/[{}[\]]/, '@brackets'],
    [/[,:]/, 'delimiter'],
    [/\s+/, 'white'],
  ],
  string: [
    ...LIQUID_STARTS,
    [/[^\\"{]+/, 'string'],
    [/\\./, 'string.escape'],
    [/\{/, 'string'],
    [/"/, { token: 'string.quote', next: '@pop' }],
  ],
  liquidOutput: [[/-?\}\}/, { token: 'delimiter.liquid', next: '@pop' }], ...LIQUID_EXPRESSION],
  liquidTag: [[/-?%\}/, { token: 'delimiter.liquid', next: '@pop' }], ...LIQUID_EXPRESSION],
};

const languageConfiguration: monaco.languages.LanguageConfiguration = {
  brackets: [
    ['{', '}'],
    ['[', ']'],
  ],
};

/** Registers the language once; safe to call on every render. */
export const ensureJsonLiquidLanguage = (): void => {
  if (monaco.languages.getLanguages().some(({ id }) => id === JSON_LIQUID_LANG_ID)) return;
  monaco.languages.register({ id: JSON_LIQUID_LANG_ID });
  monaco.languages.setMonarchTokensProvider(JSON_LIQUID_LANG_ID, { tokenizer });
  monaco.languages.setLanguageConfiguration(JSON_LIQUID_LANG_ID, languageConfiguration);
};
