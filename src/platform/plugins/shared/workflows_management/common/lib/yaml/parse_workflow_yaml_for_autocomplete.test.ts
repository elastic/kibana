/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseWorkflowYamlForAutocomplete } from './parse_workflow_yaml_for_autocomplete';

describe('parseWorkflowYamlForAutocomplete', () => {
  describe('handles YAML edge cases without correctYamlSyntax pre-processing', () => {
    it('should parse multi-line JSON schema correctly (issue #15420)', () => {
      const yaml = `name: AI Steps Demo
enabled: false
description: This is a new workflow
triggers:
  - type: manual
steps:
  - name: generate_obs_alert
    type: ai.prompt
    connector-id: azure_open_ai
    with:
      prompt: |
        You are a system that generates Observability alerts.
        I need you to generate 2 alerts.
      schema: {
        "type": "array",
        "items": {
          "title": "ObservabilityAlert",
          "type": "object",
          "additionalProperties": false,
          "required": ["id", "severity", "message", "timestamp"],
          "properties": {
            "id": {
              "type": "string",
              "description": "Unique identifier of the alert",
              "examples": ["cpu_high_usage", "service_down"]
            },
            "severity": {
              "type": "string",
              "description": "Alert severity level",
              "enum": ["critical", "high", "medium", "low", "info"]
            }
          }
        }
      }
  - name: console
    type: console
    with:
      message: foo`;

      const result = parseWorkflowYamlForAutocomplete(yaml);

      expect(result.success).toBe(true);
      if (result.success) {
        const steps = result.data.steps as Array<Record<string, unknown>>;
        // Both steps should be present — the multi-line JSON should not break parsing
        expect(steps).toHaveLength(2);
        expect(steps[0].name).toBe('generate_obs_alert');
        expect(steps[1].name).toBe('console');

        // Schema should be parsed as a nested object, not a string
        expect((steps[0].with as Record<string, unknown>)?.schema).toEqual({
          type: 'array',
          items: expect.objectContaining({
            title: 'ObservabilityAlert',
            type: 'object',
          }),
        });
      }
    });

    it('should parse flow-style consts with @timestamp correctly ', () => {
      const yaml = `name: New workflow
enabled: false
triggers:
  - type: manual
consts:
  items: [{"type": "foo", "@timestamp": "now"}, {"type": "bar", "@timestamp": "yesterday"}]
steps:
  - name: foreach
    type: foreach
    foreach: "{{consts.items}}"
    steps:
      - name: console
        type: console
        with:
          message: "{{foreach.item.type}}"`;

      const result = parseWorkflowYamlForAutocomplete(yaml);

      expect(result.success).toBe(true);
      if (result.success) {
        const steps = result.data.steps as Array<Record<string, unknown>>;
        // Consts items should be an array of objects, not a string
        expect(result.data.consts?.items).toEqual([
          { type: 'foo', '@timestamp': 'now' },
          { type: 'bar', '@timestamp': 'yesterday' },
        ]);
        expect(steps).toHaveLength(1);
        expect(steps[0].name).toBe('foreach');
      }
    });

    it('should parse workflow with unclosed quotes (user is typing)', () => {
      const yaml = `name: New workflow
enabled: false
triggers:
  - type: manual
steps:
  - name: step1
    type: console
    with:
      message: "hello world`;

      const result = parseWorkflowYamlForAutocomplete(yaml);

      // Should still parse — yaml package handles unclosed quotes gracefully
      expect(result.success).toBe(true);
      if (result.success) {
        const steps = result.data.steps as Array<Record<string, unknown>>;
        expect(steps).toHaveLength(1);
        expect(steps[0].name).toBe('step1');
      }
    });

    it('should parse workflow with bare @ in values', () => {
      const yaml = `name: New workflow
enabled: false
triggers:
  - type: manual
steps:
  - name: step1
    type: console
    with:
      message: @mention hello
  - name: step2
    type: console
    with:
      message: "second step"`;

      const result = parseWorkflowYamlForAutocomplete(yaml);

      expect(result.success).toBe(true);
      if (result.success) {
        const steps = result.data.steps as Array<Record<string, unknown>>;
        expect(steps).toHaveLength(2);
        expect(steps[0].name).toBe('step1');
        expect(steps[1].name).toBe('step2');
      }
    });
  });
});
