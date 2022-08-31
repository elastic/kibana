/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { bucketAggsSchemas } from './bucket_aggs';

describe('bucket aggregation schemas', () => {
  describe('terms aggregation schema', () => {
    const schema = bucketAggsSchemas.terms;

    it('passes validation when using `1` for `min_doc_count`', () => {
      expect(() => schema.validate({ min_doc_count: 1 })).not.toThrow();
    });

    // see https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-terms-aggregation.html#_minimum_document_count_4
    // Setting min_doc_count=0 will also return buckets for terms that didn’t match any hit,
    // bypassing any filtering perform via `filter` or `query`
    // causing a potential security issue as we can return values from other spaces.
    it('throws an error when using `0` for `min_doc_count`', () => {
      expect(() => schema.validate({ min_doc_count: 0 })).toThrowErrorMatchingInlineSnapshot(
        `"[min_doc_count]: Value must be equal to or greater than [1]."`
      );
    });
  });

  describe('histogram aggregation schema', () => {
    const schema = bucketAggsSchemas.histogram;

    it('passes validation when using `1` for `min_doc_count`', () => {
      expect(() => schema.validate({ min_doc_count: 1 })).not.toThrow();
    });

    it('throws an error when using `0` for `min_doc_count`', () => {
      expect(() => schema.validate({ min_doc_count: 0 })).toThrowErrorMatchingInlineSnapshot(
        `"[min_doc_count]: Value must be equal to or greater than [1]."`
      );
    });
  });
});
