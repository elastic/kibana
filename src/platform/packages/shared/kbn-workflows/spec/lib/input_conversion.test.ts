/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import {
  applyInputDefaults,
  convertLegacyInputsToJsonSchema,
  normalizeInputsToJsonSchema,
} from './input_conversion';
import type { WorkflowInputSchema } from '../schema';

describe('convertLegacyInputsToJsonSchema', () => {
  it('should convert array of legacy inputs to JSON Schema object format', () => {
    const legacyInputs = [
      {
        name: 'username',
        type: 'string' as const,
        description: 'User name',
        required: true,
        default: 'john',
      },
      {
        name: 'age',
        type: 'number' as const,
        default: 25,
      },
    ];

    const result = convertLegacyInputsToJsonSchema(
      legacyInputs as Array<z.infer<typeof WorkflowInputSchema>>
    );

    expect(result).toEqual({
      properties: {
        username: {
          type: 'string',
          description: 'User name',
          default: 'john',
        },
        age: {
          type: 'number',
          default: 25,
        },
      },
      required: ['username'],
      additionalProperties: false,
    });
  });

  it('should convert choice input to enum', () => {
    const legacyInputs = [
      {
        name: 'status',
        type: 'choice' as const,
        options: ['active', 'inactive'],
        required: true,
      },
    ];

    const result = convertLegacyInputsToJsonSchema(
      legacyInputs as Array<z.infer<typeof WorkflowInputSchema>>
    );

    expect(result.properties?.status).toEqual({
      type: 'string',
      enum: ['active', 'inactive'],
    });
    expect(result.required).toEqual(['status']);
  });

  it('should convert array input with constraints', () => {
    const legacyInputs = [
      {
        name: 'tags',
        type: 'array' as const,
        minItems: 1,
        maxItems: 10,
      },
    ];

    const result = convertLegacyInputsToJsonSchema(
      legacyInputs as Array<z.infer<typeof WorkflowInputSchema>>
    );

    expect(result.properties?.tags).toEqual({
      type: 'array',
      items: {
        anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
      },
      minItems: 1,
      maxItems: 10,
    });
  });

  it('should handle empty array', () => {
    const result = convertLegacyInputsToJsonSchema([]);
    expect(result).toEqual({
      properties: {},
      additionalProperties: false,
    });
  });

  it('should not include required array if no inputs are required', () => {
    const legacyInputs = [
      {
        name: 'optional',
        type: 'string' as const,
        required: false,
      },
    ];

    const result = convertLegacyInputsToJsonSchema(
      legacyInputs as Array<z.infer<typeof WorkflowInputSchema>>
    );

    expect(result.required).toBeUndefined();
  });

  it('should handle array with null items (partial YAML parsing)', () => {
    const legacyInputs = [
      {
        name: 'username',
        type: 'string' as const,
        required: true,
      },
      null,
      undefined,
      {
        name: 'age',
        type: 'number' as const,
      },
    ];

    const result = convertLegacyInputsToJsonSchema(legacyInputs as any);

    expect(result.properties?.username).toEqual({ type: 'string' });
    expect(result.properties?.age).toEqual({ type: 'number' });
    expect(result.required).toEqual(['username']);
    // Should not crash and should only process valid inputs
    expect(Object.keys(result.properties || {})).toEqual(['username', 'age']);
  });
});

