/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
