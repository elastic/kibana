/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';

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

      const result = modifyStepProperty(yamlNoTrailing, 'my_step', 'if', 'steps.prev.output.ok');

      expect(result.success).toBe(true);
      expect(result.yaml).toContain('if:');
      const lines = result.yaml.split('\n');
      const msgLine = lines.findIndex((l) => l.includes('{{ steps.prev.output.value }}'));
      expect(lines[msgLine]).not.toContain('if:');
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

  describe('modifyWorkflowProperty with complex array values', () => {
    it('produces valid YAML when replacing triggers with a complex rrule schedule', () => {
      const yamlWithTrigger = `version: "1"
name: My Workflow
triggers:
  - type: scheduled
    with:
      rrule:
        freq: DAILY
        interval: 1
        byhour:
          - 9
        byminute:
          - 0
        tzid: UTC

steps:
  - name: step1
    type: console
    with:
      message: hello
`;

      const result = modifyWorkflowProperty(yamlWithTrigger, 'triggers', [
        {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'WEEKLY',
              interval: 1,
              byday: ['MO', 'TH'],
              byhour: [9],
              byminute: [0],
              tzid: 'UTC',
            },
          },
        },
      ]);

      expect(result.success).toBe(true);

      const doc = parseDocument(result.yaml);
      expect(doc.errors).toHaveLength(0);

      const parsed = doc.toJSON();
      expect(parsed.triggers).toHaveLength(1);
      expect(parsed.triggers[0].type).toBe('scheduled');
      expect(parsed.triggers[0].with.rrule.freq).toBe('WEEKLY');
      expect(parsed.triggers[0].with.rrule.byday).toEqual(['MO', 'TH']);

      // Steps must be untouched
      expect(result.yaml).toContain('  - name: step1');
      expect(result.yaml).toContain('      message: hello');
    });

    it('preserves indentation when modifying tags array', () => {
      const result = modifyWorkflowProperty(SAMPLE_WORKFLOW, 'tags', [
        'production',
        'alerts',
        'weekly',
      ]);

      expect(result.success).toBe(true);

      const doc = parseDocument(result.yaml);
      expect(doc.errors).toHaveLength(0);

      const parsed = doc.toJSON();
      expect(parsed.tags).toEqual(['production', 'alerts', 'weekly']);
      expect(parsed.steps).toHaveLength(2);
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

  describe('edit integrity safety net', () => {
    const WORKFLOW_WITH_MANY_STEPS = `version: "1"
name: Open PRs Report
description: Fetches open PRs and posts a Slack summary

triggers:
  - type: manual

steps:
  - name: get_prs_from_github
    type: http
    with:
      url: "{{ consts.github_search_url }}"
      method: GET
      headers:
        Accept: application/vnd.github+json

  - name: build_pr_list
    type: data.map
    with:
      items: "{{ steps.get_prs_from_github.output.data.items }}"
      fields:
        title: "{{ item.title }}"
        url: "{{ item.html_url }}"
        author: "{{ item.user.login }}"

  - name: format_slack_message
    type: data.set
    with:
      pr_count: "{{ steps.get_prs_from_github.output.data.total_count }}"
      message: |
        :github: *Open PRs* ({{ steps.get_prs_from_github.output.data.total_count }} total)

  - name: send_slack_message
    type: slack
    connector-id: 0ee5d857-3653-4ec2-930f-638cf2a1d990
    with:
      message: "{{ steps.format_slack_message.output.message }}"
`;

    it('modifyWorkflowProperty (triggers) preserves all steps structurally', () => {
      const beforeParsed = parseDocument(WORKFLOW_WITH_MANY_STEPS).toJSON();

      const result = modifyWorkflowProperty(WORKFLOW_WITH_MANY_STEPS, 'triggers', [
        {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'DAILY',
              interval: 1,
              byhour: [9],
              byminute: [0],
              tzid: 'Asia/Tbilisi',
            },
          },
        },
      ]);

      expect(result.success).toBe(true);

      const afterParsed = parseDocument(result.yaml).toJSON();
      expect(afterParsed.steps).toEqual(beforeParsed.steps);
      expect(afterParsed.name).toBe(beforeParsed.name);
      expect(afterParsed.description).toBe(beforeParsed.description);
      expect(afterParsed.triggers[0].type).toBe('scheduled');
    });

    it('modifyWorkflowProperty (name) preserves triggers and steps', () => {
      const beforeParsed = parseDocument(WORKFLOW_WITH_MANY_STEPS).toJSON();

      const result = modifyWorkflowProperty(WORKFLOW_WITH_MANY_STEPS, 'name', 'Renamed Workflow');
      expect(result.success).toBe(true);

      const afterParsed = parseDocument(result.yaml).toJSON();
      expect(afterParsed.triggers).toEqual(beforeParsed.triggers);
      expect(afterParsed.steps).toEqual(beforeParsed.steps);
      expect(afterParsed.name).toBe('Renamed Workflow');
    });

    it('modifyWorkflowProperty (description) preserves all steps with block scalars', () => {
      const result = modifyWorkflowProperty(
        WORKFLOW_WITH_MANY_STEPS,
        'description',
        'New description'
      );
      expect(result.success).toBe(true);

      const afterParsed = parseDocument(result.yaml).toJSON();
      const beforeParsed = parseDocument(WORKFLOW_WITH_MANY_STEPS).toJSON();
      expect(afterParsed.steps).toEqual(beforeParsed.steps);
      expect(afterParsed.triggers).toEqual(beforeParsed.triggers);
    });

    it('modifyStepProperty preserves other steps and top-level properties', () => {
      const beforeParsed = parseDocument(WORKFLOW_WITH_MANY_STEPS).toJSON();

      const result = modifyStepProperty(WORKFLOW_WITH_MANY_STEPS, 'send_slack_message', 'with', {
        message: 'Updated message',
      });
      expect(result.success).toBe(true);

      const afterParsed = parseDocument(result.yaml).toJSON();
      expect(afterParsed.triggers).toEqual(beforeParsed.triggers);
      expect(afterParsed.name).toBe(beforeParsed.name);

      expect(afterParsed.steps.find((s: { name: string }) => s.name === 'build_pr_list')).toEqual(
        beforeParsed.steps.find((s: { name: string }) => s.name === 'build_pr_list')
      );
      expect(
        afterParsed.steps.find((s: { name: string }) => s.name === 'format_slack_message')
      ).toEqual(
        beforeParsed.steps.find((s: { name: string }) => s.name === 'format_slack_message')
      );
      expect(
        afterParsed.steps.find((s: { name: string }) => s.name === 'get_prs_from_github')
      ).toEqual(beforeParsed.steps.find((s: { name: string }) => s.name === 'get_prs_from_github'));
    });

    it('integrity check rejects modifyStepProperty when splice corrupts adjacent steps', () => {
      const result = modifyStepProperty(WORKFLOW_WITH_MANY_STEPS, 'get_prs_from_github', 'with', {
        url: 'https://new-url.example.com',
        method: 'POST',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('integrity violation');
    });

    it('modifyStep preserves other steps and top-level properties', () => {
      const beforeParsed = parseDocument(WORKFLOW_WITH_MANY_STEPS).toJSON();

      const result = modifyStep(WORKFLOW_WITH_MANY_STEPS, 'build_pr_list', {
        name: 'build_pr_list',
        type: 'data.filter',
        with: { items: '{{ steps.get_prs_from_github.output.data.items }}', condition: 'true' },
      });
      expect(result.success).toBe(true);

      const afterParsed = parseDocument(result.yaml).toJSON();
      expect(afterParsed.triggers).toEqual(beforeParsed.triggers);
      expect(
        afterParsed.steps.find((s: { name: string }) => s.name === 'get_prs_from_github')
      ).toEqual(beforeParsed.steps.find((s: { name: string }) => s.name === 'get_prs_from_github'));
      expect(
        afterParsed.steps.find((s: { name: string }) => s.name === 'send_slack_message')
      ).toEqual(beforeParsed.steps.find((s: { name: string }) => s.name === 'send_slack_message'));
    });

    it('insertStep preserves all existing steps and top-level properties', () => {
      const beforeParsed = parseDocument(WORKFLOW_WITH_MANY_STEPS).toJSON();

      const result = insertStep(WORKFLOW_WITH_MANY_STEPS, {
        name: 'log_result',
        type: 'console',
        with: { message: 'Done!' },
      });
      expect(result.success).toBe(true);

      const afterParsed = parseDocument(result.yaml).toJSON();
      expect(afterParsed.triggers).toEqual(beforeParsed.triggers);
      expect(afterParsed.name).toBe(beforeParsed.name);
      expect(afterParsed.steps).toHaveLength(beforeParsed.steps.length + 1);

      for (const step of beforeParsed.steps) {
        expect(afterParsed.steps.find((s: { name: string }) => s.name === step.name)).toEqual(step);
      }
    });

    it('deleteStep preserves all remaining steps and top-level properties', () => {
      const beforeParsed = parseDocument(WORKFLOW_WITH_MANY_STEPS).toJSON();

      const result = deleteStep(WORKFLOW_WITH_MANY_STEPS, 'format_slack_message');
      expect(result.success).toBe(true);

      const afterParsed = parseDocument(result.yaml).toJSON();
      expect(afterParsed.triggers).toEqual(beforeParsed.triggers);
      expect(afterParsed.name).toBe(beforeParsed.name);
      expect(afterParsed.steps).toHaveLength(beforeParsed.steps.length - 1);

      expect(
        afterParsed.steps.find((s: { name: string }) => s.name === 'get_prs_from_github')
      ).toEqual(beforeParsed.steps.find((s: { name: string }) => s.name === 'get_prs_from_github'));
      expect(
        afterParsed.steps.find((s: { name: string }) => s.name === 'send_slack_message')
      ).toEqual(beforeParsed.steps.find((s: { name: string }) => s.name === 'send_slack_message'));
    });

    it('replacing triggers with rrule on a workflow with no blank line before steps', () => {
      const compact = `name: Compact
triggers:
  - type: manual
steps:
  - name: step1
    type: console
    with:
      message: hello
  - name: step2
    type: http
    with:
      url: https://example.com
      method: GET
`;
      const beforeParsed = parseDocument(compact).toJSON();

      const result = modifyWorkflowProperty(compact, 'triggers', [
        {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'DAILY',
              interval: 1,
              byhour: [9],
              byminute: [0],
              tzid: 'Asia/Tbilisi',
            },
          },
        },
      ]);
      expect(result.success).toBe(true);

      const afterParsed = parseDocument(result.yaml).toJSON();
      expect(afterParsed.steps).toEqual(beforeParsed.steps);
    });
  });
});