describe('normalizeInputsToJsonSchema', () => {
  it('should return new format inputs as-is', () => {
    const inputs = {
      properties: {
        username: {
          type: 'string',
          description: 'User name',
        },
      },
      required: ['username'],
      additionalProperties: false,
    };

    const result = normalizeInputsToJsonSchema(inputs);
    expect(result).toEqual(inputs);
  });

  it('should convert legacy array format to new format', () => {
    const legacyInputs = [
      {
        name: 'username',
        type: 'string' as const,
        required: true,
      },
    ];

    const result = normalizeInputsToJsonSchema(legacyInputs as any);

    expect(result?.properties?.username).toEqual({
      type: 'string',
    });
    expect(result?.required).toEqual(['username']);
  });

  it('should return undefined for undefined input', () => {
    const result = normalizeInputsToJsonSchema(undefined);
    expect(result).toBeUndefined();
  });

  describe('edge cases - partially parsed YAML (defensive checks)', () => {
    it('should handle string input (partially typed "properties")', () => {
      // Simulates user typing "properties:" in YAML editor
      const result = normalizeInputsToJsonSchema('properties' as any);
      expect(result).toBeUndefined();
    });

    it('should handle number input', () => {
      const result = normalizeInputsToJsonSchema(123 as any);
      expect(result).toBeUndefined();
    });

    it('should handle boolean input', () => {
      const result = normalizeInputsToJsonSchema(true as any);
      expect(result).toBeUndefined();
    });

    it('should handle null input', () => {
      const result = normalizeInputsToJsonSchema(null as any);
      expect(result).toBeUndefined();
    });

    it('should handle empty string input', () => {
      const result = normalizeInputsToJsonSchema('' as any);
      expect(result).toBeUndefined();
    });

    it('should handle object without properties key', () => {
      const result = normalizeInputsToJsonSchema({ foo: 'bar' } as any);
      expect(result).toBeUndefined();
    });

    it('should handle object with null properties', () => {
      const result = normalizeInputsToJsonSchema({ properties: null } as any);
      expect(result).toBeUndefined();
    });

    it('should handle object with string properties', () => {
      const result = normalizeInputsToJsonSchema({ properties: 'invalid' } as any);
      expect(result).toBeUndefined();
    });

    it('should handle object with array properties (invalid)', () => {
      const result = normalizeInputsToJsonSchema({ properties: [] } as any);
      // Should return undefined or handle gracefully (array is not valid properties)
      expect(result).toBeUndefined();
    });

    it('should handle object with properties containing null values', () => {
      const result = normalizeInputsToJsonSchema({
        properties: {
          name: null,
          age: { type: 'number' },
        },
      } as any);
      // Should not crash, but may return undefined or handle gracefully
      expect(result).toBeDefined();
      expect(result?.properties?.age).toEqual({ type: 'number' });
    });

    it('should handle object with properties containing string values (invalid schema)', () => {
      const result = normalizeInputsToJsonSchema({
        properties: {
          name: 'invalid string schema',
          age: { type: 'number' },
        },
      } as any);
      // Should not crash
      expect(result).toBeDefined();
    });

    it('should handle deeply nested null values', () => {
      const result = normalizeInputsToJsonSchema({
        properties: {
          user: {
            type: 'object',
            properties: {
              name: null,
              email: { type: 'string' },
            },
          },
        },
      } as any);
      // Should not crash
      expect(result).toBeDefined();
    });
  });

  it('should handle nested object example from requirements', () => {
    const inputs = {
      properties: {
        customer: {
          type: 'object',
          description: 'Customer information',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                zipCode: { type: 'string', pattern: '^\\d{5}(-\\d{4})?$' },
              },
              required: ['street', 'city'],
              additionalProperties: false,
            },
          },
          required: ['name', 'email'],
          additionalProperties: false,
        },
      },
      required: ['customer'],
      additionalProperties: false,
    };

    const result = normalizeInputsToJsonSchema(inputs);
    expect(result).toEqual(inputs);
  });
});

