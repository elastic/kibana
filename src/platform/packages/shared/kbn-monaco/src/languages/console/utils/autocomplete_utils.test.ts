/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isInsideTripleQuotes } from './autocomplete_utils';

describe('autocomplete_utils', () => {
  describe('isInsideTripleQuotes', () => {
    it('should return false for both flags for an empty string', () => {
      expect(isInsideTripleQuotes('')).toEqual({
        insideTripleQuotes: false,
        insideQuery: false,
      });
    });

    it('should return false for both flags for a request without triple quotes', () => {
      const request = `POST _search\n{\n  "query": {\n    "match": {\n      "message": "hello world"\n    }\n  }\n}`;
      expect(isInsideTripleQuotes(request)).toEqual({
        insideTripleQuotes: false,
        insideQuery: false,
      });
    });

    it('should return true for insideTripleQuotes and false for insideQuery if triple quotes are not in query', () => {
      const request = `POST _ingest/pipeline/_simulate\n{\n  "pipeline": {\n    "processors": [\n      {\n        "script": {\n          "source":\n          """\n            for (field in params['fields']){\n                if (!$(field, '').isEmpty()){\n`;
      expect(isInsideTripleQuotes(request)).toEqual({
        insideTripleQuotes: true,
        insideQuery: false,
      });
    });

    it('should return false for both flags if triple-quoted string is properly closed', () => {
      const request = `POST _ingest/pipeline/_simulate\n{\n  "pipeline": {\n    "processors": [\n      {\n        "script": {\n          "source":\n          """\n            return 'hello';\n          """\n        }\n      }\n    ]\n  }\n}`;
      expect(isInsideTripleQuotes(request)).toEqual({
        insideTripleQuotes: false,
        insideQuery: false,
      });
    });

    it('should return true for both flags if inside triple quotes and inside a "query" field', () => {
      const request = `POST _query\n{\n  "query": """FROM test `;
      expect(isInsideTripleQuotes(request)).toEqual({
        insideTripleQuotes: true,
        insideQuery: true,
      });
    });
  });
});
