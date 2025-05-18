/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { cancelSync } from './cancel_sync';

describe('cancelSync lib function', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };

  it('should cancel a sync', async () => {
    mockClient.transport.request.mockImplementation(() => ({
      success: true,
    }));

    await expect(cancelSync(mockClient as unknown as ElasticsearchClient, '1234')).resolves.toEqual(
      { success: true }
    );
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/_connector/_sync_job/1234/_cancel',
    });
  });
});