describe('applyInputDefaults', () => {
  it('should apply defaults when inputs are undefined', () => {
    const inputsSchema = normalizeInputsToJsonSchema({
      properties: {
        name: { type: 'string', default: 'Default Name' },
        age: { type: 'number', default: 25 },
      },
      required: ['name'],
      additionalProperties: false,
    });

    const result = applyInputDefaults(undefined, inputsSchema);
    expect(result).toEqual({
      name: 'Default Name',
      age: 25,
    });
  });

  it('should apply defaults for missing properties', () => {
    const inputsSchema = normalizeInputsToJsonSchema({
      properties: {
        name: { type: 'string', default: 'Default Name' },
        age: { type: 'number', default: 25 },
      },
      required: ['name'],
      additionalProperties: false,
    });

    const result = applyInputDefaults({ name: 'Custom Name' }, inputsSchema);
    expect(result).toEqual({
      name: 'Custom Name',
      age: 25,
    });
  });

  it('should apply defaults for nested objects', () => {
    const inputsSchema = normalizeInputsToJsonSchema({
      properties: {
        analyst: {
          type: 'object',
          properties: {
            email: { type: 'string', default: 'analyst@security.com' },
            name: { type: 'string', default: 'Security Analyst' },
            team: { type: 'string', default: 'SOC' },
          },
          required: ['email', 'name', 'team'],
          additionalProperties: false,
        },
      },
      required: ['analyst'],
      additionalProperties: false,
    });

    const result = applyInputDefaults(undefined, inputsSchema);
    expect(result).toEqual({
      analyst: {
        email: 'analyst@security.com',
        name: 'Security Analyst',
        team: 'SOC',
      },
    });
  });

  it('should apply defaults for partial nested objects', () => {
    const inputsSchema = normalizeInputsToJsonSchema({
      properties: {
        analyst: {
          type: 'object',
          properties: {
            email: { type: 'string', default: 'analyst@security.com' },
            name: { type: 'string', default: 'Security Analyst' },
            team: { type: 'string', default: 'SOC' },
          },
          required: ['email', 'name', 'team'],
          additionalProperties: false,
        },
      },
      required: ['analyst'],
      additionalProperties: false,
    });

    const result = applyInputDefaults({ analyst: { email: 'custom@example.com' } }, inputsSchema);
    expect(result).toEqual({
      analyst: {
        email: 'custom@example.com',
        name: 'Security Analyst',
        team: 'SOC',
      },
    });
  });

  it('should apply defaults for arrays', () => {
    const inputsSchema = normalizeInputsToJsonSchema({
      properties: {
        notifyTeams: {
          type: 'array',
          items: { type: 'string' },
          default: ['SOC', 'Management'],
        },
      },
      additionalProperties: false,
    });

    const result = applyInputDefaults(undefined, inputsSchema);
    expect(result).toEqual({
      notifyTeams: ['SOC', 'Management'],
    });
  });

  it('should apply defaults for $ref references', () => {
    const inputsSchema = normalizeInputsToJsonSchema({
      properties: {
        user: {
          $ref: '#/definitions/UserSchema',
        },
      },
      required: ['user'],
      additionalProperties: false,
      definitions: {
        UserSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              default: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              default: 'john.doe@example.com',
            },
            age: {
              type: 'number',
              default: 30,
            },
          },
          required: ['name', 'email'],
          additionalProperties: false,
        },
      },
    });

    const result = applyInputDefaults(undefined, inputsSchema);
    expect(result).toEqual({
      user: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        age: 30,
      },
    });
  });

  it('should pre-fill Threat Intelligence Enrichment workflow with all defaults', () => {
    const inputsSchema = normalizeInputsToJsonSchema({
      properties: {
        analyst: {
          type: 'object',
          description: 'Security analyst handling the incident',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Analyst email address',
              default: 'analyst@security.com',
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Analyst full name',
              default: 'Security Analyst',
            },
            team: {
              type: 'string',
              enum: ['SOC', 'Threat Intelligence', 'Incident Response', 'Forensics'],
              description: 'Security team',
              default: 'SOC',
            },
          },
          required: ['email', 'name', 'team'],
          additionalProperties: false,
        },
        threatIndicator: {
          type: 'object',
          description: 'Threat indicator to investigate',
          properties: {
            type: {
              type: 'string',
              enum: ['ip', 'domain', 'hash', 'url', 'email'],
              description: 'Type of threat indicator',
              default: 'ip',
            },
            value: {
              type: 'string',
              description: 'The indicator value',
              default: '8.8.8.8',
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
        incidentMetadata: {
          type: 'object',
          description: 'Incident response metadata',
          properties: {
            incidentId: {
              type: 'string',
              pattern: '^INC-\\d{8}-\\d{4}$',
              description: 'Incident ID (format: INC-YYYYMMDD-####)',
              default: 'INC-20241118-0001',
            },
            source: {
              type: 'string',
              enum: ['SIEM Alert', 'Threat Intelligence Feed', 'Manual Report', 'EDR Detection'],
              description: 'Source of the incident',
              default: 'SIEM Alert',
            },
            enrichment: {
              type: 'object',
              description: 'Threat intelligence enrichment data',
              properties: {
                reputation: {
                  type: 'string',
                  enum: ['unknown', 'clean', 'suspicious', 'malicious'],
                  default: 'unknown',
                },
              },
              additionalProperties: false,
            },
          },
          required: ['incidentId', 'source'],
          additionalProperties: false,
        },
        responseActions: {
          type: 'object',
          description: 'Automated response actions to take',
          properties: {
            blockIndicator: {
              type: 'boolean',
              default: false,
              description: 'Block the threat indicator in firewall/IDS',
            },
            quarantineHosts: {
              type: 'boolean',
              default: false,
              description: 'Quarantine affected hosts',
            },
            createTicket: {
              type: 'boolean',
              default: true,
              description: 'Create incident response ticket',
            },
            notifyTeams: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['SOC', 'Management', 'Legal', 'Compliance'],
              },
              description: 'Teams to notify',
              default: ['SOC', 'Management'],
            },
          },
          required: ['createTicket'],
          additionalProperties: false,
        },
        priority: {
          type: 'string',
          enum: ['P1', 'P2', 'P3', 'P4'],
          default: 'P2',
          description: 'Incident priority (P1=Critical, P4=Low)',
        },
      },
      required: ['analyst', 'threatIndicator', 'incidentMetadata'],
      additionalProperties: false,
    });

    const result = applyInputDefaults(undefined, inputsSchema);

    // Verify all required fields with defaults are present
    expect(result).toBeDefined();
    expect(result).toHaveProperty('analyst');
    expect(result).toHaveProperty('threatIndicator');
    expect(result).toHaveProperty('incidentMetadata');
    expect(result).toHaveProperty('responseActions');
    expect(result).toHaveProperty('priority');

    // Verify analyst defaults
    expect(result?.analyst).toEqual({
      email: 'analyst@security.com',
      name: 'Security Analyst',
      team: 'SOC',
    });

    // Verify threatIndicator defaults
    expect(result?.threatIndicator).toEqual({
      type: 'ip',
      value: '8.8.8.8',
      severity: 'medium',
    });

    // Verify incidentMetadata defaults
    expect(result?.incidentMetadata).toEqual({
      incidentId: 'INC-20241118-0001',
      source: 'SIEM Alert',
      enrichment: {
        reputation: 'unknown',
      },
    });

    // Verify responseActions defaults
    expect(result?.responseActions).toEqual({
      blockIndicator: false,
      quarantineHosts: false,
      createTicket: true,
      notifyTeams: ['SOC', 'Management'],
    });

    // Verify priority default
    expect(result?.priority).toBe('P2');
  });

  it('should handle the security workflow example with all defaults', () => {
    const inputsSchema = normalizeInputsToJsonSchema({
      properties: {
        analyst: {
          type: 'object',
          properties: {
            email: { type: 'string', default: 'analyst@security.com' },
            name: { type: 'string', default: 'Security Analyst' },
            team: { type: 'string', default: 'SOC' },
          },
          required: ['email', 'name', 'team'],
          additionalProperties: false,
        },
        threatIndicator: {
          type: 'object',
          properties: {
            type: { type: 'string', default: 'ip' },
            value: { type: 'string', default: '192.168.1.100' },
            severity: { type: 'string', default: 'medium' },
          },
          required: ['type', 'value', 'severity'],
          additionalProperties: false,
        },
        incidentMetadata: {
          type: 'object',
          properties: {
            incidentId: { type: 'string', default: 'INC-20241118-0001' },
            source: { type: 'string', default: 'SIEM Alert' },
          },
          required: ['incidentId', 'source'],
          additionalProperties: false,
        },
        responseActions: {
          type: 'object',
          properties: {
            blockIndicator: { type: 'boolean', default: false },
            quarantineHosts: { type: 'boolean', default: false },
            createTicket: { type: 'boolean', default: true },
            notifyTeams: {
              type: 'array',
              items: { type: 'string' },
              default: ['SOC', 'Management'],
            },
          },
          required: ['createTicket'],
          additionalProperties: false,
        },
      },
      required: ['analyst', 'threatIndicator', 'incidentMetadata'],
      additionalProperties: false,
    });

    const result = applyInputDefaults(undefined, inputsSchema);
    expect(result).toEqual({
      analyst: {
        email: 'analyst@security.com',
        name: 'Security Analyst',
        team: 'SOC',
      },
      threatIndicator: {
        type: 'ip',
        value: '192.168.1.100',
        severity: 'medium',
      },
      incidentMetadata: {
        incidentId: 'INC-20241118-0001',
        source: 'SIEM Alert',
      },
      responseActions: {
        blockIndicator: false,
        quarantineHosts: false,
        createTicket: true,
        notifyTeams: ['SOC', 'Management'],
      },
    });
  });
});
