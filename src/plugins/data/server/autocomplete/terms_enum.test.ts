/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { termsEnumSuggestions } from './terms_enum';
import { coreMock } from '../../../../core/server/mocks';
import { ElasticsearchClient, SavedObjectsClientContract } from 'kibana/server';
import { ConfigSchema } from '../../config';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import type { ApiResponse } from '@elastic/elasticsearch';

let savedObjectsClientMock: jest.Mocked<SavedObjectsClientContract>;
let esClientMock: DeeplyMockedKeys<ElasticsearchClient>;
const configMock = {
  autocomplete: { valueSuggestions: { tiers: ['data_hot', 'data_warm', 'data_content'] } },
} as ConfigSchema;
const mockResponse = {
  body: { terms: ['whoa', 'amazing'] },
};

jest.mock('../index_patterns');

describe('_terms_enum suggestions', () => {
  beforeEach(() => {
    const requestHandlerContext = coreMock.createRequestHandlerContext();
    savedObjectsClientMock = requestHandlerContext.savedObjects.client;
    esClientMock = requestHandlerContext.elasticsearch.client.asCurrentUser;
    esClientMock.transport.request.mockResolvedValue((mockResponse as unknown) as ApiResponse);
  });

  it('calls the _terms_enum API with the field, query, filters, and config tiers', async () => {
    const result = await termsEnumSuggestions(
      configMock,
      savedObjectsClientMock,
      esClientMock,
      'index',
      'fieldName',
      'query',
      [],
      { name: 'field_name', type: 'string' }
    );

    const [[args]] = esClientMock.transport.request.mock.calls;

    expect(args).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "field": "field_name",
          "index_filter": Object {
            "bool": Object {
              "must": Array [
                Object {
                  "terms": Object {
                    "_tier": Array [
                      "data_hot",
                      "data_warm",
                      "data_content",
                    ],
                  },
                },
              ],
            },
          },
          "string": "query",
        },
        "method": "POST",
        "path": "/index/_terms_enum",
      }
    `);
    expect(result).toEqual(mockResponse.body.terms);
  });

  it('calls the _terms_enum API and fallback to fieldName when field is null', async () => {
    const result = await termsEnumSuggestions(
      configMock,
      savedObjectsClientMock,
      esClientMock,
      'index',
      'fieldName',
      'query',
      []
    );

    const [[args]] = esClientMock.transport.request.mock.calls;

    expect(args).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "field": "fieldName",
          "index_filter": Object {
            "bool": Object {
              "must": Array [
                Object {
                  "terms": Object {
                    "_tier": Array [
                      "data_hot",
                      "data_warm",
                      "data_content",
                    ],
                  },
                },
              ],
            },
          },
          "string": "query",
        },
        "method": "POST",
        "path": "/index/_terms_enum",
      }
    `);
    expect(result).toEqual(mockResponse.body.terms);
  });
});
