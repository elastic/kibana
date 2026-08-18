/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultToSingleNodeDiscovery, parseSettings, SettingsFilter } from './settings';

const mockSettings = [
  'abc.def=1',
  'xpack.security.authc.realms.oidc.oidc1.rp.client_secret=secret',
  'xpack.security.authc.realms.oidc.oidc1.rp.client_id=client id',
  'xpack.security.authc.realms.jwt.jwt1.client_authentication.shared_secret=jwt_secret',
  'xpack.security.http.ssl.keystore.secure_password=some_password',
  'discovery.type=single-node',
  'telemetry.secret_token=token',
  'telemetry.api_key=key',
];

test('`parseSettings` parses and returns all settings by default', () => {
  expect(parseSettings(mockSettings)).toEqual([
    ['abc.def', '1'],
    ['xpack.security.authc.realms.oidc.oidc1.rp.client_secret', 'secret'],
    ['xpack.security.authc.realms.oidc.oidc1.rp.client_id', 'client id'],
    ['xpack.security.authc.realms.jwt.jwt1.client_authentication.shared_secret', 'jwt_secret'],
    ['xpack.security.http.ssl.keystore.secure_password', 'some_password'],
    ['discovery.type', 'single-node'],
    ['telemetry.secret_token', 'token'],
    ['telemetry.api_key', 'key'],
  ]);
});

test('`parseSettings` parses and returns all settings with `SettingsFilter.All` filter', () => {
  expect(parseSettings(mockSettings, { filter: SettingsFilter.All })).toEqual([
    ['abc.def', '1'],
    ['xpack.security.authc.realms.oidc.oidc1.rp.client_secret', 'secret'],
    ['xpack.security.authc.realms.oidc.oidc1.rp.client_id', 'client id'],
    ['xpack.security.authc.realms.jwt.jwt1.client_authentication.shared_secret', 'jwt_secret'],
    ['xpack.security.http.ssl.keystore.secure_password', 'some_password'],
    ['discovery.type', 'single-node'],
    ['telemetry.secret_token', 'token'],
    ['telemetry.api_key', 'key'],
  ]);
});

test('`parseSettings` parses and returns only secure settings with `SettingsFilter.SecureOnly` filter', () => {
  expect(parseSettings(mockSettings, { filter: SettingsFilter.SecureOnly })).toEqual([
    ['xpack.security.authc.realms.oidc.oidc1.rp.client_secret', 'secret'],
    ['xpack.security.authc.realms.jwt.jwt1.client_authentication.shared_secret', 'jwt_secret'],
    ['xpack.security.http.ssl.keystore.secure_password', 'some_password'],
    ['telemetry.secret_token', 'token'],
    ['telemetry.api_key', 'key'],
  ]);
});

test('`parseSettings` parses and returns only non-secure settings with `SettingsFilter.NonSecureOnly` filter', () => {
  expect(parseSettings(mockSettings, { filter: SettingsFilter.NonSecureOnly })).toEqual([
    ['abc.def', '1'],
    ['xpack.security.authc.realms.oidc.oidc1.rp.client_id', 'client id'],
    ['discovery.type', 'single-node'],
  ]);
});

describe('defaultToSingleNodeDiscovery', () => {
  test('prepends single-node discovery when no discovery settings are given', () => {
    expect(defaultToSingleNodeDiscovery(['abc.def=1'])).toEqual([
      'discovery.type=single-node',
      'abc.def=1',
    ]);
    expect(defaultToSingleNodeDiscovery()).toEqual(['discovery.type=single-node']);
    expect(defaultToSingleNodeDiscovery('abc.def=1')).toEqual([
      'discovery.type=single-node',
      'abc.def=1',
    ]);
  });

  test('leaves esArgs unchanged when discovery is already configured', () => {
    expect(defaultToSingleNodeDiscovery(['discovery.type=multi-node'])).toEqual([
      'discovery.type=multi-node',
    ]);
    expect(defaultToSingleNodeDiscovery(['discovery.seed_hosts=127.0.0.1:9301'])).toEqual([
      'discovery.seed_hosts=127.0.0.1:9301',
    ]);
    expect(defaultToSingleNodeDiscovery(['cluster.initial_master_nodes=node-01'])).toEqual([
      'cluster.initial_master_nodes=node-01',
    ]);
  });
});
