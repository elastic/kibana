/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Monaco basic language modules don't ship with type declarations.
 * These modules export language configuration and tokenization rules.
 */

declare module 'monaco-editor/esm/vs/basic-languages/css/css' {
  // eslint-disable-next-line @kbn/eslint/module_migration
  import type { languages } from 'monaco-editor/esm/vs/editor/editor.api';
  export const conf: languages.LanguageConfiguration;
  export const language: languages.IMonarchLanguage;
}

declare module 'monaco-editor/esm/vs/basic-languages/markdown/markdown' {
  // eslint-disable-next-line @kbn/eslint/module_migration
  import type { languages } from 'monaco-editor/esm/vs/editor/editor.api';
  export const conf: languages.LanguageConfiguration;
  export const language: languages.IMonarchLanguage;
}

declare module 'monaco-editor/esm/vs/basic-languages/yaml/yaml' {
  // eslint-disable-next-line @kbn/eslint/module_migration
  import type { languages } from 'monaco-editor/esm/vs/editor/editor.api';
  export const conf: languages.LanguageConfiguration;
  export const language: languages.IMonarchLanguage;
}
