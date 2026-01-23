/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { validateJsonSchemaDefaults } from './validate_json_schema_defaults';

describe('validateJsonSchemaDefaults', () => {
  it('should validate simple string default with invalid type', () => {
    const yaml = `
name: Test Workflow
inputs:
  properties:
    email:
      type: string
      format: email
      default: 123
`;
    const doc = parseDocument(yaml);
    const workflowDefinition = {
      inputs: {
        properties: {
          email: {
            type: 'string',
            format: 'email',
            default: 123,
          },
        },
      },
    };

    const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Invalid default value');
    expect(errors[0].message).toContain('email');
    expect(errors[0].owner).toBe('json-schema-default-validation');
  });

  it('should validate nested property default with invalid type', () => {
    const yaml = `
name: Test Workflow
inputs:
  properties:
    analyst:
      type: object
      properties:
        name:
          type: string
          minLength: 2
          maxLength: 100
          default: 12
`;
    const doc = parseDocument(yaml);
    const workflowDefinition = {
      inputs: {
        properties: {
          analyst: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                minLength: 2,
                maxLength: 100,
                default: 12,
              },
            },
          },
        },
      },
    };

    const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Invalid default value');
    expect(errors[0].owner).toBe('json-schema-default-validation');
  });

  it('should not error for valid defaults', () => {
    const yaml = `
name: Test Workflow
inputs:
  properties:
    email:
      type: string
      format: email
      default: "user@example.com"
    name:
      type: string
      default: "John Doe"
`;
    const doc = parseDocument(yaml);
    const workflowDefinition = {
      inputs: {
        properties: {
          email: {
            type: 'string',
            format: 'email',
            default: 'user@example.com',
          },
          name: {
            type: 'string',
            default: 'John Doe',
          },
        },
      },
    };

    const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
    expect(errors.length).toBe(0);
  });

  it('should return empty array when inputs are missing', () => {
    const yaml = `name: Test Workflow`;
    const doc = parseDocument(yaml);
    const workflowDefinition = {};

    const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
    expect(errors).toEqual([]);
  });

  it('should validate nested property and report correct line number', () => {
    const yaml = `name: Test Workflow
inputs:
  properties:
    analyst:
      type: object
      properties:
        email:
          type: string
          format: email
          default: analys.com
        name:
          type: string
`;
    const doc = parseDocument(yaml);
    const workflowDefinition = {
      inputs: {
        properties: {
          analyst: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                format: 'email',
                default: 'analys.com',
              },
            },
          },
        },
      },
    };

    const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
    expect(errors.length).toBeGreaterThan(0);
    // The error should be on the line with "default: analys.com", not the next line with "name:"
    // Count lines: name (1), inputs (2), properties (3), analyst (4), type (5), properties (6), email (7), type (8), format (9), default (10)
    expect(errors[0].startLineNumber).toBe(10);
    expect(errors[0].message).toContain('email');
  });

  describe('edge cases - partially parsed YAML (defensive checks)', () => {
    it('should handle null yamlDocument gracefully', () => {
      const errors = validateJsonSchemaDefaults(null, {} as any);
      expect(errors).toEqual([]);
    });

    it('should handle inputs as string (partially typed)', () => {
      const yaml = `
name: Test Workflow
inputs: properties
`;
      const doc = parseDocument(yaml);
      const workflowDefinition = {
        inputs: 'properties' as any,
      };

      const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
      expect(errors).toEqual([]);
    });

    it('should handle inputs as number', () => {
      const yaml = `
name: Test Workflow
inputs: 123
`;
      const doc = parseDocument(yaml);
      const workflowDefinition = {
        inputs: 123 as any,
      };

      const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
      expect(errors).toEqual([]);
    });

    it('should handle inputs with null properties', () => {
      const yaml = `
name: Test Workflow
inputs:
  properties: null
`;
      const doc = parseDocument(yaml);
      const workflowDefinition = {
        inputs: {
          properties: null,
        } as any,
      };

      const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
      expect(errors).toEqual([]);
    });

    it('should handle inputs with string properties', () => {
      const yaml = `
name: Test Workflow
inputs:
  properties: invalid
`;
      const doc = parseDocument(yaml);
      const workflowDefinition = {
        inputs: {
          properties: 'invalid',
        } as any,
      };

      const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
      expect(errors).toEqual([]);
    });

    it('should handle properties with null schema values', () => {
      const yaml = `
name: Test Workflow
inputs:
  properties:
    name: null
    email:
      type: string
      default: "test@example.com"
`;
      const doc = parseDocument(yaml);
      const workflowDefinition = {
        inputs: {
          properties: {
            name: null,
            email: {
              type: 'string',
              default: 'test@example.com',
            },
          },
        } as any,
      };

      const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
      // Should not crash, may or may not have errors for valid email
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle properties with string schema values (invalid)', () => {
      const yaml = `
name: Test Workflow
inputs:
  properties:
    name: invalid string schema
    email:
      type: string
      default: "test@example.com"
`;
      const doc = parseDocument(yaml);
      const workflowDefinition = {
        inputs: {
          properties: {
            name: 'invalid string schema',
            email: {
              type: 'string',
              default: 'test@example.com',
            },
          },
        } as any,
      };

      const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
      // Should not crash
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle nested properties with null values', () => {
      const yaml = `
name: Test Workflow
inputs:
  properties:
    user:
      type: object
      properties:
        name: null
        email:
          type: string
          default: "test@example.com"
`;
      const doc = parseDocument(yaml);
      const workflowDefinition = {
        inputs: {
          properties: {
            user: {
              type: 'object',
              properties: {
                name: null,
                email: {
                  type: 'string',
                  default: 'test@example.com',
                },
              },
            },
          },
        } as any,
      };

      const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
      // Should not crash
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle $ref with null resolved schema', () => {
      const yaml = `
name: Test Workflow
inputs:
  properties:
    user:
      $ref: "#/definitions/User"
  definitions:
    User: null
`;
      const doc = parseDocument(yaml);
      const workflowDefinition = {
        inputs: {
          properties: {
            user: {
              $ref: '#/definitions/User',
            },
          },
          definitions: {
            User: null,
          },
        } as any,
      };

      const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
      // Should not crash
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle malformed YAML that throws during toJSON', () => {
      // Create a mock document that throws
      const doc = {
        toJSON: () => {
          throw new Error('Malformed YAML');
        },
      } as any;

      const workflowDefinition = {
        inputs: {
          properties: {
            name: { type: 'string' },
          },
        },
      };

      const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
      // Should fallback to workflowDefinition inputs and not crash
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle properties that are arrays (invalid structure)', () => {
      const yaml = `
name: Test Workflow
inputs:
  properties: []
`;
      const doc = parseDocument(yaml);
      const workflowDefinition = {
        inputs: {
          properties: [],
        } as any,
      };

      const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
      expect(errors).toEqual([]);
    });

    it('should handle deeply nested null values', () => {
      const yaml = `
name: Test Workflow
inputs:
  properties:
    level1:
      type: object
      properties:
        level2:
          type: object
          properties:
            level3: null
            valid:
              type: string
              default: "test"
`;
      const doc = parseDocument(yaml);
      const workflowDefinition = {
        inputs: {
          properties: {
            level1: {
              type: 'object',
              properties: {
                level2: {
                  type: 'object',
                  properties: {
                    level3: null,
                    valid: {
                      type: 'string',
                      default: 'test',
                    },
                  },
                },
              },
            },
          },
        } as any,
      };

      const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
      // Should not crash
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  it('should validate legacy array format inputs with invalid default type', () => {
    const yaml = `
name: Test Workflow
inputs:
  - name: greeting
    type: string
    default: 1123
  - name: people
    type: array
    default:
      - alice
      - bob
`;
    const doc = parseDocument(yaml);
    const workflowDefinition = {
      inputs: [
        {
          name: 'greeting',
          type: 'string',
          default: 1123,
        },
        {
          name: 'people',
          type: 'array',
          default: ['alice', 'bob'],
        },
      ],
    };

    const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Invalid default value');
    expect(errors[0].message).toContain('greeting');
    expect(errors[0].owner).toBe('json-schema-default-validation');
  });

  it('should not error for valid defaults in legacy array format', () => {
    const yaml = `
name: Test Workflow
inputs:
  - name: greeting
    type: string
    default: "Hello"
  - name: count
    type: number
    default: 42
`;
    const doc = parseDocument(yaml);
    const workflowDefinition = {
      inputs: [
        {
          name: 'greeting',
          type: 'string',
          default: 'Hello',
        },
        {
          name: 'count',
          type: 'number',
          default: 42,
        },
      ],
    };

    const errors = validateJsonSchemaDefaults(doc, workflowDefinition as any);
    expect(errors.length).toBe(0);
  });
});
