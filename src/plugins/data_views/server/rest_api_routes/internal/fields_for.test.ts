/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseFields } from './fields_for';

describe('_fields_for_wildcard', () => {
  describe('parseMetaFields', () => {
    it('should throw if receiving a string of comma-separated values', () => {
      const value = '_source,_id';
      expect(() => parseFields(value)).toThrowErrorMatchingInlineSnapshot(
        `"metaFields should be an array of field names, a JSON-stringified array of field names, or a single field name"`
      );
    });

    it('should parse a stringified list of values', () => {
      const value = JSON.stringify(['_source', '_id']);
      const fields = parseFields(value);
      expect(fields).toMatchInlineSnapshot(`
      Array [
        "_source",
        "_id",
      ]
    `);
    });

    it('should wrap a single value in an array', () => {
      const value = '_source';
      const fields = parseFields(value);
      expect(fields).toMatchInlineSnapshot(`
      Array [
        "_source",
      ]
    `);
    });

    it('should return the array if already an array', () => {
      const value = ['_source', '_id'];
      const fields = parseFields(value);
      expect(fields).toMatchInlineSnapshot(`
      Array [
        "_source",
        "_id",
      ]
    `);
    });
  });
});
