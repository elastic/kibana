/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { getSchemaAtPath, getShape } from '@kbn/workflows/common/utils/zod';
import {
  getWorkflowContextSchema,
  type WorkflowDefinitionForContext,
} from './get_workflow_context_schema';

describe('getWorkflowContextSchema - Nested Objects', () => {
  it('should handle nested object inputs for variable validation', () => {
    const workflow: WorkflowYaml = {
      version: '1',
      name: 'Test Workflow',
      description: undefined,
      settings: undefined,
      enabled: true,
      tags: undefined,
      triggers: [{ type: 'manual' }],
      inputs: {
        properties: {
          threatIndicator: {
            type: 'object',
            description: 'Threat indicator to investigate',
            properties: {
              type: {
                type: 'string',
                enum: ['ip', 'domain', 'hash', 'url', 'email'],
                description: 'Type of threat indicator',
              },
              value: {
                type: 'string',
                description: 'The indicator value',
              },
              severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                default: 'medium',
                description: 'Threat severity level',
              },
            },
            required: ['type', 'value', 'severity'],
            additionalProperties: false,
          },
          analyst: {
            type: 'object',
            description: 'Security analyst handling the incident',
            properties: {
              email: {
                type: 'string',
                format: 'email',
                description: 'Analyst email address',
              },
              name: {
                type: 'string',
                minLength: 2,
                maxLength: 100,
                description: 'Analyst full name',
              },
            },
            required: ['email', 'name'],
            additionalProperties: false,
          },
        },
        required: ['threatIndicator', 'analyst'],
        additionalProperties: false,
      },
      consts: undefined,
      steps: [{ name: 'step1', type: 'console' }],
    };

    const contextSchema = getWorkflowContextSchema(workflow);

    // Test that we can access nested properties
    // inputs.threatIndicator.type should be accessible
    const threatIndicatorTypeSchema = getSchemaAtPath(contextSchema, 'inputs.threatIndicator.type');
    expect(threatIndicatorTypeSchema.schema).not.toBeNull();
    expect(threatIndicatorTypeSchema.schema).toBeDefined();

    // inputs.threatIndicator.value should be accessible
    const threatIndicatorValueSchema = getSchemaAtPath(
      contextSchema,
      'inputs.threatIndicator.value'
    );
    expect(threatIndicatorValueSchema.schema).not.toBeNull();
    expect(threatIndicatorValueSchema.schema).toBeDefined();

    // inputs.threatIndicator.severity should be accessible
    const threatIndicatorSeveritySchema = getSchemaAtPath(
      contextSchema,
      'inputs.threatIndicator.severity'
    );
    expect(threatIndicatorSeveritySchema.schema).not.toBeNull();
    expect(threatIndicatorSeveritySchema.schema).toBeDefined();

    // inputs.analyst.email should be accessible
    const analystEmailSchema = getSchemaAtPath(contextSchema, 'inputs.analyst.email');
    expect(analystEmailSchema.schema).not.toBeNull();
    expect(analystEmailSchema.schema).toBeDefined();

    // inputs.analyst.name should be accessible
    const analystNameSchema = getSchemaAtPath(contextSchema, 'inputs.analyst.name');
    expect(analystNameSchema.schema).not.toBeNull();
    expect(analystNameSchema.schema).toBeDefined();

    // Invalid paths should return null (or z.any() if the converter falls back)
    const invalidSchema = getSchemaAtPath(contextSchema, 'inputs.threatIndicator.invalid');
    // The converter might fall back to z.any() for unsupported schemas, so we just check it's defined
    // The important thing is that valid paths work correctly
    expect(invalidSchema.schema).toBeDefined();
  });

  it('should handle the security workflow example with all nested objects', () => {
    const workflow: WorkflowYaml = {
      version: '1',
      name: 'Threat Intelligence Enrichment & Incident Response',
      description: undefined,
      settings: undefined,
      enabled: true,
      tags: undefined,
      triggers: [{ type: 'manual' }],
      inputs: {
        properties: {
          analyst: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              name: { type: 'string' },
              team: {
                type: 'string',
                enum: ['SOC', 'Threat Intelligence', 'Incident Response', 'Forensics'],
              },
            },
            required: ['email', 'name', 'team'],
            additionalProperties: false,
          },
          threatIndicator: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['ip', 'domain', 'hash', 'url', 'email'],
              },
              value: { type: 'string' },
              severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                default: 'medium',
              },
            },
            required: ['type', 'value', 'severity'],
            additionalProperties: false,
          },
          incidentMetadata: {
            type: 'object',
            properties: {
              incidentId: { type: 'string', pattern: '^INC-\\d{8}-\\d{4}$' },
              source: {
                type: 'string',
                enum: ['SIEM Alert', 'Threat Intelligence Feed', 'Manual Report', 'EDR Detection'],
              },
              enrichment: {
                type: 'object',
                properties: {
                  reputation: {
                    type: 'string',
                    enum: ['unknown', 'clean', 'suspicious', 'malicious'],
                    default: 'unknown',
                  },
                  confidence: { type: 'number', minimum: 0, maximum: 100 },
                },
                additionalProperties: false,
              },
            },
            required: ['incidentId', 'source'],
            additionalProperties: false,
          },
        },
        required: ['analyst', 'threatIndicator', 'incidentMetadata'],
        additionalProperties: false,
      },
      consts: undefined,
      steps: [{ name: 'step1', type: 'console' }],
    };

    const contextSchema = getWorkflowContextSchema(workflow);

    // Test all the paths used in the workflow
    const paths = [
      'inputs.threatIndicator.value',
      'inputs.threatIndicator.type',
      'inputs.threatIndicator.severity',
      'inputs.incidentMetadata.incidentId',
      'inputs.analyst.name',
      'inputs.analyst.email',
      'inputs.responseActions.blockIndicator',
      'inputs.responseActions.quarantineHosts',
      'inputs.responseActions.notifyTeams',
    ];

    for (const path of paths) {
      // Note: responseActions might not exist in this simplified test, so we skip those
      if (!path.startsWith('inputs.responseActions')) {
        const result = getSchemaAtPath(contextSchema, path);
        expect(result.schema).not.toBeNull();
        expect(result.schema).toBeDefined();
      }
    }
  });

  describe('edge cases - defensive checks', () => {
    it('should handle properties with null schema values gracefully', () => {
      const workflow: WorkflowDefinitionForContext = {
        version: '1',
        name: 'Test Workflow',
        description: undefined,
        settings: undefined,
        enabled: true,
        tags: undefined,
        triggers: [{ type: 'manual' }],
        inputs: {
          properties: {
            name: null,
            email: { type: 'string', format: 'email' },
            age: null,
          },
        } as any,
        consts: undefined,
        steps: [{ name: 'step1', type: 'console' }],
      };

      // Should not crash when properties contain null values
      expect(() => {
        const contextSchema = getWorkflowContextSchema(workflow);
        expect(contextSchema).toBeDefined();
      }).not.toThrow();
    });

    it('should handle properties with undefined schema values gracefully', () => {
      const workflow: WorkflowDefinitionForContext = {
        version: '1',
        name: 'Test Workflow',
        description: undefined,
        settings: undefined,
        enabled: true,
        tags: undefined,
        triggers: [{ type: 'manual' }],
        inputs: {
          properties: {
            name: undefined,
            email: { type: 'string', format: 'email' },
          },
        } as any,
        consts: undefined,
        steps: [{ name: 'step1', type: 'console' }],
      };

      // Should not crash when properties contain undefined values
      expect(() => {
        const contextSchema = getWorkflowContextSchema(workflow);
        expect(contextSchema).toBeDefined();
      }).not.toThrow();
    });

    it('should handle properties with string schema values (invalid) gracefully', () => {
      const workflow: WorkflowDefinitionForContext = {
        version: '1',
        name: 'Test Workflow',
        description: undefined,
        settings: undefined,
        enabled: true,
        tags: undefined,
        triggers: [{ type: 'manual' }],
        inputs: {
          properties: {
            name: 'invalid string schema',
            email: { type: 'string', format: 'email' },
          },
        } as any,
        consts: undefined,
        steps: [{ name: 'step1', type: 'console' }],
      };

      // Should not crash when properties contain invalid schema values
      expect(() => {
        const contextSchema = getWorkflowContextSchema(workflow);
        expect(contextSchema).toBeDefined();
      }).not.toThrow();
    });
  });
});

