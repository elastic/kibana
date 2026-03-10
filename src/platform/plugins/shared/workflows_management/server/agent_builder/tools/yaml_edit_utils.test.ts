/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  deleteStep,
  insertStep,
  modifyStep,
  modifyStepProperty,
  modifyWorkflowProperty,
} from './yaml_edit_utils';

const SAMPLE_WORKFLOW = `version: "1"
name: My Workflow
description: >-
  A multi-line description that spans
  several lines and should be preserved exactly.
enabled: true
tags:
  - demo
  - test

consts:
  indexName: my-index

triggers:
  - type: manual

steps:
  # Step 1: Log a greeting
  - name: log_greeting
    type: console
    with:
      message: "Hello, world!"

  # Step 2: Search for data
  - name: search_data
    type: elasticsearch.search
    with:
      index: "{{ consts.indexName }}"
      body:
        query:
          match_all: {}
`;

/**
 * Returns only the lines that differ between two strings.
 * Used to verify diffs are contained (only the intended lines changed).
 */
const getChangedLines = (before: string, after: string): string[] => {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const changed: string[] = [];

  const maxLen = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < maxLen; i++) {
    if (beforeLines[i] !== afterLines[i]) {
      if (afterLines[i] !== undefined) changed.push(`+${afterLines[i]}`);
      if (beforeLines[i] !== undefined) changed.push(`-${beforeLines[i]}`);
    }
  }
  return changed;
};

/**
 * Returns lines that appear identically in both strings.
 */
const getUnchangedLines = (before: string, after: string): string[] => {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  return beforeLines.filter((line, i) => afterLines[i] === line);
};

