/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { truncateAndPreserveHighlightTags } from '.';

describe('truncateAndPreserveHighlightTags', () => {
  const MAX_LENGTH = 10;
  const SHORT_TEXT = 'short';
  const LONG_TEXT = 'Long text that needs truncation';

  describe("when there aren't <mark> tags", () => {
    describe('and text is shorter than maxLength', () => {
      const result = truncateAndPreserveHighlightTags(SHORT_TEXT, MAX_LENGTH);

      it('should return the original string', () => {
        expect(result).toBe(SHORT_TEXT);
      });
    });

    describe('and text is longer than or equal to maxLength', () => {
      const result = truncateAndPreserveHighlightTags(LONG_TEXT, MAX_LENGTH);

      it('should truncate the middle of a long string ', () => {
        expect(result).toBe('Long ...ation');
      });
    });
  });

  describe('when there are <mark> tags', () => {
    describe('and text is shorter than maxLength', () => {
      const result = truncateAndPreserveHighlightTags(`<mark>${SHORT_TEXT}</mark>`, MAX_LENGTH);

      it('should return the original string with the tags', () => {
        expect(result).toBe(`<mark>${SHORT_TEXT}</mark>`);
      });
    });

    describe('and text is longer than or equal to maxLength', () => {
      const result = truncateAndPreserveHighlightTags(`<mark>${LONG_TEXT}</mark>`, MAX_LENGTH);

      it('should truncate the middle of a long string and add the tags ', () => {
        expect(result).toBe('<mark>Long ...ation</mark>');
      });
    });
  });
});
