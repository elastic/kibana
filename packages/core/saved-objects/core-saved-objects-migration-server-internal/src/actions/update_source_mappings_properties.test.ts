/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { chain } from 'lodash';
import * as Either from 'fp-ts/lib/Either';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import {
  updateSourceMappingsProperties,
  type UpdateSourceMappingsPropertiesParams,
} from './update_source_mappings_properties';
import { getBaseMappings } from '../core';

describe('updateSourceMappingsProperties', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createInternalClient>;
  let params: UpdateSourceMappingsPropertiesParams;

  beforeEach(() => {
    client = elasticsearchClientMock.createInternalClient();
    params = {
      client,
      indexTypes: ['a', 'b', 'c'],
      latestMappingsVersions: {
        a: '10.1.0',
        b: '10.2.0',
        c: '10.5.0',
      },
      sourceIndex: '.kibana_8.7.0_001',
      indexMappings: {
        properties: {
          a: { type: 'keyword' },
          b: { type: 'long' },
          ...getBaseMappings().properties,
        },
        _meta: {
          migrationMappingPropertyHashes: {
            a: '000',
            b: '111',
          },
        },
      },
      appMappings: {
        properties: {
          a: { type: 'keyword' },
          b: { type: 'long' },
          c: { type: 'long' },
          ...getBaseMappings().properties,
        },
        _meta: {
          mappingVersions: {
            a: '10.1.0',
            b: '10.3.0',
            c: '10.5.0',
          },
        },
      },
      hashToVersionMap: {
        'a|000': '10.1.0',
        'b|111': '10.1.0',
      },
    };
  });

  it('should not update mappings when there are no changes', async () => {
    // we overwrite the app mappings to have the "unchanged" values with respect to the index mappings
    const sameMappingsParams = chain(params)
      // let's not introduce 'c' for now
      .set('indexTypes', ['a', 'b'])
      // even if the app versions are more recent, we emulate a scenario where mappings haven NOT changed
      .set('latestMappingsVersions', { a: '10.1.0', b: '10.1.0' })
      .value();
    const result = await updateSourceMappingsProperties(sameMappingsParams)();

    expect(client.indices.putMapping).not.toHaveBeenCalled();
    expect(Either.isRight(result)).toEqual(true);
    expect(result).toHaveProperty('right', 'update_mappings_succeeded');
  });

  it('should update mappings if there are new types', async () => {
    // we overwrite the app mappings to have the "unchanged" values with respect to the index mappings
    const sameMappingsParams = chain(params)
      // even if the app versions are more recent, we emulate a scenario where mappings haven NOT changed
      .set('latestMappingsVersions', { a: '10.1.0', b: '10.1.0', c: '10.1.0' })
      .value();
    const result = await updateSourceMappingsProperties(sameMappingsParams)();

    expect(client.indices.putMapping).toHaveBeenCalledTimes(1);
    expect(client.indices.putMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          a: { type: 'keyword' },
          b: { type: 'long' },
          c: { type: 'long' },
        }),
      })
    );
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
