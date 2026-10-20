/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorConfigProperties, ConnectorConfiguration } from './connectors';
import { NATIVE_CONNECTOR_DEFINITIONS } from './native_connectors';

const getField = (
  configuration: ConnectorConfiguration,
  name: string
): ConnectorConfigProperties => {
  const field = configuration[name];
  if (!field) {
    throw new Error(`Missing configuration field: ${name}`);
  }
  return field as ConnectorConfigProperties;
};

const isFieldActive = (
  field: ConnectorConfigProperties,
  values: Record<string, string | boolean>
): boolean =>
  field.depends_on.every((dependency) => values[dependency.field] === dependency.value);

describe('Exchange Server and Outlook auth_method configuration', () => {
  const exchangeConfig = NATIVE_CONNECTOR_DEFINITIONS.exchange_server!.configuration;
  const outlookConfig = NATIVE_CONNECTOR_DEFINITIONS.outlook!.configuration;

  it('defaults Exchange Server auth_method to ntlm', () => {
    expect(getField(exchangeConfig, 'auth_method').value).toBe('ntlm');
  });

  it('shows Exchange Server credentials only for ntlm', () => {
    const username = getField(exchangeConfig, 'username');
    const password = getField(exchangeConfig, 'password');

    expect(isFieldActive(username, { auth_method: 'ntlm' })).toBe(true);
    expect(isFieldActive(password, { auth_method: 'ntlm' })).toBe(true);
    expect(isFieldActive(username, { auth_method: 'kerberos' })).toBe(false);
    expect(isFieldActive(password, { auth_method: 'kerberos' })).toBe(false);
  });

  it('defaults Outlook auth_method to ntlm and scopes it to outlook_server', () => {
    const authMethod = getField(outlookConfig, 'auth_method');

    expect(authMethod.value).toBe('ntlm');
    expect(authMethod.depends_on).toEqual([{ field: 'data_source', value: 'outlook_server' }]);
  });

  it('shows Outlook credentials only for outlook_server with ntlm', () => {
    const username = getField(outlookConfig, 'username');
    const password = getField(outlookConfig, 'password');
    const ntlmServer = { data_source: 'outlook_server', auth_method: 'ntlm' };
    const kerberosServer = { data_source: 'outlook_server', auth_method: 'kerberos' };
    const cloud = { data_source: 'outlook_cloud', auth_method: 'ntlm' };

    expect(isFieldActive(username, ntlmServer)).toBe(true);
    expect(isFieldActive(password, ntlmServer)).toBe(true);
    expect(isFieldActive(username, kerberosServer)).toBe(false);
    expect(isFieldActive(password, kerberosServer)).toBe(false);
    expect(isFieldActive(username, cloud)).toBe(false);
  });
});
