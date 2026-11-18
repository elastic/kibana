/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ensureJsonLiquidLanguage } from './json_liquid_language';
import { monacoLanguageFor } from './monaco_language';

jest.mock('@kbn/monaco', () => ({ XJSON_LANG_ID: 'xjson', ESQL_LANG_ID: 'esql' }));
jest.mock('./json_liquid_language', () => ({
  JSON_LIQUID_LANG_ID: 'workflows-json-liquid',
  ensureJsonLiquidLanguage: jest.fn(),
}));

describe('monacoLanguageFor', () => {
  beforeEach(() => jest.mocked(ensureJsonLiquidLanguage).mockClear());

  it.each([
    ['json', 'xjson'],
    ['esql', 'esql'],
  ] as const)('maps %s to its Monaco language', (language, expected) => {
    expect(monacoLanguageFor(language)).toBe(expected);
    expect(ensureJsonLiquidLanguage).not.toHaveBeenCalled();
  });

  it('registers the JSON + Liquid language before naming it', () => {
    expect(monacoLanguageFor('json-liquid')).toBe('workflows-json-liquid');
    expect(ensureJsonLiquidLanguage).toHaveBeenCalledTimes(1);
  });

  it.each([['kuery'], ['plaintext'], [undefined]] as const)(
    'has no Monaco mode for %s, which is plain text (there is no KQL mode)',
    (language) => {
      expect(monacoLanguageFor(language)).toBe('plaintext');
      expect(ensureJsonLiquidLanguage).not.toHaveBeenCalled();
    }
  );
});
