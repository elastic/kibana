/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorTypeInfo } from '@kbn/workflows';

export const createMockConnectorTypeInfo = (
  overrides: Partial<ConnectorTypeInfo> & Pick<ConnectorTypeInfo, 'actionTypeId'>
): ConnectorTypeInfo => ({
  displayName: 'Test Action',
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'basic',
  instances: [],
  subActions: [],
  ...overrides,
});

export const createMockConnectorInstance = (
  overrides: Partial<{ id: string; name: string; isPreconfigured: boolean; isDeprecated: boolean }>
) => ({
  id: 'test-instance',
  name: 'Test Instance',
  isPreconfigured: false,
  isDeprecated: false,
  ...overrides,
});
