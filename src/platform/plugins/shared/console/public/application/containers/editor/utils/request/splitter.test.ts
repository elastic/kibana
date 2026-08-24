/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { splitRequestDataObjects } from './splitter';

describe('request data splitter', () => {
  describe('WHEN request bodies are concatenated', () => {
    it('SHOULD split only at completed top-level objects', () => {
      expect(splitRequestDataObjects('{"a":{"b":1}}\n{"c":2}')).toEqual([
        '{"a":{"b":1}}',
        '{"c":2}',
      ]);
    });
  });

  describe('WHEN opaque values contain braces', () => {
    it.each([
      ['double-quoted strings', '{"a":"}"}\n{"b":2}', ['{"a":"}"}', '{"b":2}']],
      ['single-quoted strings', "{'a': '}'}\n{'b': 2}", ["{'a': '}'}", "{'b': 2}"]],
      [
        'triple-quoted strings',
        '{"script":"""return "}";"""}\n{"b":2}',
        ['{"script":"""return "}";"""}', '{"b":2}'],
      ],
      ['comments', '{\n// }\n"a":1\n}\n{"b":2}', ['{\n// }\n"a":1\n}', '{"b":2}']],
    ])('SHOULD ignore braces in %s', (_description, source, expected) => {
      expect(splitRequestDataObjects(source)).toEqual(expected);
    });
  });

  describe('WHEN a top-level object has a trailing comment', () => {
    it('SHOULD attach the comment to that object', () => {
      expect(splitRequestDataObjects('{"a":1} // tail\n{"b":2}')).toEqual([
        '{"a":1} // tail',
        '{"b":2}',
      ]);
    });
  });

  describe('WHEN a triple quote is unclosed', () => {
    it('SHOULD retain the source as one object', () => {
      const source = '{"script": """unclosed }\n{"next":true}';

      expect(splitRequestDataObjects(source)).toEqual([source]);
    });
  });

  describe('WHEN a block comment is unclosed', () => {
    it('SHOULD retain surrounding whitespace when the comment may require fallback', () => {
      const source = '  {"a":1} /* todo  ';

      expect(splitRequestDataObjects(source)).toEqual([source]);
    });
  });
});
