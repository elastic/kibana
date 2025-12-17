/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { parseToolResultJsonContent, extractToolResultTextContent } from './test_utils';

describe('test_utils', () => {
  describe('parseToolResultJsonContent', () => {
    it('parses valid JSON content', () => {
      const result: CallToolResult = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ key: 'value', number: 123 }),
          },
        ],
      };

      const parsed = parseToolResultJsonContent(result);
      expect(parsed).toEqual({ key: 'value', number: 123 });
    });

    it('throws error when content is empty', () => {
      const result: CallToolResult = {
        content: [],
      };

      expect(() => parseToolResultJsonContent(result)).toThrow('Tool result has no content');
    });

    it('throws error when content is undefined', () => {
      const result: CallToolResult = {
        content: undefined as any,
      };

      expect(() => parseToolResultJsonContent(result)).toThrow('Tool result has no content');
    });

    it('throws error when content type is not text', () => {
      const result: CallToolResult = {
        content: [
          {
            type: 'image',
            data: 'base64data',
            mimeType: 'image/png',
          } as any,
        ],
      };

      expect(() => parseToolResultJsonContent(result)).toThrow("Expected content type 'text'");
    });

    it('throws error when text property is missing', () => {
      const result: CallToolResult = {
        content: [
          {
            type: 'text',
          } as any,
        ],
      };

      expect(() => parseToolResultJsonContent(result)).toThrow(
        'Content does not have text property or text is not a string'
      );
    });

    it('throws error when text is not a string', () => {
      const result: CallToolResult = {
        content: [
          {
            type: 'text',
            text: 123 as any,
          },
        ],
      };

      expect(() => parseToolResultJsonContent(result)).toThrow(
        'Content does not have text property or text is not a string'
      );
    });

    it('throws error when JSON is invalid', () => {
      const result: CallToolResult = {
        content: [
          {
            type: 'text',
            text: '{ invalid json }',
          },
        ],
      };

      expect(() => parseToolResultJsonContent(result)).toThrow('Failed to parse JSON content');
    });

    it('includes error message in JSON parse error', () => {
      const result: CallToolResult = {
        content: [
          {
            type: 'text',
            text: '{ invalid json }',
          },
        ],
      };

      try {
        parseToolResultJsonContent(result);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Failed to parse JSON content');
      }
    });

    it('handles non-Error objects in JSON parse catch', () => {
      const result: CallToolResult = {
        content: [
          {
            type: 'text',
            text: '{ invalid json }',
          },
        ],
      };

      // Mock JSON.parse to throw a non-Error object
      const originalParse = JSON.parse;
      JSON.parse = jest.fn(() => {
        throw new Error('string error');
      });

      try {
        expect(() => parseToolResultJsonContent(result)).toThrow();
      } finally {
        JSON.parse = originalParse;
      }
    });
  });

  describe('extractToolResultTextContent', () => {
    it('extracts text content correctly', () => {
      const result: CallToolResult = {
        content: [
          {
            type: 'text',
            text: 'Simple text content',
          },
        ],
      };

      const text = extractToolResultTextContent(result);
      expect(text).toBe('Simple text content');
    });

    it('throws error when content is empty', () => {
      const result: CallToolResult = {
        content: [],
      };

      expect(() => extractToolResultTextContent(result)).toThrow('Tool result has no content');
    });

    it('throws error when content is undefined', () => {
      const result: CallToolResult = {
        content: undefined as any,
      };

      expect(() => extractToolResultTextContent(result)).toThrow('Tool result has no content');
    });

    it('throws error when content type is not text', () => {
      const result: CallToolResult = {
        content: [
          {
            type: 'image',
            data: 'base64data',
            mimeType: 'image/png',
          } as any,
        ],
      };

      expect(() => extractToolResultTextContent(result)).toThrow("Expected content type 'text'");
    });

    it('throws error when text property is missing', () => {
      const result: CallToolResult = {
        content: [
          {
            type: 'text',
          } as any,
        ],
      };

      expect(() => extractToolResultTextContent(result)).toThrow(
        'Content does not have text property or text is not a string'
      );
    });

    it('throws error when text is not a string', () => {
      const result: CallToolResult = {
        content: [
          {
            type: 'text',
            text: 123 as any,
          },
        ],
      };

      expect(() => extractToolResultTextContent(result)).toThrow(
        'Content does not have text property or text is not a string'
      );
    });
  });
});
