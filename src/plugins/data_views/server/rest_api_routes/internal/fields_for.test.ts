/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseFields } from './fields_for';

describe('_fields_for_wildcard', () => {
  describe('parseMetaFields', () => {
    it('should throw if receiving a string of comma-separated values', () => {
      const value = '_source,_id';
      expect(() => parseFields(value, 'metaFields')).toThrowErrorMatchingInlineSnapshot(
        `"metaFields should be an array of strings, a JSON-stringified array of strings, or a single string"`
      );
    });

    it('should parse a stringified list of values', () => {
      const value = JSON.stringify(['_source', '_id']);
      const fields = parseFields(value, 'metaFields');
      expect(fields).toMatchInlineSnapshot(`
      Array [
        "_source",
        "_id",
      ]
    `);
    });

    it('should wrap a single value in an array', () => {
      const value = '_source';
      const fields = parseFields(value, 'metaFields');
      expect(fields).toMatchInlineSnapshot(`
      Array [
        "_source",
      ]
    `);
    });

    it('should return the array if already an array', () => {
      const value = ['_source', '_id'];
      const fields = parseFields(value, 'metaFields');
      expect(fields).toMatchInlineSnapshot(`
      Array [
        "_source",
        "_id",
      ]
    `);
    });
  });
});
