/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { ActionConnectorProps } from '../../types';
import { fetchConnectors } from './fetch_connectors';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('fetchConnectors', () => {
  test('should call getAll actions API', async () => {
    const apiResponseValue = [
      {
        id: 'test-connector',
        name: 'Test',
        connector_type_id: 'test',
        is_preconfigured: false,
        is_deprecated: false,
        is_missing_secrets: false,
        is_system_action: false,
        referenced_by_count: 0,
        secrets: {},
        config: {},
      },
    ];

    const resolvedValue: Array<ActionConnectorProps<{}, {}>> = [
      {
        id: 'test-connector',
        name: 'Test',
        actionTypeId: 'test',
        isPreconfigured: false,
        isDeprecated: false,
        isMissingSecrets: false,
        isSystemAction: false,
        referencedByCount: 0,
        secrets: {},
        config: {},
      },
    ];

    http.get.mockResolvedValueOnce(apiResponseValue);

    const result = await fetchConnectors({ http });

    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/actions/connectors",
      ]
    `);
  });

  test('should call the internal getAll actions API if includeSystemActions=true', async () => {
    const apiResponseValue = [
      {
        id: '.test-system-action',
        name: 'System action name',
        connector_type_id: 'test',
        is_preconfigured: false,
        is_deprecated: false,
        is_missing_secrets: false,
        is_system_action: true,
        referenced_by_count: 0,
        secrets: {},
        config: {},
      },
    ];

    const resolvedValue: Array<ActionConnectorProps<{}, {}>> = [
      {
        id: '.test-system-action',
        name: 'System action name',
        actionTypeId: 'test',
        isPreconfigured: false,
        isDeprecated: false,
        isMissingSecrets: false,
        isSystemAction: true,
        referencedByCount: 0,
        secrets: {},
        config: {},
      },
    ];

    http.get.mockResolvedValueOnce(apiResponseValue);

    const result = await fetchConnectors({ http, includeSystemActions: true });

    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/actions/connectors",
      ]
    `);
  });
});
