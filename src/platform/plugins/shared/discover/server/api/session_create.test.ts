/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { discoverSessionApiDataSchema } from '@kbn/as-code-discover-schema';
import type { RequestHandlerContext } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { injectReferences, parseSearchSourceJSON } from '@kbn/data-plugin/common';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import { createDiscoverSession } from './session_create';

describe('createDiscoverSession', () => {
  it('stores an inline ID and filter references without exposing the ID in the public response', async () => {
    const core = coreMock.createRequestHandlerContext();
    const context = jest.mocked<RequestHandlerContext>({
      core: Promise.resolve(core),
      resolve: jest.fn().mockResolvedValue({ core }),
    });
    core.savedObjects.client.create.mockImplementation(async (type, attributes, options) => ({
      id: 'session-id',
      type,
      attributes,
      references: options?.references ?? [],
    }));
    const data = discoverSessionApiDataSchema.parse({
      title: 'Inline session',
      tabs: [
        {
          id: 'tab',
          label: 'Logs',
          column_order: [],
          data_source: { type: 'data_view_spec', index_pattern: 'logs-*' },
          filters: [
            { type: 'condition', condition: { field: 'bytes', operator: 'exists' } },
            {
              type: 'condition',
              data_view_id: 'other-view',
              condition: { field: 'bytes', operator: 'exists' },
            },
          ],
        },
      ],
    });

    const response = await createDiscoverSession(context, data);

    expect(core.savedObjects.client.create).toHaveBeenCalledTimes(1);
    const [type, attributes, options] = core.savedObjects.client.create.mock.calls[0];
    expect(type).toBe(SavedSearchType);
    const stored = attributes as DiscoverSessionAttributes;
    const loaded = injectReferences(
      parseSearchSourceJSON(stored.tabs[0].attributes.kibanaSavedObjectMeta.searchSourceJSON),
      options?.references ?? []
    );
    const { index } = loaded;
    if (!index || typeof index === 'string') {
      throw new Error('Expected a stored inline Data View');
    }

    expect(index).toEqual({ title: 'logs-*', id: expect.any(String) });
    expect(loaded.filter?.map(({ meta }) => meta.index)).toEqual([index.id, 'other-view']);
    expect(options?.references?.map(({ id }) => id)).toEqual(['other-view']);
    expect(response.data.tabs[0].data_source).not.toHaveProperty('id');
    expect(response.data).toEqual(data);
    expect(core.savedObjects.client.resolve).not.toHaveBeenCalled();
    expect(core.savedObjects.client.update).not.toHaveBeenCalled();
  });
});
