/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { ActionConnectorProps } from '../../types';
import { fetchConnector } from './fetch_connector';
import { createMockActionConnector } from '../../test_utils/connector.mock';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('fetchConnector', () => {
  it('should call get connector API', async () => {
    const apiResponseValue = {
      id: 'test-connector',
      name: 'Test',
      connector_type_id: 'test',
      is_preconfigured: false,
      is_deprecated: false,
      is_missing_secrets: false,
      is_system_action: false,
      referenced_by_count: 0,
      is_connector_type_deprecated: false,
      secrets: {},
      config: {},
    };

    const resolvedValue: ActionConnectorProps<
      Record<string, unknown>,
      Record<string, unknown>
    > = createMockActionConnector({
      id: 'test-connector',
      name: 'Test',
      actionTypeId: 'test',
      referencedByCount: 0,
      isMissingSecrets: false,
      secrets: {},
      config: {},
    });

    http.get.mockResolvedValueOnce(apiResponseValue);

    const result = await fetchConnector('test-connector', { http });

    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/actions/connector/test-connector",
      ]
    `);
  });
});
