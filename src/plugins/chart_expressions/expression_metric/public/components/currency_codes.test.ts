/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getCurrencyCode } from './currency_codes';
// @ts-ignore
import numeralLanguages from '@elastic/numeral/languages';

describe('getCurrencyCode', () => {
  const allLanguages = [
    ['en', '$'],
    ...numeralLanguages.map((language: { id: string; lang: { currency: { symbol: string } } }) => {
      const {
        id,
        lang: {
          currency: { symbol },
        },
      } = language;
      return [id, symbol];
    }),
  ];

  it.each(allLanguages)(
    'should have currency code for locale "%s" and currency "%s"',
    (locale, symbol) => {
      expect(getCurrencyCode(locale, symbol)).toBeDefined();
    }
  );
});
