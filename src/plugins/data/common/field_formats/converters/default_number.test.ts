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

import { DefaultNumberFormat } from './default_number';

describe('DefaultNumberFormat', () => {
  let config: Record<string, any> = {};

  const getConfig = (key: string) => config[key];

  beforeEach(() => {
    config = {};
  });

  test('default number', () => {
    // Node only contains locale data for `en`, so this is ignored. The fallback is tested here
    config['format:defaultLocale'] = 'ch-DE';

    const formatter = new DefaultNumberFormat({}, getConfig);

    expect(formatter.convert(5150000)).toBe(`5,150,000`);
  });

  test('number of decimals', () => {
    // Node only contains locale data for `en`, so this is ignored. The fallback is tested here
    config['format:defaultLocale'] = 'ch-DE';

    const formatter = new DefaultNumberFormat({ minDecimals: 2 }, getConfig);

    expect(formatter.convert(5150000)).toBe(`5,150,000.00`);
  });
});
