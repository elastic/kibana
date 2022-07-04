/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getTextBasedLanguageMode } from './get_text_based_language_mode';

describe('getTextBasedLanguageMode', () => {
  it('returns empty string for Query type query', () => {
    const mode = getTextBasedLanguageMode({ query: '', language: 'lucene' });
    expect(mode).toEqual('');
  });

  it('returns sql for Query type query', () => {
    const mode = getTextBasedLanguageMode({ sql: 'SELECT * from foo' });

    expect(mode).toEqual('sql');
  });
});
