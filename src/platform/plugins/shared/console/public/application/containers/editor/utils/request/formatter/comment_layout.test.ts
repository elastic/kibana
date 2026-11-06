/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatCommentLayout } from './comment_layout';

describe('comment layout formatter', () => {
  describe('WHEN comments are standalone in the source', () => {
    it('SHOULD restore standalone placement lost by stringification', () => {
      const source = '{\n"value": []\n// note\n}';
      const stringified = '{\n  "value": [] // note\n}';

      expect(formatCommentLayout(source, stringified, '\n')).toBe(
        ['{', '  "value": []', '  // note', '}'].join('\n')
      );
    });

    it('SHOULD re-indent comment-only lines to the following code depth', () => {
      const source = '{\n"query": {\n# match all\n"match_all": {}\n}\n}';
      const stringified = '{\n  "query": {\n# match all\n    "match_all": {}\n  }\n}';

      expect(formatCommentLayout(source, stringified, '\n')).toBe(
        ['{', '  "query": {', '    # match all', '    "match_all": {}', '  }', '}'].join('\n')
      );
    });

    it('SHOULD preserve block-comment continuation indentation', () => {
      const source = '{\n/*\n  body\n*/\n"a": 1\n}';
      const stringified = '{\n/*\n  body\n*/\n  "a": 1\n}';

      expect(formatCommentLayout(source, stringified, '\n')).toBe(
        ['{', '  /*', '  body', '*/', '  "a": 1', '}'].join('\n')
      );
    });
  });

  describe('WHEN stringification changes the comment count', () => {
    it('SHOULD leave the stringified text unchanged', () => {
      const source = '{\n// missing\n"value": 1\n}';
      const stringified = '{\n  "value": 1\n}';

      expect(formatCommentLayout(source, stringified, '\n')).toBe(stringified);
    });
  });

  describe('WHEN the source uses CRLF', () => {
    it('SHOULD normalize stringifier and restored newlines to CRLF', () => {
      const source = ['{', '"value": []', '// note', '}'].join('\r\n');
      const stringified = '{\n  "value": [] // note\n}';
      const result = formatCommentLayout(source, stringified, '\r\n');

      expect(result).toBe(['{', '  "value": []', '  // note', '}'].join('\r\n'));
      expect(result.replace(/\r\n/g, '').includes('\n')).toBe(false);
    });
  });
});
