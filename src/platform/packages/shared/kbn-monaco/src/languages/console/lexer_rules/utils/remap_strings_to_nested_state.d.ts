/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../../../monaco_imports';
/**
 * Rewrites string-entry rules so that `next: '@string'` points to a nested
 * state instead, avoiding conflicts with the Console JSON `@string` state.
 *
 * The function narrows `IMonarchLanguageAction` through runtime checks so that
 * the returned rules are fully typed without assertions or wide types.
 */
export declare const remapStringsToNestedState: (
  rules: monaco.languages.IMonarchLanguageRule[] | undefined,
  nestedState: string
) => monaco.languages.IMonarchLanguageRule[];
