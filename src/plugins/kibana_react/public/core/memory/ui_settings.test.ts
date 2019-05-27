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

import { createInMemoryUiSettingsService } from './ui_settings';

test('can set a value', () => {
  const uiSettings = createInMemoryUiSettingsService();
  uiSettings.set('foo', 'bar');
});

test('can read value', () => {
  const uiSettings = createInMemoryUiSettingsService();
  uiSettings.set('foo', 'bar');

  const result = uiSettings.get('foo');

  expect(result).toBe('bar');
});

test('can overwrite value', () => {
  const uiSettings = createInMemoryUiSettingsService();
  uiSettings.set('foo', '1');
  uiSettings.set('foo', '2');

  const result = uiSettings.get('foo');

  expect(result).toBe('2');
});

test('can subscribe to an existing value', () => {
  const uiSettings = createInMemoryUiSettingsService();
  const spy = jest.fn();

  uiSettings.set('a', '0');
  uiSettings.get$('a').subscribe(spy);
  uiSettings.set('a', '1');
  uiSettings.set('a', '2');
  uiSettings.set('a', '3');

  expect(spy).toHaveBeenCalledTimes(4);
  expect(spy.mock.calls[0][0]).toBe('0');
  expect(spy.mock.calls[1][0]).toBe('1');
  expect(spy.mock.calls[2][0]).toBe('2');
  expect(spy.mock.calls[3][0]).toBe('3');
});

test('can subscribe to a non-existing value when using defaultOverride', () => {
  const uiSettings = createInMemoryUiSettingsService();
  const spy = jest.fn();

  uiSettings.get$('a', '-1').subscribe(spy);
  uiSettings.set('a', '0');
  uiSettings.set('a', '1');
  uiSettings.set('a', '2');
  uiSettings.set('a', '3');

  expect(spy).toHaveBeenCalledTimes(5);
  expect(spy.mock.calls[0][0]).toBe('-1');
  expect(spy.mock.calls[1][0]).toBe('0');
  expect(spy.mock.calls[2][0]).toBe('1');
  expect(spy.mock.calls[3][0]).toBe('2');
  expect(spy.mock.calls[4][0]).toBe('3');
});
