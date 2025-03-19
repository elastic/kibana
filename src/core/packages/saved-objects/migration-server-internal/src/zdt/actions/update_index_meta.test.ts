/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { updateMappingsMock } from './update_index_meta.test.mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { IndexMappingMeta } from '@kbn/core-saved-objects-base-server-internal';
import { updateIndexMeta } from './update_index_meta';

describe('updateIndexMeta', () => {
  it('calls updateMappings with the correct parameters', () => {
    const client = elasticsearchClientMock.createElasticsearchClient();
    const index = '.kibana_1';
    const meta: IndexMappingMeta = {
      mappingVersions: {
        foo: '10.1.0',
        bar: '10.1.0',
      },
    };

    updateIndexMeta({ client, index, meta });

    expect(updateMappingsMock).toHaveBeenCalledTimes(1);
    expect(updateMappingsMock).toHaveBeenCalledWith({
      client,
      index,
      mappings: {
        properties: {},
        _meta: meta,
      },
    });
  });

  it('returns the response from updateMappings', () => {
    const client = elasticsearchClientMock.createElasticsearchClient();
    const index = '.kibana_1';
    const meta: IndexMappingMeta = {};

    const expected = Symbol();
    updateMappingsMock.mockReturnValue(expected);

    const actual = updateIndexMeta({ client, index, meta });

    expect(actual).toBe(expected);
  });
});
