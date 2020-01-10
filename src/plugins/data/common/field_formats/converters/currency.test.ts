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

import 'intl';
import { CurrencyFormat } from './currency';

describe('CurrencyFormat', () => {
  let config: Record<string, any> = {};

  const getConfig = (key: string) => config[key];

  beforeEach(() => {
    config = {};
  });

  test('default currency', () => {
    // This locale is not supported in node
    config['format:defaultLocale'] = 'pt-PT';
    config['format:currency:defaultCurrency'] = 'EUR';

    const formatter = new CurrencyFormat({}, getConfig);

    expect(formatter.convert(5150000)).toBe('€5,150,000');
  });

  test('decimals', () => {
    config['format:currency:defaultCurrency'] = 'USD';

    const formatter = new CurrencyFormat({}, getConfig);

    expect(formatter.convert(1234.56789)).toBe('$1,234.57');
  });

  test('2 decimal places', () => {
    config['format:currency:defaultCurrency'] = 'USD';

    const formatter = new CurrencyFormat({ minDecimals: 2 }, getConfig);

    expect(formatter.convert(1234)).toBe('$1,234.00');
  });
});
