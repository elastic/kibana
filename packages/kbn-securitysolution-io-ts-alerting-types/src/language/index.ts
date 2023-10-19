/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export const language = t.keyof({ eql: null, kuery: null, lucene: null, esql: null });
export type Language = t.TypeOf<typeof language>;

export const languageOrUndefined = t.union([language, t.undefined]);
export type LanguageOrUndefined = t.TypeOf<typeof languageOrUndefined>;
