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
  UpdateSourceMappingsPropertiesResult,
} from './update_source_mappings_properties';

describe('updateSourceMappingsProperties', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createInternalClient>;
  let params: UpdateSourceMappingsPropertiesParams;

  beforeEach(() => {
    client = elasticsearchClientMock.createInternalClient();
    params = {
      client,
      aliases: {
        '.kibana': '.kibana_8.7.0_001',
        '.kibana_8.7.0': '.kibana_8.7.0_001',
        '.kibana_8.8.0': '.kibana_8.8.0_001',
      },
      currentAlias: '.kibana',
      versionAlias: '.kibana_8.8.0',
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

  describe('when there are no changes', () => {
    let sameMappingsParams: typeof params;

    beforeEach(() => {
      sameMappingsParams = chain(params).set('targetMappings', params.sourceMappings).value();
    });

    it('should not update mappings', async () => {
      const result = await updateSourceMappingsProperties(sameMappingsParams)();

      expect(Either.isRight(result)).toEqual(true);
      expect(client.indices.putMapping).not.toHaveBeenCalled();
    });

    it('should report that changes are compatible if the migration is incomplete', async () => {
      const result = await updateSourceMappingsProperties(sameMappingsParams)();

      expect(Either.isRight(result)).toEqual(true);
      expect(result).toHaveProperty('right', UpdateSourceMappingsPropertiesResult.Compatible);
    });

    it('should report that index is up to date if the migration is completed', async () => {
      const result = await updateSourceMappingsProperties(
        chain(sameMappingsParams).set('versionAlias', params.currentAlias).value()
      )();

      expect(Either.isRight(result)).toEqual(true);
      expect(result).toHaveProperty('right', UpdateSourceMappingsPropertiesResult.Updated);
    });
  });

  describe('when there are compatible changes', () => {
    it('should update mappings', async () => {
      const result = await updateSourceMappingsProperties(params)();

      expect(Either.isRight(result)).toEqual(true);
      expect(client.indices.putMapping).toHaveBeenCalledWith(
        expect.not.objectContaining({
          _meta: expect.anything(),
        })
      );
    });

    it('should report that changes are compatible if the migration is incomplete', async () => {
      const result = await updateSourceMappingsProperties(params)();

      expect(Either.isRight(result)).toEqual(true);
      expect(result).toHaveProperty('right', UpdateSourceMappingsPropertiesResult.Compatible);
    });

    it('should report that index is up to date if the migration is completed', async () => {
      const result = await updateSourceMappingsProperties(
        chain(params).set('versionAlias', params.currentAlias).value()
      )();

      expect(Either.isRight(result)).toEqual(true);
      expect(result).toHaveProperty('right', UpdateSourceMappingsPropertiesResult.Updated);
    });
  });

  describe('when there are incompatible changes', () => {
    beforeEach(() => {
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
    });

    it('should update mappings', async () => {
      const result = await updateSourceMappingsProperties(params)();

      expect(Either.isRight(result)).toEqual(true);
      expect(client.indices.putMapping).toHaveBeenCalledWith(
        expect.not.objectContaining({
          _meta: expect.anything(),
        })
      );
    });

    it('should report that changes are incompatible if the migration is incomplete', async () => {
      const result = await updateSourceMappingsProperties(params)();

      expect(Either.isRight(result)).toEqual(true);
      expect(result).toHaveProperty('right', UpdateSourceMappingsPropertiesResult.Incompatible);
    });

    it('should report a failure if the migration is already completed', async () => {
      const result = await updateSourceMappingsProperties(
        chain(params).set('versionAlias', params.currentAlias).value()
      )();

      expect(Either.isLeft(result)).toEqual(true);
      expect(result).toHaveProperty('left', { type: 'incompatible_mapping_exception' });
    });
  });
});
