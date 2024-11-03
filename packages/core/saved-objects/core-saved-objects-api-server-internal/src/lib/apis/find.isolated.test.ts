/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSupportedEsServerMock } from './find.isolated.test.mocks';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SavedObject, AuthorizationTypeMap } from '@kbn/core-saved-objects-server';
import { apiContextMock, ApiExecutionContextMock } from '../../mocks';
import { performFind } from './find';

interface ObjectInfo {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
}

const hitToSavedObject = (hit: estypes.SearchHit<any>): SavedObject => {
  const type = hit._source.type;
  return {
    type,
    id: hit._id!,
    references: [],
    attributes: hit._source[type],
  };
};

const createHit = ({ type, id, attributes }: ObjectInfo): estypes.SearchHit => {
  return {
    _index: '.kibana',
    _id: id,
    _score: 1,
    _seq_no: 1,
    _primary_term: 1,
    _source: {
      type,
      references: [],
      [type]: attributes,
    },
  };
};

const createSuccessSearchResponse = (objects: ObjectInfo[]): estypes.SearchResponse => {
  return {
    took: 1,
    timed_out: false,
    _shards: {} as any,
    hits: {
      total: objects.length,
      hits: objects.map(createHit),
    },
  };
};

describe('performFind', () => {
  let apiContext: ApiExecutionContextMock;

  beforeEach(() => {
    apiContext = apiContextMock.create({
      allowedTypes: ['type'],
    });

    isSupportedEsServerMock.mockReturnValue(true);

    apiContext.helpers.serializer.rawToSavedObject.mockImplementation(hitToSavedObject as any);
    apiContext.extensions.spacesExtension.getSearchableNamespaces.mockResolvedValue(['default']);
  });

  it('calls migrationHelper.migrateAndDecryptStorageDocument with the correct parameters', async () => {
    const type = 'type';

    apiContext.client.search.mockResponse(
      createSuccessSearchResponse([
        {
          type,
          id: 'id1',
          attributes: { foo: '1' },
        },
        {
          type,
          id: 'id2',
          attributes: { foo: '2' },
        },
      ])
    );

    const authzTypeMap: AuthorizationTypeMap<string> = new Map();
    apiContext.extensions.securityExtension.getFindRedactTypeMap.mockResolvedValue(authzTypeMap);

    await performFind(
      {
        options: { type },
        internalOptions: {
          disableExtensions: false,
        },
      },
      apiContext
    );

    expect(apiContext.helpers.migration.migrateAndDecryptStorageDocument).toHaveBeenCalledTimes(2);

    const results = apiContext.helpers.serializer.rawToSavedObject.mock.results;
    results.forEach((result) => {
      expect(apiContext.helpers.migration.migrateAndDecryptStorageDocument).toHaveBeenCalledWith({
        document: result.value,
        typeMap: authzTypeMap,
      });
    });
  });
});
