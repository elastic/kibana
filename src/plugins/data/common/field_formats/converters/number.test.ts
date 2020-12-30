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

import { NumberFormat } from './number';
import { UI_SETTINGS } from '../../constants';

describe('NumberFormat', () => {
  const config: Record<string, any> = {};

  config[UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN] = '0,0.[000]';

  const getConfig = (key: string) => config[key];

  test('default pattern', () => {
    const formatter = new NumberFormat({}, getConfig);

    expect(formatter.convert(12.345678)).toBe('12.346');
  });

  test('custom pattern', () => {
    const formatter = new NumberFormat({ pattern: '0,0' }, getConfig);

    expect(formatter.convert('12.345678')).toBe('12');
  });
});
