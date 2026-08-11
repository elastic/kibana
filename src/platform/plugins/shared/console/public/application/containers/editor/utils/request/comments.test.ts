/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { containsComments, removeCommentsFromData } from './comments';
import { TRIPLE_QUOTE_STRINGS_MARKER } from './triple_quotes';

describe('comments', () => {
  describe('containsComments', () => {
    it('should return false for JSON with comment markers inside strings', () => {
      const requestData = `{
      "docs": [
        {
          "_source": {
            "trace": {
              "name": "GET /actuator/health/**"
            },
            "transaction": {
              "outcome": "success"
            }
          }
        },
        {
          "_source": {
            "vulnerability": {
              "reference": [
                "https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-15778#details"
              ]
            }
          }
        }
      ]
    }`;
      expect(containsComments(requestData)).toBe(false);
    });

    it('should return true for text with actual line comment', () => {
      const requestData = `{
      // This is a comment
      "query": { "match_all": {} }
    }`;
      expect(containsComments(requestData)).toBe(true);
    });

    it('should return true for text with actual block comment', () => {
      const requestData = `{
      /* Bulk insert */
      "index": { "_index": "test" },
      "field1": "value1"
    }`;
      expect(containsComments(requestData)).toBe(true);
    });

    it('should return true for text with actual hash comment', () => {
      const requestData = `{
      # This is a comment
      "query": { "match_all": {} }
    }`;
      expect(containsComments(requestData)).toBe(true);
    });

    it('should return false for text without any comments', () => {
      const requestData = `{
      "field": "value"
    }`;
      expect(containsComments(requestData)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(containsComments('')).toBe(false);
    });

    it('should reset token scanning between calls', () => {
      const requestDataWithComment = `{
      // This is a comment
      "query": { "match_all": {} }
    }`;
      const requestDataWithoutComment = '{ "query": { "match_all": {} } }';

      expect(containsComments(requestDataWithComment)).toBe(true);
      expect(containsComments(requestDataWithoutComment)).toBe(false);
      expect(containsComments(requestDataWithComment)).toBe(true);
    });

    it('should correctly handle escaped quotes within strings', () => {
      const requestData = `{
      "field": \"value with \\\"escaped quotes\\\"\"
    }`;
      expect(containsComments(requestData)).toBe(false);
    });

    it('should return true if comment is outside of strings', () => {
      const requestData = `{
      "field": "value" // comment here
    }`;
      expect(containsComments(requestData)).toBe(true);
    });

    it('should ignore comment-like sequences inside triple-quote strings', () => {
      const requestData = `{
      "script": """def quote = '"'; // painless comment # still script"""
    }`;
      expect(containsComments(requestData)).toBe(false);
    });

    it('should detect comments outside triple-quote strings', () => {
      const requestData = `{
      // request comment
      "script": """def quote = '"'; // painless comment"""
    }`;
      expect(containsComments(requestData)).toBe(true);
    });
  });

  describe('removeCommentsFromData', () => {
    it('removes line and block comments from the request data', () => {
      const requestData = `{
  // line comment
  "query": {
    /* block comment */
    "match_all": {}
  } // trailing comment
}`;
      const result = removeCommentsFromData(requestData);
      expect(containsComments(result)).toBe(false);
      expect(JSON.parse(result)).toEqual({ query: { match_all: {} } });
    });

    it('removes comments when the data also contains multi-line triple-quote strings', () => {
      // Regression test for https://github.com/elastic/kibana/issues/277160
      const requestData = `{
  // watch metadata
  "script": {
    "lang": "painless",
    "source": """
      def a = 1; // painless comment
      return a;
    """
  } /* end of script */
}`;
      const result = removeCommentsFromData(requestData);
      expect(result).not.toContain('// watch metadata');
      expect(result).not.toContain('/* end of script */');
      // The triple-quote string is preserved, including the comments inside it
      expect(result).toContain(`"source": """
      def a = 1; // painless comment
      return a;
    """`);
    });

    it('preserves comment-like sequences inside strings', () => {
      const requestData = `{
  "url": "https://elastic.co", // comment
  "pattern": "/*"
}`;
      const result = removeCommentsFromData(requestData);
      expect(result).not.toContain('// comment');
      expect(JSON.parse(result)).toEqual({ url: 'https://elastic.co', pattern: '/*' });
    });

    it('preserves a literal value matching the triple-quote placeholder', () => {
      const requestData = `{
  // comment
  "literal": ${TRIPLE_QUOTE_STRINGS_MARKER},
  "script": """return 1;"""
}`;
      const result = removeCommentsFromData(requestData);
      expect(result).not.toContain('// comment');
      expect(result).toMatch(/"literal"\s*:\s*"\{tripleQuoteString\}"/);
      expect(result).toMatch(/"script"\s*:\s*"""return 1;"""/);
    });

    it('preserves triple-quote values when object keys are reordered during parsing', () => {
      const requestData = `{
  // comment
  "z": """first""",
  "1": """second"""
}`;
      const result = removeCommentsFromData(requestData);
      expect(result).not.toContain('// comment');
      expect(result).toMatch(/"z"\s*:\s*"""first"""/);
      expect(result).toMatch(/"1"\s*:\s*"""second"""/);
    });

    it('ignores triple-quote delimiters inside comments', () => {
      const requestData = `{
  // this comment mentions """
  /* this block comment also mentions """ */
  "script": """return 1;"""
}`;
      const result = removeCommentsFromData(requestData);
      expect(result).not.toContain('this comment mentions');
      expect(result).not.toContain('this block comment');
      expect(result).toMatch(/"script"\s*:\s*"""return 1;"""/);
    });

    it('returns invalid data unchanged', () => {
      const requestData = '{\n  "query": // comment\n    {';
      expect(removeCommentsFromData(requestData)).toBe(requestData);
    });
  });
});