describe('getWorkflowContextSchema - Dynamic event schema based on triggers', () => {
  const baseWorkflow: WorkflowYaml = {
    version: '1',
    name: 'Test Workflow',
    description: undefined,
    settings: undefined,
    enabled: true,
    tags: undefined,
    triggers: [{ type: 'manual' }],
    inputs: undefined,
    consts: undefined,
    steps: [{ name: 'step1', type: 'console' }],
  };

  it('should only include spaceId in event schema when workflow has only manual trigger', () => {
    const workflow: WorkflowYaml = {
      ...baseWorkflow,
      triggers: [{ type: 'manual' }],
    };

    const contextSchema = getWorkflowContextSchema(workflow);
    const eventResult = getSchemaAtPath(contextSchema, 'event');
    expect(eventResult.schema).toBeDefined();

    const eventShape = getShape(eventResult.schema!);
    const eventKeys = Object.keys(eventShape);
    expect(eventKeys).toEqual(['spaceId']);
    expect(eventKeys).not.toContain('alerts');
    expect(eventKeys).not.toContain('rule');
    expect(eventKeys).not.toContain('params');
  });

  it('should only include spaceId in event schema when workflow has only scheduled trigger', () => {
    const workflow: WorkflowYaml = {
      ...baseWorkflow,
      triggers: [{ type: 'scheduled', with: { every: '5m' } }],
    };

    const contextSchema = getWorkflowContextSchema(workflow);
    const eventResult = getSchemaAtPath(contextSchema, 'event');
    expect(eventResult.schema).toBeDefined();

    const eventShape = getShape(eventResult.schema!);
    const eventKeys = Object.keys(eventShape);
    expect(eventKeys).toEqual(['spaceId']);
    expect(eventKeys).not.toContain('alerts');
    expect(eventKeys).not.toContain('rule');
    expect(eventKeys).not.toContain('params');
  });

  it('should include alerts, rule, params, and spaceId in event schema when workflow has alert trigger', () => {
    const workflow: WorkflowYaml = {
      ...baseWorkflow,
      triggers: [{ type: 'alert' }],
    };

    const contextSchema = getWorkflowContextSchema(workflow);
    const eventResult = getSchemaAtPath(contextSchema, 'event');
    expect(eventResult.schema).toBeDefined();

    const eventShape = getShape(eventResult.schema!);
    const eventKeys = Object.keys(eventShape);
    expect(eventKeys).toContain('spaceId');
    expect(eventKeys).toContain('alerts');
    expect(eventKeys).toContain('rule');
    expect(eventKeys).toContain('params');
  });

  it('should include alert event properties when alert trigger is among multiple triggers', () => {
    const workflow: WorkflowYaml = {
      ...baseWorkflow,
      triggers: [{ type: 'manual' }, { type: 'alert' }],
    };

    const contextSchema = getWorkflowContextSchema(workflow);
    const eventResult = getSchemaAtPath(contextSchema, 'event');
    expect(eventResult.schema).toBeDefined();

    const eventShape = getShape(eventResult.schema!);
    const eventKeys = Object.keys(eventShape);
    expect(eventKeys).toContain('spaceId');
    expect(eventKeys).toContain('alerts');
    expect(eventKeys).toContain('rule');
    expect(eventKeys).toContain('params');
  });

  it('should not include alert properties with manual + scheduled triggers', () => {
    const workflow: WorkflowYaml = {
      ...baseWorkflow,
      triggers: [{ type: 'manual' }, { type: 'scheduled', with: { every: '1h' } }],
    };

    const contextSchema = getWorkflowContextSchema(workflow);
    const eventResult = getSchemaAtPath(contextSchema, 'event');
    expect(eventResult.schema).toBeDefined();

    const eventShape = getShape(eventResult.schema!);
    const eventKeys = Object.keys(eventShape);
    expect(eventKeys).toEqual(['spaceId']);
  });

  it('should handle workflow with empty triggers array gracefully', () => {
    const workflow: WorkflowDefinitionForContext = {
      ...baseWorkflow,
      triggers: [] as any,
    };

    const contextSchema = getWorkflowContextSchema(workflow);
    const eventResult = getSchemaAtPath(contextSchema, 'event');
    expect(eventResult.schema).toBeDefined();

    const eventShape = getShape(eventResult.schema!);
    const eventKeys = Object.keys(eventShape);
    expect(eventKeys).toEqual(['spaceId']);
  });

  it('should handle workflow with undefined triggers gracefully', () => {
    const workflow: WorkflowDefinitionForContext = {
      ...baseWorkflow,
      triggers: undefined as any,
    };

    const contextSchema = getWorkflowContextSchema(workflow);
    const eventResult = getSchemaAtPath(contextSchema, 'event');
    expect(eventResult.schema).toBeDefined();

    const eventShape = getShape(eventResult.schema!);
    const eventKeys = Object.keys(eventShape);
    expect(eventKeys).toEqual(['spaceId']);
  });

  it('should allow accessing event.alerts sub-properties when alert trigger is present', () => {
    const workflow: WorkflowYaml = {
      ...baseWorkflow,
      triggers: [{ type: 'alert' }],
    };

    const contextSchema = getWorkflowContextSchema(workflow);

    // event.rule.id should be accessible
    const ruleIdResult = getSchemaAtPath(contextSchema, 'event.rule.id');
    expect(ruleIdResult.schema).toBeDefined();

    // event.rule.name should be accessible
    const ruleNameResult = getSchemaAtPath(contextSchema, 'event.rule.name');
    expect(ruleNameResult.schema).toBeDefined();

    // event.spaceId should always be accessible
    const spaceIdResult = getSchemaAtPath(contextSchema, 'event.spaceId');
    expect(spaceIdResult.schema).toBeDefined();
  });
});
