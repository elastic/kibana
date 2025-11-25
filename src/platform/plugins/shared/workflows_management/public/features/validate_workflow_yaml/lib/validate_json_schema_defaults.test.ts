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
});
