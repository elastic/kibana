/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorConfigProperties } from './connectors';
import { NATIVE_CONNECTOR_DEFINITIONS } from './native_connectors';

function isFieldActive(
  field: ConnectorConfigProperties,
  values: Record<string, string | boolean>
): boolean {
  if (!field.depends_on?.length) {
    return true;
  }
  return field.depends_on.every((dependency) => values[dependency.field] === dependency.value);
}

describe('Exchange Server and Outlook auth_method configuration', () => {
  const exchangeConfig = NATIVE_CONNECTOR_DEFINITIONS.exchange_server!.configuration;
  const outlookConfig = NATIVE_CONNECTOR_DEFINITIONS.outlook!.configuration;

  it('defaults Exchange Server auth_method to ntlm', () => {
    expect(exchangeConfig.auth_method.value).toBe('ntlm');
  });

  it('shows Exchange Server credentials only for ntlm', () => {
    expect(isFieldActive(exchangeConfig.username, { auth_method: 'ntlm' })).toBe(true);
    expect(isFieldActive(exchangeConfig.password, { auth_method: 'ntlm' })).toBe(true);
    expect(isFieldActive(exchangeConfig.username, { auth_method: 'kerberos' })).toBe(false);
    expect(isFieldActive(exchangeConfig.password, { auth_method: 'kerberos' })).toBe(false);
  });

  it('defaults Outlook outlook_server auth_method to ntlm', () => {
    expect(outlookConfig.auth_method.value).toBe('ntlm');
    expect(outlookConfig.auth_method.depends_on).toEqual([
      { field: 'data_source', value: 'outlook_server' },
    ]);
  });

  it('shows Outlook server credentials only for outlook_server + ntlm', () => {
    const ntlmServer = { data_source: 'outlook_server', auth_method: 'ntlm' };
    const kerberosServer = { data_source: 'outlook_server', auth_method: 'kerberos' };
    const cloud = { data_source: 'outlook_cloud', auth_method: 'ntlm' };

    expect(isFieldActive(outlookConfig.username, ntlmServer)).toBe(true);
    expect(isFieldActive(outlookConfig.password, ntlmServer)).toBe(true);
    expect(isFieldActive(outlookConfig.username, kerberosServer)).toBe(false);
    expect(isFieldActive(outlookConfig.password, kerberosServer)).toBe(false);
    expect(isFieldActive(outlookConfig.username, cloud)).toBe(false);
  });
});
