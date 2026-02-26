/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateLiquidTemplate } from './validate_liquid_template';
import type { LiquidValidationError } from '../../../../common/lib/validate_liquid_template';

jest.mock('../../../../common/lib/validate_liquid_template', () => ({
  validateLiquidTemplate: jest.fn(),
}));

import { validateLiquidTemplate as validateLiquidTemplateCommon } from '../../../../common/lib/validate_liquid_template';

const mockValidateLiquidTemplateCommon = validateLiquidTemplateCommon as jest.MockedFunction<
  typeof validateLiquidTemplateCommon
>;

describe('validateLiquidTemplate (public wrapper)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('valid templates', () => {
    it('should return empty array when common validation returns no errors', () => {
      mockValidateLiquidTemplateCommon.mockReturnValue([]);

      const result = validateLiquidTemplate('Hello {{ name }} world');
      expect(result).toEqual([]);
      expect(mockValidateLiquidTemplateCommon).toHaveBeenCalledWith('Hello {{ name }} world');
    });
  });

  describe('error transformation', () => {
    it('should transform common LiquidValidationError to YamlValidationResult', () => {
      const commonErrors: LiquidValidationError[] = [
        {
          message: 'undefined filter: unknownFilter',
          startLine: 1,
          startColumn: 16,
          endLine: 1,
          endColumn: 28,
        },
      ];
      mockValidateLiquidTemplateCommon.mockReturnValue(commonErrors);

      const result = validateLiquidTemplate('Hello {{ name | unknownFilter }} world');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'liquid-template-1-16-1-28',
        owner: 'liquid-template-validation',
        message: 'undefined filter: unknownFilter',
        startLineNumber: 1,
        startColumn: 16,
        endLineNumber: 1,
        endColumn: 28,
        severity: 'error',
        hoverMessage: 'undefined filter: unknownFilter',
      });
    });

    it('should handle multi-line errors', () => {
      const commonErrors: LiquidValidationError[] = [
        {
          message: 'tag "unknownTag" not found',
          startLine: 2,
          startColumn: 5,
          endLine: 2,
          endColumn: 15,
        },
      ];
      mockValidateLiquidTemplateCommon.mockReturnValue(commonErrors);

      const result = validateLiquidTemplate('line1\n{% unknownTag %}\nline3');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'liquid-template-2-5-2-15',
        startLineNumber: 2,
        startColumn: 5,
        endLineNumber: 2,
        endColumn: 15,
      });
    });

    it('should return empty array when no errors from common', () => {
      mockValidateLiquidTemplateCommon.mockReturnValue([]);

      const result = validateLiquidTemplate('plain text');
      expect(result).toEqual([]);
    });
  });

  describe('delegation', () => {
    it('should pass the yaml string to common validation', () => {
      mockValidateLiquidTemplateCommon.mockReturnValue([]);

      const yaml = 'some: yaml\nwith: {{ liquid }}';
      validateLiquidTemplate(yaml);

      expect(mockValidateLiquidTemplateCommon).toHaveBeenCalledWith(yaml);
    });
  });
});
