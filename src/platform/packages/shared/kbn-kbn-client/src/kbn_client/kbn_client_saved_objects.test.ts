/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import type { KbnClientRequester } from './kbn_client_requester';
import { KbnClientSavedObjects } from './kbn_client_saved_objects';

describe('KbnClientSavedObjects', () => {
  const createClient = () => {
    const request = jest.fn().mockResolvedValue({ data: { id: '1', type: 't', attributes: {} } });
    const client = new KbnClientSavedObjects(new ToolingLog(), {
      request,
    } as unknown as KbnClientRequester);
    return { client, request };
  };

  it('omits overwrite query param on create when undefined and forwards initialNamespaces', async () => {
    const { client, request } = createClient();

    await client.create({
      type: 'synthetics-private-location',
      id: 'loc-1',
      attributes: { label: 'test' },
      initialNamespaces: ['*'],
      space: 'default',
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/s/default/internal/ftr/kbn_client_so/synthetics-private-location/loc-1',
        query: undefined,
        body: expect.objectContaining({
          attributes: { label: 'test' },
          initialNamespaces: ['*'],
        }),
      })
    );
  });

  it('includes overwrite query param on create and update when explicitly provided', async () => {
    const { client, request } = createClient();

    await client.create({
      type: 'synthetics-private-location',
      id: 'loc-1',
      attributes: {},
      overwrite: true,
    });
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        method: 'POST',
        query: { overwrite: true },
      })
    );

    await client.update({
      type: 'synthetics-private-location',
      id: 'loc-1',
      attributes: {},
    });
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        method: 'PUT',
        query: undefined,
      })
    );
  });
});
