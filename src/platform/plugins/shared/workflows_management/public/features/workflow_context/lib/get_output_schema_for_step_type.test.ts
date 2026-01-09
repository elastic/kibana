/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { getOutputSchemaForStepType } from './get_output_schema_for_step_type';
import { stepSchemas } from '../../../../common/step_schemas';

describe('getOutputSchemaForStepType', () => {
  it('should return z.unknown() for elasticsearch step types', () => {
    const mockNode = {
      id: 'test-id',
      stepId: 'test-step-id',
      stepType: 'elasticsearch.search',
      type: 'atomic' as const,
      configuration: {},
    };

    const result = getOutputSchemaForStepType(mockNode);

    // Check that it's a ZodUnknown schema by testing its behavior
    expect(result.def.type).toBe('unknown');
    expect(result.safeParse('any value')).toEqual({ success: true, data: 'any value' });
    expect(result.safeParse(123)).toEqual({ success: true, data: 123 });
    expect(result.safeParse(null)).toEqual({ success: true, data: null });
  });

  it('should return z.unknown() for kibana step types', () => {
    const mockNode = {
      id: 'test-id',
      stepId: 'test-step-id',
      stepType: 'kibana.request',
      type: 'atomic' as const,
      configuration: {},
    };

    const result = getOutputSchemaForStepType(mockNode);

    // Check that it's a ZodUnknown schema by testing its behavior
    expect(result.def.type).toBe('unknown');
    expect(result.safeParse('any value')).toEqual({ success: true, data: 'any value' });
  });

  it('should return z.unknown() for unknown step types', () => {
    const mockNode = {
      id: 'test-id',
      stepId: 'test-step-id',
      stepType: 'unknown-step-type',
      type: 'atomic' as const,
      configuration: {},
    };

    const result = getOutputSchemaForStepType(mockNode);

    // Check that it's a ZodUnknown schema by testing its behavior
    expect(result.def.type).toBe('unknown');
    expect(result.safeParse(undefined)).toEqual({ success: true, data: undefined });
  });

  it('should return z.unknown() for node with empty stepType', () => {
    const mockNode = {
      id: 'test-id',
      stepId: 'test-step-id',
      stepType: '',
      type: 'atomic' as const,
      configuration: {},
    };

    const result = getOutputSchemaForStepType(mockNode);

    // Check that it's a ZodUnknown schema by testing its behavior
    expect(result.def.type).toBe('unknown');
    expect(result.safeParse({})).toEqual({ success: true, data: {} });
  });

  it.each([
    'elasticsearch.indices.exists',
    'elasticsearch.indices.delete',
    'elasticsearch.index',
    'elasticsearch.search',
    'elasticsearch.bulk',
  ])('should handle %s node', (testCase) => {
    const mockNode = {
      id: 'test-id',
      stepId: 'test-step-id',
      stepType: testCase,
      type: 'atomic' as const,
      configuration: {},
    };
    const result = getOutputSchemaForStepType(mockNode);
    expect(result.def.type).toBe('unknown');
  });

  it.each(['kibana.request', 'kibana.dashboard', 'kibana.visualizations', 'kibana.data_views'])(
    'should handle %s node',
    (testCase) => {
      const mockNode = {
        id: 'test-id',
        stepId: 'test-step-id',
        stepType: testCase,
        type: 'atomic' as const,
        configuration: {},
      };
      const result = getOutputSchemaForStepType(mockNode);
      expect(result.def.type).toBe('unknown');
    }
  );

  it('should validate that returned schema is a Zod schema', () => {
    const mockNode = {
      id: 'test-id',
      stepId: 'test-step-id',
      stepType: 'test-step',
      type: 'atomic' as const,
      configuration: {},
    };

    const result = getOutputSchemaForStepType(mockNode);

    // Verify it's a Zod schema by checking for the def property
    expect(result).toHaveProperty('def');
    expect(typeof result.parse).toBe('function');
    expect(typeof result.safeParse).toBe('function');
  });

  it('should handle nodes with configuration objects', () => {
    const mockNode = {
      id: 'test-id',
      stepId: 'test-step-id',
      stepType: 'test-step',
      type: 'atomic' as const,
      configuration: {
        with: { param: 'value' },
      },
    };

    const result = getOutputSchemaForStepType(mockNode);

    expect(result.def.type).toBe('unknown');
  });

  it('should handle nodes with null configuration', () => {
    const mockNode = {
      id: 'test-id',
      stepId: 'test-step-id',
      stepType: 'test-step',
      type: 'atomic' as const,
      configuration: null,
    };

    const result = getOutputSchemaForStepType(mockNode);

    expect(result.def.type).toBe('unknown');
  });

  it('should handle custom connector step types', () => {
    const customStepTypes = ['slack', 'email', 'webhook', 'custom-connector'];

    customStepTypes.forEach((stepType) => {
      const mockNode = {
        id: 'test-id',
        stepId: 'test-step-id',
        stepType,
        type: 'atomic' as const,
        configuration: {},
      };
      const result = getOutputSchemaForStepType(mockNode);
      expect(result.def.type).toBe('unknown');
    });
  });

  it('should handle atomic node type specifically', () => {
    const mockNode = {
      id: 'test-id',
      stepId: 'test-step-id',
      stepType: 'test-step',
      type: 'atomic' as const,
      configuration: {},
    };

    const result = getOutputSchemaForStepType(mockNode);
    expect(result.def.type).toBe('unknown');
  });

  describe('custom steps output schemas', () => {
    let originalGetStepDefinition: typeof stepSchemas.getStepDefinition;
    let originalIsPublicStepDefinition: typeof stepSchemas.isPublicStepDefinition;

    let mockStepDefinition: Partial<PublicStepDefinition>;

    beforeEach(() => {
      originalGetStepDefinition = stepSchemas.getStepDefinition;
      originalIsPublicStepDefinition = stepSchemas.isPublicStepDefinition;
      stepSchemas.getStepDefinition = jest.fn().mockImplementation(() => mockStepDefinition);
      (stepSchemas.isPublicStepDefinition as unknown as jest.Mock) = jest
        .fn()
        .mockReturnValue(true);
    });

    afterEach(() => {
      stepSchemas.getStepDefinition = originalGetStepDefinition;
      stepSchemas.isPublicStepDefinition = originalIsPublicStepDefinition;
    });

    it('should use getOutputSchema when available and return its result', () => {
      const mockDynamicSchema = {
        def: { type: 'string' },
        safeParse: (val: any) => ({ success: true, data: String(val) }),
      } as any;

      mockStepDefinition = {
        id: 'dynamic-step',
        inputSchema: {} as any,
        outputSchema: { def: { type: 'unknown' } } as any,
        editorHandlers: {
          dynamicSchema: {
            getOutputSchema: jest.fn().mockReturnValue(mockDynamicSchema),
          },
        },
      };

      const mockNode = {
        id: 'test-id',
        stepId: 'test-step-id',
        stepType: 'dynamic-step',
        type: 'atomic' as const,
        configuration: {
          with: {
            customParam: 'dynamicValue',
          },
        },
      };

      const result = getOutputSchemaForStepType(mockNode);

      // Should call getOutputSchema with configuration.with
      expect(
        mockStepDefinition?.editorHandlers?.dynamicSchema?.getOutputSchema
      ).toHaveBeenCalledWith({
        input: {
          customParam: 'dynamicValue',
        },
        config: mockNode.configuration,
      });

      // Should return the dynamic schema
      expect(result).toBe(mockDynamicSchema);
      expect(result.def.type).toBe('string');
    });

    it('should fallback to static outputSchema when getOutputSchema throws an error', () => {
      const mockStaticSchema = {
        def: { type: 'object' },
        safeParse: (val: any) => ({ success: true, data: val }),
      } as any;

      mockStepDefinition = {
        id: 'error-step',
        inputSchema: {} as any,
        outputSchema: mockStaticSchema,
        editorHandlers: {
          dynamicSchema: {
            getOutputSchema: jest.fn().mockImplementation(() => {
              throw new Error('Dynamic schema generation failed');
            }),
          },
        },
      };

      const mockNode = {
        id: 'test-id',
        stepId: 'test-step-id',
        stepType: 'error-step',
        type: 'atomic' as const,
        configuration: {
          with: { param: 'value' },
        },
      };

      const result = getOutputSchemaForStepType(mockNode);

      // Should call getOutputSchema first
      expect(mockStepDefinition.editorHandlers?.dynamicSchema.getOutputSchema).toHaveBeenCalledWith(
        {
          input: {
            param: 'value',
          },
          config: mockNode.configuration,
        }
      );

      // Should fallback to static schema when dynamic throws
      expect(result).toBe(mockStaticSchema);
      expect(result.def.type).toBe('object');
    });

    it('should use static outputSchema when getOutputSchema is not defined', () => {
      const mockStaticSchema = {
        def: { type: 'array' },
        safeParse: (val: any) => ({ success: true, data: val }),
      } as any;

      mockStepDefinition = {
        id: 'static-step',
        inputSchema: {} as any,
        outputSchema: mockStaticSchema,
        // no getOutputSchema property
      };

      const mockNode = {
        id: 'test-id',
        stepId: 'test-step-id',
        stepType: 'static-step',
        type: 'atomic' as const,
        configuration: {
          with: { param: 'value' },
        },
      };

      const result = getOutputSchemaForStepType(mockNode);

      // Should return the static schema directly
      expect(result).toBe(mockStaticSchema);
      expect(result.def.type).toBe('array');
    });
  });
});
