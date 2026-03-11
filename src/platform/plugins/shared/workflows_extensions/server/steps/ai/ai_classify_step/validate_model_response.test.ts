/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionError } from '@kbn/workflows/server';
import { validateModelResponse } from './validate_model_response';

describe('validateModelResponse', () => {
  const responseMetadata = {
    modelId: 'test-model',
    timestamp: Date.now(),
  };

  describe('category validation', () => {
    it('should accept a category that matches expected categories', () => {
      const modelResponse = {
        category: 'category1',
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2'],
          fallbackCategory: undefined,
          responseMetadata,
        });
      }).not.toThrow();
    });

    it('should accept multiple categories that all match expected categories', () => {
      const modelResponse = {
        categories: ['category1', 'category2'],
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,

          expectedCategories: ['category1', 'category2', 'category3'],
          fallbackCategory: undefined,
          responseMetadata,
        });
      }).not.toThrow();
    });

    it('should accept a category that matches fallback category', () => {
      const modelResponse = {
        category: 'fallback',
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2'],
          fallbackCategory: 'fallback',
          responseMetadata,
        });
      }).not.toThrow();
    });

    it('should accept categories when one matches expected and one matches fallback', () => {
      const modelResponse = {
        categories: ['category1', 'fallback'],
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2'],
          fallbackCategory: 'fallback',
          responseMetadata,
        });
      }).not.toThrow();
    });

    it('should throw UnexpectedCategories error when category does not match expected categories', () => {
      const modelResponse = {
        category: 'unexpected',
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2'],
          fallbackCategory: undefined,
          responseMetadata,
        });
      }).toThrow(ExecutionError);

      try {
        validateModelResponse({
          modelResponse,

          expectedCategories: ['category1', 'category2'],
          fallbackCategory: undefined,
          responseMetadata,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).type).toBe('UnexpectedCategories');
        expect((error as ExecutionError).message).toBe('Model returned unexpected categories.');
        expect((error as ExecutionError).details).toMatchObject({
          modelResponse,
          metadata: responseMetadata,
        });
      }
    });

    it('should throw UnexpectedCategories error when one of multiple categories is unexpected', () => {
      const modelResponse = {
        categories: ['category1', 'unexpected'],
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2'],
          fallbackCategory: undefined,
          responseMetadata,
        });
      }).toThrow(ExecutionError);

      try {
        validateModelResponse({
          modelResponse,

          expectedCategories: ['category1', 'category2'],
          fallbackCategory: undefined,
          responseMetadata,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).type).toBe('UnexpectedCategories');
      }
    });

    it('should throw UnexpectedCategories error when all categories are unexpected', () => {
      const modelResponse = {
        categories: ['unexpected1', 'unexpected2'],
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2'],
          fallbackCategory: undefined,
          responseMetadata,
        });
      }).toThrow(ExecutionError);
    });

    it('should throw UnexpectedCategories error when category does not match expected or fallback', () => {
      const modelResponse = {
        category: 'unexpected',
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2'],
          fallbackCategory: 'fallback',
          responseMetadata,
        });
      }).toThrow(ExecutionError);
    });
  });

  describe('edge cases', () => {
    it('should handle empty expectedCategories array when fallbackCategory is provided', () => {
      const modelResponse = {
        category: 'fallback',
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: [],
          fallbackCategory: 'fallback',
          responseMetadata,
        });
      }).not.toThrow();
    });

    it('should handle response with both category and categories fields (prioritize categories)', () => {
      const modelResponse = {
        category: 'category1',
        categories: ['category2', 'category3'],
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2', 'category3'],
          fallbackCategory: undefined,
          responseMetadata,
        });
      }).not.toThrow();
    });

    it('should handle response with empty categories array by falling back to category field', () => {
      const modelResponse = {
        category: 'category1',
        categories: [],
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2'],
          fallbackCategory: undefined,
          responseMetadata,
        });
      }).not.toThrow();
    });

    it('should handle response with single category in categories array', () => {
      const modelResponse = {
        categories: ['category1'],
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2'],
          fallbackCategory: undefined,
          responseMetadata,
        });
      }).not.toThrow();
    });

    it('should handle response with additional metadata fields', () => {
      const modelResponse = {
        category: 'category1',
        metadata: {
          confidence: 0.95,
          processingTime: 123,
          additionalInfo: 'test',
        },
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2'],
          fallbackCategory: undefined,
          responseMetadata,
        });
      }).not.toThrow();
    });

    it('should handle undefined fallbackCategory', () => {
      const modelResponse = {
        category: 'category1',
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2'],
          fallbackCategory: undefined,
          responseMetadata,
        });
      }).not.toThrow();
    });

    it('should handle empty responseMetadata', () => {
      const modelResponse = {
        category: 'category1',
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2'],
          fallbackCategory: undefined,
          responseMetadata: {},
        });
      }).not.toThrow();
    });

    it('should preserve responseMetadata in error details', () => {
      const customMetadata = {
        customField: 'customValue',
        timestamp: Date.now(),
      };

      const modelResponse = {
        category: 'unexpected',
        metadata: {},
      };

      try {
        validateModelResponse({
          modelResponse,

          expectedCategories: ['category1', 'category2'],
          fallbackCategory: undefined,
          responseMetadata: customMetadata,
        });
      } catch (error) {
        expect((error as ExecutionError).details?.metadata).toEqual(customMetadata);
      }
    });
  });

  describe('case sensitivity', () => {
    it('should treat category names as case-sensitive', () => {
      const modelResponse = {
        category: 'Category1',
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2'],
          fallbackCategory: undefined,
          responseMetadata,
        });
      }).toThrow(ExecutionError);

      try {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2'],
          fallbackCategory: undefined,
          responseMetadata,
        });
      } catch (error) {
        expect((error as ExecutionError).type).toBe('UnexpectedCategories');
      }
    });

    it('should match exact category names including whitespace', () => {
      const modelResponse = {
        category: 'category 1',
        metadata: {},
      };

      expect(() => {
        validateModelResponse({
          modelResponse,
          expectedCategories: ['category1', 'category2'],
          fallbackCategory: undefined,
          responseMetadata,
        });
      }).toThrow(ExecutionError);
    });
  });
});
