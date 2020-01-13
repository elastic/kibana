/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Top 35 most traded currencies per https://en.wikipedia.org/wiki/Template:Most_traded_currencies
// This list is not a full list of currencies, but the ISO standard full list of currencies
// does not provide some of the amenities of this Wiki list- a mashup of sources would be required
// to provide country name, currency name, and currency symbol.
// The full ISO reference: https://www.currency-iso.org/en/home/tables/table-a1.html
export const topCurrencies = [
  {
    code: 'USD',
    symbol: 'US$',
  },
  {
    code: 'EUR',
    symbol: '€',
  },
  {
    code: 'JPY',
    symbol: '¥',
  },
  {
    code: 'GBP',
    symbol: '£',
  },
  {
    code: 'AUD',
    symbol: 'A$',
  },
  {
    code: 'CAD',
    symbol: 'C$',
  },
  {
    code: 'CHF',
    symbol: 'CHF',
  },
  {
    code: 'CNY',
    symbol: '元',
  },
  {
    code: 'HKD',
    symbol: 'HK$',
  },
  {
    code: 'NZD',
    symbol: 'NZ$',
  },
  {
    code: 'SEK',
    symbol: 'kr',
  },
  {
    code: 'KRW',
    symbol: '₩',
  },
  {
    code: 'SGD',
    symbol: 'S$',
  },
  {
    code: 'NOK',
    symbol: 'kr',
  },
  {
    code: 'MXN',
    symbol: '$',
  },
  {
    code: 'INR',
    symbol: '₹',
  },
  {
    code: 'RUB',
    symbol: '₽',
  },
  {
    code: 'ZAR',
    symbol: 'R',
  },
  {
    code: 'TRY',
    symbol: '₺',
  },
  {
    code: 'BRL',
    symbol: 'R$',
  },
  {
    code: 'TWD',
    symbol: 'NT$',
  },
  {
    code: 'DKK',
    symbol: 'kr',
  },
  {
    code: 'PLN',
    symbol: 'zł',
  },
  {
    code: 'THB',
    symbol: '฿',
  },
  {
    code: 'IDR',
    symbol: 'Rp',
  },
  {
    code: 'HUF',
    symbol: 'Ft',
  },
  {
    code: 'CZK',
    symbol: 'Kč',
  },
  {
    code: 'ILS',
    symbol: '₪',
  },
  {
    code: 'CLP',
    symbol: 'CLP$',
  },
  {
    code: 'PHP',
    symbol: '₱',
  },
  {
    code: 'AED',
    symbol: 'د.إ',
  },
  {
    code: 'COP',
    symbol: 'COL$',
  },
  {
    code: 'SAR',
    symbol: '﷼',
  },
  {
    code: 'MYR',
    symbol: 'RM',
  },
  {
    code: 'RON',
    symbol: 'L',
  },
];
