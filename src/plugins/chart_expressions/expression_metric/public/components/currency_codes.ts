/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// NOTE: needs to be kept in line with https://github.com/elastic/numeral-js/blob/kibana-fork/languages.js + USD
const currencyCodeMap: Record<string, string> = {
  'en-$': 'USD',
  'be-nl-€': 'EUR',
  'chs-¥': 'CNY',
  'cs-kč': 'CZK',
  'da-dk-dkk': 'DKK',
  'de-ch-chf': 'CHF',
  'de-€': 'EUR',
  'en-gb-£': 'GBP',
  'es-es-€': 'EUR',
  'es-$': '',
  'et-€': 'EUR',
  'fi-€': 'EUR',
  'fr-ca-$': 'CAD',
  'fr-ch-chf': 'CHF',
  'fr-€': 'EUR',
  'hu-ft': 'HUF',
  'it-€': 'EUR',
  'ja-¥': 'JPY',
  'nl-nl-€': 'EUR',
  'pl-pln': 'PLN',
  'pt-br-r$': 'BRL',
  'pt-pt-€': 'EUR',
  'ru-ua-₴': 'UAH',
  'ru-руб.': 'RUB',
  'sk-€': 'EUR',
  'th-฿': 'THB',
  'tr-₺': 'TRY',
  'uk-ua-₴': 'UAH',
};

/**
 * Returns currency code for use with the Intl API.
 */
export const getCurrencyCode = (localeId: string, currencySymbol: string) => {
  return currencyCodeMap[`${localeId.trim()}-${currencySymbol.trim()}`.toLowerCase()];
};
