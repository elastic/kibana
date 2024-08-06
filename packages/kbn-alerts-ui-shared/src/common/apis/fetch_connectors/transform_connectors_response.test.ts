/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transformConnectorResponse } from './transform_connectors_response';

describe('transformConnectorsResponse', () => {
  test('should transform connectors response', () => {
    const result = transformConnectorResponse([
      {
        id: 'test-connector-1',
        name: 'Test-1',
        connector_type_id: 'test-1',
        is_preconfigured: false,
        is_deprecated: false,
        is_missing_secrets: false,
        is_system_action: false,
        referenced_by_count: 0,
        secrets: {},
        config: {},
      },
      {
        id: 'test-connector-2',
        name: 'Test-2',
        connector_type_id: 'test-2',
        is_preconfigured: true,
        is_deprecated: true,
        is_missing_secrets: true,
        is_system_action: true,
        referenced_by_count: 0,
        secrets: {},
        config: {},
      },
    ]);

    expect(result).toEqual([
      {
        actionTypeId: 'test-1',
        config: {},
        id: 'test-connector-1',
        isDeprecated: false,
        isMissingSecrets: false,
        isPreconfigured: false,
        isSystemAction: false,
        name: 'Test-1',
        referencedByCount: 0,
        secrets: {},
      },
      {
        actionTypeId: 'test-2',
        config: {},
        id: 'test-connector-2',
        isDeprecated: true,
        isMissingSecrets: true,
        isPreconfigured: true,
        isSystemAction: true,
        name: 'Test-2',
        referencedByCount: 0,
        secrets: {},
      },
    ]);
  });
});