describe('yaml_edit_utils', () => {
  describe('modifyWorkflowProperty', () => {
    it('changes only the target property, preserving all other content', () => {
      const result = modifyWorkflowProperty(SAMPLE_WORKFLOW, 'description', 'A short description');

      expect(result.success).toBe(true);
      expect(result.yaml).toContain('description: A short description');
      expect(result.yaml).not.toContain('A multi-line description');

      expect(result.yaml).toContain('name: My Workflow');
      expect(result.yaml).toContain('  - name: log_greeting');
      expect(result.yaml).toContain('      message: "Hello, world!"');
      expect(result.yaml).toContain('  - name: search_data');
    });

    it('preserves multi-line strings, comments, and formatting in untouched sections', () => {
      const result = modifyWorkflowProperty(SAMPLE_WORKFLOW, 'name', 'Renamed Workflow');

      expect(result.success).toBe(true);
      expect(result.yaml).toContain('Renamed Workflow');
      expect(result.yaml).toContain('# Step 1: Log a greeting');
      expect(result.yaml).toContain('# Step 2: Search for data');
      expect(result.yaml).toContain('"Hello, world!"');
      expect(result.yaml).toContain('{{ consts.indexName }}');
    });

    it('preserves tag formatting', () => {
      const result = modifyWorkflowProperty(SAMPLE_WORKFLOW, 'enabled', false);

      expect(result.success).toBe(true);

      const unchanged = getUnchangedLines(SAMPLE_WORKFLOW, result.yaml);
      expect(unchanged).toContain('tags:');
      expect(unchanged).toContain('  - demo');
      expect(unchanged).toContain('  - test');
    });

    it('returns error for non-mapping root', () => {
      const result = modifyWorkflowProperty('- item1\n- item2', 'name', 'test');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not a mapping');
    });

    it('inserts a new property in canonical order between existing properties', () => {
      const yamlWithoutInputs = `version: "1"
name: Test
triggers:
  - type: manual
steps:
  - name: step1
    type: console
`;
      const result = modifyWorkflowProperty(yamlWithoutInputs, 'inputs', {
        alert_id: { type: 'string' },
      });

      expect(result.success).toBe(true);

      const lines = result.yaml.split('\n');
      const triggersLine = lines.findIndex((l) => l === 'triggers:');
      const inputsLine = lines.findIndex((l) => l === 'inputs:');
      const stepsLine = lines.findIndex((l) => l === 'steps:');

      expect(inputsLine).toBeGreaterThan(triggersLine);
      expect(inputsLine).toBeLessThan(stepsLine);
    });

    it('inserts enabled between name and steps when intermediate properties are absent', () => {
      const yamlMinimal = `version: "1"
name: Test
steps:
  - name: step1
    type: console
`;
      const result = modifyWorkflowProperty(yamlMinimal, 'enabled', true);

      expect(result.success).toBe(true);

      const lines = result.yaml.split('\n');
      const nameLine = lines.findIndex((l) => l.startsWith('name:'));
      const enabledLine = lines.findIndex((l) => l === 'enabled: true');
      const stepsLine = lines.findIndex((l) => l === 'steps:');

      expect(enabledLine).toBeGreaterThan(nameLine);
      expect(enabledLine).toBeLessThan(stepsLine);
    });

    it('inserts version before all other properties when it is missing', () => {
      const yamlNoVersion = `name: Test
steps:
  - name: step1
    type: console
`;
      const result = modifyWorkflowProperty(yamlNoVersion, 'version', '1');

      expect(result.success).toBe(true);

      const lines = result.yaml.split('\n');
      const versionLine = lines.findIndex((l) => l.startsWith('version:'));
      const nameLine = lines.findIndex((l) => l.startsWith('name:'));

      expect(versionLine).toBeLessThan(nameLine);
    });

    it('appends non-canonical properties at the end', () => {
      const result = modifyWorkflowProperty(SAMPLE_WORKFLOW, 'custom_field', 'custom_value');

      expect(result.success).toBe(true);
      expect(result.yaml.trimEnd().endsWith('custom_field: custom_value')).toBe(true);
    });
  });

  describe('modifyStepProperty', () => {
    it('changes only the target step property, leaving everything else intact', () => {
      const result = modifyStepProperty(SAMPLE_WORKFLOW, 'log_greeting', 'with', {
        message: 'Goodbye!',
      });

      expect(result.success).toBe(true);

      const changed = getChangedLines(SAMPLE_WORKFLOW, result.yaml);
      expect(changed.some((l) => l.includes('Goodbye!'))).toBe(true);
      expect(changed.every((l) => !l.includes('search_data'))).toBe(true);
      expect(changed.every((l) => !l.includes('My Workflow'))).toBe(true);
    });

    it('preserves comments around the modified step', () => {
      const result = modifyStepProperty(SAMPLE_WORKFLOW, 'log_greeting', 'with', {
        message: 'Updated',
      });

      expect(result.success).toBe(true);
      expect(result.yaml).toContain('# Step 1: Log a greeting');
      expect(result.yaml).toContain('# Step 2: Search for data');
    });

    it('does not touch the search_data step when modifying log_greeting', () => {
      const result = modifyStepProperty(SAMPLE_WORKFLOW, 'log_greeting', 'with', {
        message: 'Changed',
      });

      expect(result.success).toBe(true);

      const unchanged = getUnchangedLines(SAMPLE_WORKFLOW, result.yaml);
      expect(unchanged).toContain('  - name: search_data');
      expect(unchanged).toContain('    type: elasticsearch.search');
    });

    it('appends a new property to a step ending without trailing newline', () => {
      const yamlNoTrailing = `version: "1"
name: Test
steps:
  - name: my_step
    type: console
    with:
      message: "{{ steps.prev.output.value }}"`;

      const result = modifyStepProperty(
        yamlNoTrailing,
        'my_step',
        'condition',
        'steps.prev.output.ok'
      );

      expect(result.success).toBe(true);
      expect(result.yaml).toContain('condition:');
      const lines = result.yaml.split('\n');
      const msgLine = lines.findIndex((l) => l.includes('{{ steps.prev.output.value }}'));
      expect(lines[msgLine]).not.toContain('condition');
    });

    it('returns error for non-existent step', () => {
      const result = modifyStepProperty(SAMPLE_WORKFLOW, 'no_such_step', 'with', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('modifyStep', () => {
    it('replaces only the targeted step', () => {
      const result = modifyStep(SAMPLE_WORKFLOW, 'log_greeting', {
        name: 'log_greeting',
        type: 'console',
        with: { message: 'Replaced step' },
      });

      expect(result.success).toBe(true);
      expect(result.yaml).toContain('Replaced step');

      const unchanged = getUnchangedLines(SAMPLE_WORKFLOW, result.yaml);
      expect(unchanged).toContain('  - name: search_data');
      expect(unchanged).toContain('    type: elasticsearch.search');
    });

    it('returns error for non-existent step', () => {
      const result = modifyStep(SAMPLE_WORKFLOW, 'missing', {
        name: 'missing',
        type: 'console',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('insertStep', () => {
    it('appends a step with correct indentation matching existing steps', () => {
      const result = insertStep(SAMPLE_WORKFLOW, {
        name: 'new_step',
        type: 'console',
        with: { message: 'I am new' },
      });

      expect(result.success).toBe(true);
      expect(result.yaml).toContain('  - name: new_step');
      expect(result.yaml).toContain('    type: console');
      expect(result.yaml).toContain('      message: I am new');

      const unchanged = getUnchangedLines(SAMPLE_WORKFLOW, result.yaml);
      expect(unchanged).toContain('  - name: log_greeting');
      expect(unchanged).toContain('  - name: search_data');
    });

    it('inserts cleanly after a step ending with Liquid templates (no trailing newline)', () => {
      const yamlWithLiquid = `version: "1"
name: Test
steps:
  - name: esql_step
    type: elasticsearch.esql.query
    with:
      format: json
      query: |
        FROM test_properties
        | EVAL val = COALESCE(?param, 0)
        | KEEP val
      params:
        value_present: "{{ steps.test_values.output.message }}"`;

      const result = insertStep(yamlWithLiquid, {
        name: 'print_hello',
        type: 'console',
        with: { message: 'hello world' },
      });

      expect(result.success).toBe(true);
      expect(result.yaml).toContain('  - name: print_hello');
      expect(result.yaml).toContain('    type: console');
      expect(result.yaml).toContain('      message: hello world');

      const lines = result.yaml.split('\n');
      const liquidLine = lines.findIndex((l) =>
        l.includes('{{ steps.test_values.output.message }}')
      );
      const newStepLine = lines.findIndex((l) => l.includes('- name: print_hello'));
      expect(newStepLine).toBeGreaterThan(liquidLine);
      expect(lines[liquidLine]).not.toContain('- name:');
    });

    it('inserts cleanly after a step ending with a block scalar', () => {
      const yamlWithBlock = `version: "1"
name: Test
steps:
  - name: http_call
    type: http
    with:
      url: https://example.com
      body: |
        {"key": "value",
         "nested": true}`;

      const result = insertStep(yamlWithBlock, {
        name: 'next_step',
        type: 'console',
        with: { message: 'done' },
      });

      expect(result.success).toBe(true);
      expect(result.yaml).toContain('  - name: next_step');
      expect(result.yaml).toContain('    type: console');

      const lines = result.yaml.split('\n');
      const bodyLine = lines.findIndex((l) => l.includes('"nested": true}'));
      const nextLine = lines.findIndex((l) => l.includes('- name: next_step'));
      expect(nextLine).toBeGreaterThan(bodyLine);
      expect(lines[bodyLine]).not.toContain('- name:');
    });

    it('creates a steps array with correct indentation if none exists', () => {
      const noSteps = `version: "1"\nname: Empty\n`;
      const result = insertStep(noSteps, {
        name: 'first_step',
        type: 'console',
      });

      expect(result.success).toBe(true);
      expect(result.yaml).toContain('steps:\n  - name: first_step');
      expect(result.yaml).toContain('    type: console');
    });

    it('inserts after ESQL step with params referencing Liquid templates', () => {
      const yamlWithEsql = `name: test_coalesce_safe
enabled: true

triggers:
  - type: manual

steps:
  - name: test_values
    type: console
    with:
      message: "3"

  - name: esql_coalesce_test
    type: elasticsearch.esql.query
    with:
      format: json
      query: |
        FROM test_properties
        | EVAL bedrooms_checked = COALESCE(?, 0)
        | KEEP bedrooms_checked
      params:
        - "{{ steps.test_values.output.message }}"`;

      const result = insertStep(yamlWithEsql, {
        name: 'print_hello_world',
        type: 'console',
        with: { message: 'hello world' },
      });

      expect(result.success).toBe(true);

      const lines = result.yaml.split('\n');
      const newStepLine = lines.find((l) => l.includes('- name: print_hello_world'));
      expect(newStepLine).toBe('  - name: print_hello_world');

      const typeLine = lines.find((l) => l.includes('type: console') && l.includes('print'));
      expect(typeLine).toBeUndefined();
      const typeLineIdx = lines.findIndex((l) => l.includes('- name: print_hello_world'));
      expect(lines[typeLineIdx + 1]).toBe('    type: console');
      expect(lines[typeLineIdx + 2]).toBe('    with:');
      expect(lines[typeLineIdx + 3]).toBe('      message: hello world');

      const unchanged = getUnchangedLines(yamlWithEsql, result.yaml);
      expect(unchanged).toContain('  - name: test_values');
      expect(unchanged).toContain('  - name: esql_coalesce_test');
    });
  });

  describe('deleteStep', () => {
    it('removes only the targeted step, leaving everything else intact', () => {
      const result = deleteStep(SAMPLE_WORKFLOW, 'log_greeting');

      expect(result.success).toBe(true);
      expect(result.yaml).not.toContain('log_greeting');
      expect(result.yaml).toContain('search_data');
      expect(result.yaml).toContain('My Workflow');
    });

    it('preserves header fields when deleting a step', () => {
      const result = deleteStep(SAMPLE_WORKFLOW, 'search_data');

      expect(result.success).toBe(true);

      const unchanged = getUnchangedLines(SAMPLE_WORKFLOW, result.yaml);
      expect(unchanged).toContain('name: My Workflow');
      expect(unchanged).toContain('enabled: true');
      expect(unchanged).toContain('  - name: log_greeting');
    });

    it('returns error for non-existent step', () => {
      const result = deleteStep(SAMPLE_WORKFLOW, 'ghost');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('diff containment', () => {
    it('modifyWorkflowProperty only changes lines related to the property', () => {
      const result = modifyWorkflowProperty(SAMPLE_WORKFLOW, 'enabled', false);
      expect(result.success).toBe(true);

      const changed = getChangedLines(SAMPLE_WORKFLOW, result.yaml);
      for (const line of changed) {
        expect(line).toMatch(/enabled/);
      }
    });

    it('modifyStepProperty diff is limited to the step being changed', () => {
      const result = modifyStepProperty(SAMPLE_WORKFLOW, 'search_data', 'with', {
        index: 'new-index',
        body: { query: { match_all: {} } },
      });
      expect(result.success).toBe(true);

      const changed = getChangedLines(SAMPLE_WORKFLOW, result.yaml);
      for (const line of changed) {
        expect(line).not.toMatch(/log_greeting/);
        expect(line).not.toMatch(/My Workflow/);
      }
    });

    it('long strings are not re-wrapped by stringify', () => {
      const longDesc =
        'A multi-line description that spans\nseveral lines and should be preserved exactly.';
      const yamlWithLong = `version: "1"
name: Test
description: >-
  A multi-line description that spans
  several lines and should be preserved exactly.
steps:
  - name: step1
    type: console
    with:
      message: "hi"
`;
      const result = modifyStepProperty(yamlWithLong, 'step1', 'with', { message: 'bye' });
      expect(result.success).toBe(true);

      expect(result.yaml).toContain('description: >-');
      expect(result.yaml).toContain('  A multi-line description that spans');
      expect(result.yaml).toContain('  several lines and should be preserved exactly.');
    });
  });
});
