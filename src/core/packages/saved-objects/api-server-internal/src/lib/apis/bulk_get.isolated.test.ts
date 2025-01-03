/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getSavedObjectFromSourceMock,
  rawDocExistsInNamespaceMock,
} from './bulk_get.isolated.test.mocks';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SavedObject, CheckAuthorizationResult } from '@kbn/core-saved-objects-server';
import { apiContextMock, ApiExecutionContextMock } from '../../mocks';
import { performBulkGet } from './bulk_get';

interface ObjectInfo {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
}

const mgetResultToSavedObject = (hit: estypes.GetGetResult<any>): SavedObject => {
  const type = hit._source.type;
  return {
    type,
    id: hit._id,
    references: [],
    attributes: hit._source[type],
  };
};

const createMgetResult = (object: ObjectInfo): estypes.GetGetResult => {
  return {
    _index: '.kibana',
    found: true,
    _id: object.id,
    _source: {
      type: object.type,
      [object.type]: object.attributes,
    },
  };
};

const createMgetResponse = (objects: ObjectInfo[]): estypes.MgetResponse => {
  return {
    docs: objects.map(createMgetResult),
  };
};

describe('performBulkGet', () => {
  let apiContext: ApiExecutionContextMock;

  beforeEach(() => {
    apiContext = apiContextMock.create({
      allowedTypes: ['type'],
    });

    apiContext.helpers.common.getCurrentNamespace.mockReturnValue('default');
    apiContext.extensions.spacesExtension.getSearchableNamespaces.mockResolvedValue(['default']);

    getSavedObjectFromSourceMock.mockReset();
    rawDocExistsInNamespaceMock.mockReset().mockResolvedValue(true);
  });

  it('calls migrationHelper.migrateAndDecryptStorageDocument with the correct parameters', async () => {
    const type = 'type';

    apiContext.client.mget.mockResponse(
      createMgetResponse([
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

    getSavedObjectFromSourceMock.mockImplementation((_registry, _type, _id, doc) =>
      mgetResultToSavedObject(doc)
    );

    const checkResult: CheckAuthorizationResult<string> = {
      status: 'fully_authorized',
      typeMap: new Map(),
    };
    apiContext.extensions.securityExtension.authorizeBulkGet.mockResolvedValue(checkResult);

    await performBulkGet(
      {
        objects: [
          {
            type,
            id: 'id1',
          },
          {
            type,
            id: 'id2',
          },
        ],
        options: {},
      },
      apiContext
    );

    const results = getSavedObjectFromSourceMock.mock.results;

    expect(apiContext.helpers.migration.migrateAndDecryptStorageDocument).toHaveBeenCalledTimes(
      results.length
    );
    results.forEach((result) => {
      expect(apiContext.helpers.migration.migrateAndDecryptStorageDocument).toHaveBeenCalledWith({
        document: result.value,
        typeMap: checkResult.typeMap,
      });
    });
  });
});
