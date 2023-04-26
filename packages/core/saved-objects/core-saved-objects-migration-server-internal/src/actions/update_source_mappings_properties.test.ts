/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chain } from 'lodash';
import * as Either from 'fp-ts/lib/Either';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import {
  updateSourceMappingsProperties,
  type UpdateSourceMappingsPropertiesParams,
} from './update_source_mappings_properties';

describe('updateSourceMappingsProperties', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createInternalClient>;
  let params: UpdateSourceMappingsPropertiesParams;

  beforeEach(() => {
    client = elasticsearchClientMock.createInternalClient();
    params = {
      client,
      sourceIndex: '.kibana_8.7.0_001',
      sourceMappings: {
        properties: {
          a: { type: 'keyword' },
          b: { type: 'long' },
        },
        _meta: {
          migrationMappingPropertyHashes: {
            a: '000',
            b: '111',
          },
        },
      },
      targetMappings: {
        properties: {
          a: { type: 'keyword' },
          c: { type: 'long' },
        },
        _meta: {
          migrationMappingPropertyHashes: {
            a: '000',
            c: '222',
          },
        },
      },
    };
  });

  it('should not update mappings when there are no changes', async () => {
    const sameMappingsParams = chain(params).set('targetMappings', params.sourceMappings).value();
    const result = await updateSourceMappingsProperties(sameMappingsParams)();

    expect(client.indices.putMapping).not.toHaveBeenCalled();
    expect(Either.isRight(result)).toEqual(true);
    expect(result).toHaveProperty('right', 'update_mappings_succeeded');
  });

  it('should return that mappings are updated when changes are compatible', async () => {
    const result = await updateSourceMappingsProperties(params)();

    expect(client.indices.putMapping).toHaveBeenCalledWith(
      expect.not.objectContaining({
        _meta: expect.anything(),
      })
    );
    expect(Either.isRight(result)).toEqual(true);
    expect(result).toHaveProperty('right', 'update_mappings_succeeded');
  });

  it('should report that changes are incompatible', async () => {
    client.indices.putMapping.mockRejectedValueOnce(
      elasticsearchClientMock.createApiResponse({
        statusCode: 400,
        body: {
          error: {
            type: 'strict_dynamic_mapping_exception',
          },
        },
      })
    );
    const result = await updateSourceMappingsProperties(params)();

    expect(Either.isLeft(result)).toEqual(true);
    expect(result).toHaveProperty(
      'left',
      expect.objectContaining({
        type: 'incompatible_mapping_exception',
      })
    );
  });
});
