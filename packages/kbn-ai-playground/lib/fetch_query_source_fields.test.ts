/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ELSER_PASSAGE_CHUNKED_TWO_INDICES,
  ELSER_PASSAGE_CHUNKED_TWO_INDICES_DOCS,
} from './fetch_query_source_fields_mock';
import { parseFieldsCapabilities } from './fetch_query_source_fields';

describe('fetch_query_source_fields', () => {
  describe('parseFieldsCapabilities', () => {
    it("should return the correct fields for the index 'workplace_index'", () => {
      expect(
        parseFieldsCapabilities(ELSER_PASSAGE_CHUNKED_TWO_INDICES, [
          {
            index: 'workplace_index2',
            doc: ELSER_PASSAGE_CHUNKED_TWO_INDICES_DOCS[0],
          },
          {
            index: 'workplace_index',
            doc: ELSER_PASSAGE_CHUNKED_TWO_INDICES_DOCS[1],
          },
        ])
      ).toEqual({
        workplace_index: {
          elser_query_fields: [
            {
              field: 'content_vector.tokens',
              model_id: '.elser_model_2',
              nested: false,
            },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [
            'metadata.summary',
            'content',
            'metadata.rolePermissions',
            'content_vector.model_id',
            'metadata.name',
          ],
        },
        workplace_index2: {
          elser_query_fields: [
            {
              field: 'vector.tokens',
              model_id: '.elser_model_2',
              nested: false,
            },
          ],
          dense_vector_query_fields: [],
          bm25_query_fields: [],
          source_fields: [
            'metadata.summary',
            'vector.model_id',
            'metadata.rolePermissions',
            'text',
            'metadata.name',
          ],
        },
      });
    });
  });
});
