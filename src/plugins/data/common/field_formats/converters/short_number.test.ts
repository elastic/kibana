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

import { ShortNumberFormat } from './short_number';

describe('ShortNumberFormat', () => {
  const config: Record<string, any> = {};

  const getConfig = (key: string) => config[key];

  test('default', () => {
    const formatter = new ShortNumberFormat({}, getConfig);

    // This expectation is only for node, in the browser the same number is formatted as '1.234M'
    // This is because of limited ICU support in node
    expect(formatter.convert(1234567)).toBe('1,234,567');
  });
});
