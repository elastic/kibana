/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatWithHjson } from './hjson_adapter';

describe('Hjson comment adapter', () => {
  describe('WHEN empty containers have no internal comments', () => {
    it('SHOULD keep arrays and objects compact', () => {
      const source = '{\n"array": [],\n"object": {},\n"value": 1 // note\n}';

      expect(formatWithHjson(source, '\n')).toBe(
        ['{', '  "array": [],', '  "object": {},', '  "value": 1 // note', '}'].join('\n')
      );
    });
  });

  describe('WHEN empty containers contain an end comment', () => {
    it('SHOULD keep the container expanded around that comment', () => {
      const arrayResult = formatWithHjson('{\n"value": [\n  //todo\n]\n}', '\n');
      const objectResult = formatWithHjson('{\n"value": {\n  //todo\n}\n}', '\n');

      expect(arrayResult).toContain('"value": [\n');
      expect(arrayResult).toContain('//todo\n  ]');
      expect(objectResult).toContain('"value": {\n');
      expect(objectResult).toContain('//todo\n  }');
    });
  });

  describe('WHEN a comma follows a comment group', () => {
    it('SHOULD move the comma before the comments for Hjson parsing', () => {
      const result = formatWithHjson('{\n"a":1// one\n/* two */\n,"b":2\n}', '\n');

      expect(result).toContain('"a": 1, // one');
      expect(result).toContain('/* two */');
      expect(result).toContain('"b": 2');
    });
  });

  describe('WHEN comments use CRLF', () => {
    it('SHOULD repair bare-CR remnants without introducing LF newlines', () => {
      const source = ['{', '"a": 1 // first', '# second', '// third', '}'].join('\r\n');
      const result = formatWithHjson(source, '\r\n');

      expect(result).toContain('// first');
      expect(result).toContain('# second');
      expect(result).toContain('// third');
      expect(result.replace(/\r\n/g, '').includes('\n')).toBe(false);
      expect(result.replace(/\r\n/g, '').includes('\r')).toBe(false);
    });
  });
});
