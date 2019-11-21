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

import { parseSettings, SettingsFilter } from './settings';

const mockSettings = [
  'abc.def=1',
  'xpack.security.authc.realms.oidc.oidc1.rp.client_secret=secret',
  'xpack.security.authc.realms.oidc.oidc1.rp.client_id=client id',
  'discovery.type=single-node',
];

test('`parseSettings` parses and returns all settings by default', () => {
  expect(parseSettings(mockSettings)).toEqual([
    ['abc.def', '1'],
    ['xpack.security.authc.realms.oidc.oidc1.rp.client_secret', 'secret'],
    ['xpack.security.authc.realms.oidc.oidc1.rp.client_id', 'client id'],
    ['discovery.type', 'single-node'],
  ]);
});

test('`parseSettings` parses and returns all settings with `SettingsFilter.All` filter', () => {
  expect(parseSettings(mockSettings, { filter: SettingsFilter.All })).toEqual([
    ['abc.def', '1'],
    ['xpack.security.authc.realms.oidc.oidc1.rp.client_secret', 'secret'],
    ['xpack.security.authc.realms.oidc.oidc1.rp.client_id', 'client id'],
    ['discovery.type', 'single-node'],
  ]);
});

test('`parseSettings` parses and returns only secure settings with `SettingsFilter.SecureOnly` filter', () => {
  expect(parseSettings(mockSettings, { filter: SettingsFilter.SecureOnly })).toEqual([
    ['xpack.security.authc.realms.oidc.oidc1.rp.client_secret', 'secret'],
  ]);
});

test('`parseSettings` parses and returns only non-secure settings with `SettingsFilter.NonSecureOnly` filter', () => {
  expect(parseSettings(mockSettings, { filter: SettingsFilter.NonSecureOnly })).toEqual([
    ['abc.def', '1'],
    ['xpack.security.authc.realms.oidc.oidc1.rp.client_id', 'client id'],
    ['discovery.type', 'single-node'],
  ]);
});
