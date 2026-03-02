/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-nodejs-modules */

import { readFileSync } from 'fs';
import Path from 'path';
import { z } from '@kbn/zod/v4';
import { validateWorkflowYaml } from './validate_workflow_yaml';
import { getWorkflowZodSchema } from '../schema';

const loadExample = (name: string) =>
  readFileSync(Path.join(__dirname, '..', 'examples', name), 'utf8');

describe('validateWorkflowYaml', () => {
  const schema = getWorkflowZodSchema({});

  describe('valid example workflows', () => {
    const examples = [
      { name: 'national_parks.yaml', yaml: loadExample('national_parks.yaml') },
      { name: 'automated_triaging.yaml', yaml: loadExample('automated_triaging.yaml') },
    ];

    examples.forEach(({ name, yaml }) => {
      it(`should return valid for ${name}`, () => {
        const result = validateWorkflowYaml(yaml, schema);
        expect(result.valid).toBe(true);
        expect(result.diagnostics).toEqual([]);
      });
    });
  });

  describe('yaml syntax errors', () => {
    it('should detect invalid YAML syntax', () => {
      const result = validateWorkflowYaml(':\n  invalid: [unclosed', schema);

      expect(result.valid).toBe(false);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0].source).toBe('yaml-syntax');
    });

    it('should detect completely malformed YAML', () => {
      const result = validateWorkflowYaml('{{{{', schema);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.source === 'yaml-syntax')).toBe(true);
    });
  });

  describe('schema validation errors', () => {
    it('should detect missing required name field', () => {
      const yaml = `
version: '1'
enabled: true
triggers:
  - type: manual
steps:
  - name: step1
    type: console
    with:
      message: hello
`;
      const result = validateWorkflowYaml(yaml, schema);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.source === 'schema')).toBe(true);
    });

    it('should detect invalid step type', () => {
      const yaml = `
version: '1'
name: Test
triggers:
  - type: manual
steps:
  - name: step1
    type: nonexistent_connector_type_xyz
    with:
      message: hello
`;
      const result = validateWorkflowYaml(yaml, schema);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.source === 'schema')).toBe(true);
    });

    it('should provide path information in schema errors', () => {
      const yaml = `
version: '1'
name: Test
triggers:
  - type: manual
steps:
  - name: step1
    type: nonexistent_connector_type_xyz
    with:
      message: hello
`;
      const result = validateWorkflowYaml(yaml, schema);

      const schemaErrors = result.diagnostics.filter((d) => d.source === 'schema');
      expect(schemaErrors.length).toBeGreaterThan(0);
    });
  });

  describe('step name uniqueness', () => {
    it('should detect duplicate step names', () => {
      const yaml = `
version: '1'
name: Duplicate Steps Test
triggers:
  - type: manual
steps:
  - name: my_step
    type: console
    with:
      message: first
  - name: my_step
    type: console
    with:
      message: second
`;
      const result = validateWorkflowYaml(yaml, schema);

      expect(result.valid).toBe(false);
      const stepNameErrors = result.diagnostics.filter((d) => d.source === 'step-name');
      expect(stepNameErrors.length).toBeGreaterThan(0);
      expect(stepNameErrors[0].message).toContain('my_step');
    });

    it('should allow unique step names', () => {
      const yaml = `
version: '1'
name: Unique Steps Test
triggers:
  - type: manual
steps:
  - name: step_one
    type: console
    with:
      message: first
  - name: step_two
    type: console
    with:
      message: second
`;
      const result = validateWorkflowYaml(yaml, schema);

      expect(result.valid).toBe(true);
      expect(result.diagnostics.filter((d) => d.source === 'step-name')).toHaveLength(0);
    });
  });

  describe('liquid template errors', () => {
    it('should detect unclosed liquid expressions', () => {
      const yaml = `
version: '1'
name: Liquid Error Test
triggers:
  - type: manual
steps:
  - name: step1
    type: console
    with:
      message: "{{ unclosed"
`;
      const result = validateWorkflowYaml(yaml, schema);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.source === 'liquid')).toBe(true);
    });

    it('should not flag valid liquid templates', () => {
      const yaml = `
version: '1'
name: Valid Liquid Test
triggers:
  - type: manual
steps:
  - name: step1
    type: console
    with:
      message: "Hello {{ name }}"
`;
      const result = validateWorkflowYaml(yaml, schema);

      expect(result.diagnostics.filter((d) => d.source === 'liquid')).toHaveLength(0);
    });
  });

  describe('trigger validation', () => {
    const customTriggerId = 'custom-trigger';
    const schemaWithCustomTrigger = getWorkflowZodSchema({}, [customTriggerId]);
    const triggerDefinitions = [
      {
        id: customTriggerId,
        eventSchema: z.object({
          severity: z.string(),
          host: z.string(),
        }),
      },
    ];

    it('should pass when a custom trigger has a valid KQL condition', () => {
      const yaml = `
version: '1'
name: Valid Trigger Condition
triggers:
  - type: ${customTriggerId}
    with:
      condition: "event.severity: critical"
steps:
  - name: step1
    type: console
    with:
      message: hello
`;
      const result = validateWorkflowYaml(yaml, schemaWithCustomTrigger, { triggerDefinitions });

      expect(result.valid).toBe(true);
      expect(result.diagnostics.filter((d) => d.source === 'trigger')).toHaveLength(0);
    });

    it('should detect an invalid KQL condition in a custom trigger', () => {
      const yaml = `
version: '1'
name: Invalid Trigger Condition
triggers:
  - type: ${customTriggerId}
    with:
      condition: "event.unknown_field: value"
steps:
  - name: step1
    type: console
    with:
      message: hello
`;
      const result = validateWorkflowYaml(yaml, schemaWithCustomTrigger, { triggerDefinitions });

      expect(result.valid).toBe(false);
      const triggerErrors = result.diagnostics.filter((d) => d.source === 'trigger');
      expect(triggerErrors.length).toBeGreaterThan(0);
    });

    it('should skip trigger validation when no triggerDefinitions are provided', () => {
      const yaml = `
version: '1'
name: No Trigger Defs
triggers:
  - type: ${customTriggerId}
    with:
      condition: "event.unknown_field: value"
steps:
  - name: step1
    type: console
    with:
      message: hello
`;
      const result = validateWorkflowYaml(yaml, schemaWithCustomTrigger);

      const triggerErrors = result.diagnostics.filter((d) => d.source === 'trigger');
      expect(triggerErrors).toHaveLength(0);
    });

    it('should not validate conditions on built-in trigger types', () => {
      const yaml = `
version: '1'
name: Built-in Trigger
triggers:
  - type: manual
steps:
  - name: step1
    type: console
    with:
      message: hello
`;
      const result = validateWorkflowYaml(yaml, schema, { triggerDefinitions });

      expect(result.valid).toBe(true);
      expect(result.diagnostics.filter((d) => d.source === 'trigger')).toHaveLength(0);
    });
  });

  describe('multiple error sources', () => {
    it('should collect diagnostics from multiple sources without short-circuiting', () => {
      const yaml = `
version: '1'
name: Multi Error Test
triggers:
  - type: manual
steps:
  - name: dup
    type: console
    with:
      message: "{{ unclosed"
  - name: dup
    type: console
    with:
      message: ok
`;
      const result = validateWorkflowYaml(yaml, schema);

      expect(result.valid).toBe(false);
      const sources = new Set(result.diagnostics.map((d) => d.source));
      expect(sources.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('response shape', () => {
    it('should return valid=true with empty diagnostics for valid YAML', () => {
      const yaml = `
version: '1'
name: Simple Valid
triggers:
  - type: manual
steps:
  - name: step1
    type: console
    with:
      message: hello
`;
      const result = validateWorkflowYaml(yaml, schema);

      expect(result.valid).toBe(true);
      expect(result.diagnostics).toEqual([]);
      expect(result.parsedWorkflow).toBeDefined();
    });

    it('should include severity, message, and source in each diagnostic', () => {
      const result = validateWorkflowYaml('not: valid: yaml: [[[', schema);

      expect(result.valid).toBe(false);
      for (const diag of result.diagnostics) {
        expect(diag).toHaveProperty('severity');
        expect(diag).toHaveProperty('message');
        expect(diag).toHaveProperty('source');
        expect(typeof diag.message).toBe('string');
        expect(diag.message.length).toBeGreaterThan(0);
      }
    });
  });
});
