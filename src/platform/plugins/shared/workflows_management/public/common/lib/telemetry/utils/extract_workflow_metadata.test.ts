/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows/spec/schema';

import {
  extractStepInfoFromWorkflowYaml,
  extractWorkflowMetadata,
} from './extract_workflow_metadata';

// Mock parseWorkflowYamlForAutocomplete for extractStepInfoFromWorkflowYaml tests
jest.mock('../../../../../common/lib/yaml/parse_workflow_yaml_for_autocomplete', () => ({
  parseWorkflowYamlForAutocomplete: jest.fn(),
}));

const { parseWorkflowYamlForAutocomplete } = jest.requireMock(
  '../../../../../common/lib/yaml/parse_workflow_yaml_for_autocomplete'
) as { parseWorkflowYamlForAutocomplete: jest.Mock };

describe('extractWorkflowMetadata', () => {
  const defaultMetadata = {
    enabled: false,
    stepCount: 0,
    connectorTypes: [],
    stepTypes: [],
    stepTypeCounts: {},
    triggerTypes: [],
    inputCount: 0,
    constCount: 0,
    triggerCount: 0,
    settingsUsed: [],
    hasDescription: false,
    tagCount: 0,
  };

  describe('null / undefined / empty workflow', () => {
    it('returns default metadata for null', () => {
      expect(extractWorkflowMetadata(null)).toEqual(defaultMetadata);
    });

    it('returns default metadata for undefined', () => {
      expect(extractWorkflowMetadata(undefined)).toEqual(defaultMetadata);
    });

    it('returns default metadata for an empty object', () => {
      expect(extractWorkflowMetadata({})).toEqual(defaultMetadata);
    });
  });

  describe('enabled flag', () => {
    it('returns enabled: true when workflow is enabled', () => {
      const result = extractWorkflowMetadata({ enabled: true } as Partial<WorkflowYaml>);
      expect(result.enabled).toBe(true);
    });

    it('returns enabled: false when workflow is disabled', () => {
      const result = extractWorkflowMetadata({ enabled: false } as Partial<WorkflowYaml>);
      expect(result.enabled).toBe(false);
    });

    it('returns enabled: false when enabled is not set', () => {
      const result = extractWorkflowMetadata({} as Partial<WorkflowYaml>);
      expect(result.enabled).toBe(false);
    });
  });

  describe('steps counting', () => {
    it('counts a single step', () => {
      const workflow: Partial<WorkflowYaml> = {
        steps: [{ name: 'step-1', type: 'console' }],
      } as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.stepCount).toBe(1);
      expect(result.stepTypes).toEqual(['console']);
      expect(result.stepTypeCounts).toEqual({ console: 1 });
    });

    it('counts multiple steps of different types', () => {
      const workflow: Partial<WorkflowYaml> = {
        steps: [
          { name: 'step-1', type: 'console' },
          { name: 'step-2', type: 'if' },
          { name: 'step-3', type: 'console' },
        ],
      } as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.stepCount).toBe(3);
      expect(result.stepTypes).toEqual(expect.arrayContaining(['console', 'if']));
      expect(result.stepTypeCounts).toEqual({ console: 2, if: 1 });
    });

    it('handles empty steps array', () => {
      const workflow: Partial<WorkflowYaml> = {
        steps: [],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.stepCount).toBe(0);
      expect(result.stepTypes).toEqual([]);
    });

    it('skips steps without a type field', () => {
      const workflow: Partial<WorkflowYaml> = {
        steps: [
          { name: 'step-1', type: 'console' },
          { name: 'step-2' } as unknown as WorkflowYaml['steps'][number],
        ],
      } as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.stepCount).toBe(1);
    });
  });

  describe('nested steps (foreach, if, else)', () => {
    it('counts steps nested inside a foreach step', () => {
      const workflow: Partial<WorkflowYaml> = {
        steps: [
          {
            name: 'loop',
            type: 'foreach',
            steps: [
              { name: 'inner-1', type: 'slack.webhook' },
              { name: 'inner-2', type: 'console' },
            ],
          },
        ],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      // foreach + inner-1 + inner-2
      expect(result.stepCount).toBe(3);
      expect(result.stepTypes).toEqual(
        expect.arrayContaining(['foreach', 'slack.webhook', 'console'])
      );
      expect(result.stepTypeCounts).toEqual({
        foreach: 1,
        'slack.webhook': 1,
        console: 1,
      });
    });

    it('counts steps in if/else branches', () => {
      const workflow: Partial<WorkflowYaml> = {
        steps: [
          {
            name: 'branch',
            type: 'if',
            steps: [{ name: 'then-step', type: 'console' }],
            else: [{ name: 'else-step', type: 'email.send' }],
          },
        ],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      // if + then-step + else-step
      expect(result.stepCount).toBe(3);
      expect(result.stepTypes).toEqual(expect.arrayContaining(['if', 'console', 'email.send']));
    });

    it('counts deeply nested steps', () => {
      const workflow: Partial<WorkflowYaml> = {
        steps: [
          {
            name: 'outer-loop',
            type: 'foreach',
            steps: [
              {
                name: 'inner-branch',
                type: 'if',
                steps: [{ name: 'deep-step', type: 'slack.postMessage' }],
              },
            ],
          },
        ],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      // foreach + if + deep-step
      expect(result.stepCount).toBe(3);
    });
  });

  describe('on-failure / iteration-on-failure fallback steps', () => {
    it('counts steps in on-failure fallback', () => {
      const workflow: Partial<WorkflowYaml> = {
        steps: [
          {
            name: 'risky-step',
            type: 'console',
            'on-failure': {
              fallback: [{ name: 'fallback-1', type: 'email.send' }],
            },
          },
        ],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      // risky-step + fallback-1
      expect(result.stepCount).toBe(2);
      expect(result.stepTypes).toEqual(expect.arrayContaining(['console', 'email.send']));
    });

    it('counts steps in iteration-on-failure fallback', () => {
      const workflow: Partial<WorkflowYaml> = {
        steps: [
          {
            name: 'loop',
            type: 'foreach',
            'iteration-on-failure': {
              fallback: [{ name: 'iter-fallback', type: 'console' }],
            },
            steps: [],
          },
        ],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      // foreach + iter-fallback
      expect(result.stepCount).toBe(2);
    });

    it('ignores on-failure without fallback array', () => {
      const workflow: Partial<WorkflowYaml> = {
        steps: [
          {
            name: 'step-1',
            type: 'console',
            'on-failure': { retry: { 'max-attempts': 3 } },
          },
        ],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.stepCount).toBe(1);
    });
  });

  describe('connector types', () => {
    it('extracts connector types from steps with connector-id', () => {
      const workflow: Partial<WorkflowYaml> = {
        steps: [
          { name: 'step-1', type: 'slack.webhook', 'connector-id': 'conn-1' },
          { name: 'step-2', type: 'slack.postMessage', 'connector-id': 'conn-2' },
          { name: 'step-3', type: 'email.send', 'connector-id': 'conn-3' },
        ],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.connectorTypes).toEqual(expect.arrayContaining(['slack', 'email']));
      // Slack should appear only once despite two slack steps
      expect(result.connectorTypes.filter((c) => c === 'slack')).toHaveLength(1);
    });

    it('does not include non-connector steps in connectorTypes', () => {
      const workflow: Partial<WorkflowYaml> = {
        steps: [
          { name: 'step-1', type: 'foreach' },
          { name: 'step-2', type: 'console' },
        ],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.connectorTypes).toEqual([]);
    });

    it('does not include steps with undefined connector-id', () => {
      const workflow: Partial<WorkflowYaml> = {
        steps: [{ name: 'step-1', type: 'slack.webhook', 'connector-id': undefined }],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.connectorTypes).toEqual([]);
    });

    it('extracts connector name as part before the dot', () => {
      const workflow: Partial<WorkflowYaml> = {
        steps: [{ name: 'step-1', type: 'jira.createIssue', 'connector-id': 'conn-1' }],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.connectorTypes).toEqual(['jira']);
    });
  });

  describe('triggers', () => {
    it('extracts trigger types from workflow triggers', () => {
      const workflow: Partial<WorkflowYaml> = {
        triggers: [{ type: 'scheduled' }, { type: 'alert' }],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.triggerTypes).toEqual(expect.arrayContaining(['scheduled', 'alert']));
      expect(result.triggerCount).toBe(2);
    });

    it('deduplicates trigger types', () => {
      const workflow: Partial<WorkflowYaml> = {
        triggers: [{ type: 'alert' }, { type: 'alert' }, { type: 'scheduled' }],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.triggerTypes).toEqual(expect.arrayContaining(['alert', 'scheduled']));
      expect(result.triggerTypes).toHaveLength(2);
      expect(result.triggerCount).toBe(3);
    });

    it('handles empty triggers array', () => {
      const workflow: Partial<WorkflowYaml> = {
        triggers: [],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.triggerTypes).toEqual([]);
      expect(result.triggerCount).toBe(0);
    });

    it('skips triggers without a type', () => {
      const workflow: Partial<WorkflowYaml> = {
        triggers: [{ type: 'scheduled' }, {} as { type: string }],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.triggerTypes).toEqual(['scheduled']);
      expect(result.triggerCount).toBe(2);
    });
  });

  describe('inputs', () => {
    it('counts inputs from array', () => {
      const workflow: Partial<WorkflowYaml> = {
        inputs: [
          { name: 'input-1', type: 'string' },
          { name: 'input-2', type: 'number' },
        ],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.inputCount).toBe(2);
    });

    it('returns 0 for undefined inputs', () => {
      const result = extractWorkflowMetadata({});
      expect(result.inputCount).toBe(0);
    });

    it('returns 0 for non-array inputs (e.g., JSON schema object)', () => {
      const workflow: Partial<WorkflowYaml> = {
        inputs: { properties: { a: { type: 'string' } } },
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.inputCount).toBe(0);
    });
  });

  describe('constants', () => {
    it('counts constants from consts object', () => {
      const workflow = {
        consts: { API_KEY: 'abc', BASE_URL: 'https://example.com' },
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.constCount).toBe(2);
    });

    it('returns 0 when consts is not set', () => {
      const result = extractWorkflowMetadata({});
      expect(result.constCount).toBe(0);
    });

    it('returns 0 for empty consts object', () => {
      const workflow = { consts: {} } as unknown as Partial<WorkflowYaml>;
      const result = extractWorkflowMetadata(workflow);
      expect(result.constCount).toBe(0);
    });
  });

  describe('settings', () => {
    it('extracts concurrency settings', () => {
      const workflow: Partial<WorkflowYaml> = {
        settings: {
          concurrency: { max: 5, strategy: 'queue' },
        },
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.concurrencyMax).toBe(5);
      expect(result.concurrencyStrategy).toBe('queue');
      expect(result.settingsUsed).toEqual(['concurrency']);
    });

    it('does not include concurrencyMax/concurrencyStrategy when not set', () => {
      const workflow: Partial<WorkflowYaml> = {
        settings: { timeout: '30s' },
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result).not.toHaveProperty('concurrencyMax');
      expect(result).not.toHaveProperty('concurrencyStrategy');
      expect(result.settingsUsed).toEqual(['timeout']);
    });

    it('extracts multiple settings keys', () => {
      const workflow: Partial<WorkflowYaml> = {
        settings: {
          timeout: '30s',
          concurrency: { max: 3, strategy: 'drop' },
          'on-failure': { retry: { 'max-attempts': 3 } },
        },
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.settingsUsed).toEqual(
        expect.arrayContaining(['timeout', 'concurrency', 'on-failure'])
      );
      expect(result.settingsUsed).toHaveLength(3);
    });

    it('returns empty settingsUsed when settings is not set', () => {
      const result = extractWorkflowMetadata({});
      expect(result.settingsUsed).toEqual([]);
    });

    it('returns empty settingsUsed for empty settings object', () => {
      const workflow: Partial<WorkflowYaml> = {
        settings: {},
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.settingsUsed).toEqual([]);
    });

    it('handles concurrency with only max (no strategy)', () => {
      const workflow: Partial<WorkflowYaml> = {
        settings: {
          concurrency: { max: 10 },
        },
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.concurrencyMax).toBe(10);
      expect(result).not.toHaveProperty('concurrencyStrategy');
    });
  });

  describe('description', () => {
    it('returns hasDescription: true when description is present', () => {
      const workflow: Partial<WorkflowYaml> = {
        description: 'My workflow description',
      } as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.hasDescription).toBe(true);
    });

    it('returns hasDescription: false for empty string', () => {
      const workflow: Partial<WorkflowYaml> = {
        description: '',
      } as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.hasDescription).toBe(false);
    });

    it('returns hasDescription: false for whitespace-only string', () => {
      const workflow: Partial<WorkflowYaml> = {
        description: '   ',
      } as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.hasDescription).toBe(false);
    });

    it('returns hasDescription: false when description is not set', () => {
      const result = extractWorkflowMetadata({});
      expect(result.hasDescription).toBe(false);
    });
  });

  describe('tags', () => {
    it('counts tags', () => {
      const workflow = {
        tags: ['production', 'security', 'alert'],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);
      expect(result.tagCount).toBe(3);
    });

    it('returns 0 for undefined tags', () => {
      const result = extractWorkflowMetadata({});
      expect(result.tagCount).toBe(0);
    });

    it('returns 0 for empty tags array', () => {
      const workflow = { tags: [] } as unknown as Partial<WorkflowYaml>;
      const result = extractWorkflowMetadata(workflow);
      expect(result.tagCount).toBe(0);
    });
  });

  describe('complex workflow', () => {
    it('correctly extracts metadata from a full workflow definition', () => {
      const workflow = {
        enabled: true,
        description: 'A complex workflow',
        tags: ['prod', 'alerts'],
        triggers: [{ type: 'scheduled' }, { type: 'alert' }],
        inputs: [
          { name: 'input-1', type: 'string' },
          { name: 'input-2', type: 'number' },
          { name: 'input-3', type: 'boolean' },
        ],
        consts: { API_KEY: 'abc', TIMEOUT: 30 },
        settings: {
          timeout: '60s',
          concurrency: { max: 3, strategy: 'cancel-in-progress' },
        },
        steps: [
          { name: 'step-1', type: 'slack.webhook', 'connector-id': 'slack-conn' },
          {
            name: 'step-2',
            type: 'foreach',
            steps: [
              { name: 'step-2-1', type: 'email.send', 'connector-id': 'email-conn' },
              {
                name: 'step-2-2',
                type: 'if',
                steps: [{ name: 'step-2-2-1', type: 'console' }],
                else: [
                  { name: 'step-2-2-2', type: 'slack.postMessage', 'connector-id': 'slack-conn-2' },
                ],
              },
            ],
          },
          {
            name: 'step-3',
            type: 'console',
            'on-failure': {
              fallback: [{ name: 'fb-1', type: 'email.send', 'connector-id': 'email-conn-2' }],
            },
          },
        ],
      } as unknown as Partial<WorkflowYaml>;

      const result = extractWorkflowMetadata(workflow);

      expect(result.enabled).toBe(true);
      expect(result.hasDescription).toBe(true);
      expect(result.tagCount).toBe(2);
      expect(result.triggerCount).toBe(2);
      expect(result.triggerTypes).toEqual(expect.arrayContaining(['scheduled', 'alert']));
      expect(result.inputCount).toBe(3);
      expect(result.constCount).toBe(2);
      expect(result.concurrencyMax).toBe(3);
      expect(result.concurrencyStrategy).toBe('cancel-in-progress');
      expect(result.settingsUsed).toEqual(expect.arrayContaining(['timeout', 'concurrency']));

      // Steps: step-1, step-2(foreach), step-2-1, step-2-2(if), step-2-2-1, step-2-2-2, step-3, fb-1
      expect(result.stepCount).toBe(8);
      expect(result.stepTypes).toEqual(
        expect.arrayContaining([
          'slack.webhook',
          'foreach',
          'email.send',
          'if',
          'console',
          'slack.postMessage',
        ])
      );
      expect(result.stepTypeCounts).toEqual({
        'slack.webhook': 1,
        foreach: 1,
        'email.send': 2,
        if: 1,
        console: 2,
        'slack.postMessage': 1,
      });
      expect(result.connectorTypes).toEqual(expect.arrayContaining(['slack', 'email']));
      expect(result.connectorTypes).toHaveLength(2);
    });
  });
});

describe('extractStepInfoFromWorkflowYaml', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null for null yaml', () => {
    expect(extractStepInfoFromWorkflowYaml(null, 'step-1')).toBeNull();
  });

  it('returns null for undefined yaml', () => {
    expect(extractStepInfoFromWorkflowYaml(undefined, 'step-1')).toBeNull();
  });

  it('returns null for empty string yaml', () => {
    expect(extractStepInfoFromWorkflowYaml('', 'step-1')).toBeNull();
  });

  it('returns null when parsing fails', () => {
    parseWorkflowYamlForAutocomplete.mockReturnValue({
      success: false,
      error: new Error('parse error'),
    });

    expect(extractStepInfoFromWorkflowYaml('invalid: yaml', 'step-1')).toBeNull();
  });

  it('returns step info for a found step', () => {
    parseWorkflowYamlForAutocomplete.mockReturnValue({
      success: true,
      data: {
        id: 'workflow-1',
        steps: [
          { name: 'step-1', type: 'slack.webhook', 'connector-id': 'conn-1' },
          { name: 'step-2', type: 'console' },
        ],
      },
    });

    const result = extractStepInfoFromWorkflowYaml('valid: yaml', 'step-1');
    expect(result).toEqual({
      stepType: 'slack.webhook',
      connectorType: 'slack.webhook',
      workflowId: 'workflow-1',
    });
  });

  it('returns step info without connectorType for non-connector steps', () => {
    parseWorkflowYamlForAutocomplete.mockReturnValue({
      success: true,
      data: {
        id: 'workflow-2',
        steps: [{ name: 'step-1', type: 'console' }],
      },
    });

    const result = extractStepInfoFromWorkflowYaml('valid: yaml', 'step-1');
    expect(result).toEqual({
      stepType: 'console',
      connectorType: undefined,
      workflowId: 'workflow-2',
    });
  });

  it('returns unknown stepType when step is not found', () => {
    parseWorkflowYamlForAutocomplete.mockReturnValue({
      success: true,
      data: {
        id: 'workflow-3',
        steps: [{ name: 'step-1', type: 'console' }],
      },
    });

    const result = extractStepInfoFromWorkflowYaml('valid: yaml', 'non-existent');
    expect(result).toEqual({
      stepType: 'unknown',
      workflowId: 'workflow-3',
    });
  });

  it('finds steps in nested structures', () => {
    parseWorkflowYamlForAutocomplete.mockReturnValue({
      success: true,
      data: {
        id: 'workflow-4',
        steps: [
          {
            name: 'loop',
            type: 'foreach',
            steps: [{ name: 'nested-step', type: 'email.send', 'connector-id': 'email-1' }],
          },
        ],
      },
    });

    const result = extractStepInfoFromWorkflowYaml('valid: yaml', 'nested-step');
    expect(result).toEqual({
      stepType: 'email.send',
      connectorType: 'email.send',
      workflowId: 'workflow-4',
    });
  });

  it('finds steps in else branches', () => {
    parseWorkflowYamlForAutocomplete.mockReturnValue({
      success: true,
      data: {
        id: 'workflow-5',
        steps: [
          {
            name: 'branch',
            type: 'if',
            steps: [{ name: 'then-step', type: 'console' }],
            else: [{ name: 'else-step', type: 'slack.webhook', 'connector-id': 'conn-1' }],
          },
        ],
      },
    });

    const result = extractStepInfoFromWorkflowYaml('valid: yaml', 'else-step');
    expect(result).toEqual({
      stepType: 'slack.webhook',
      connectorType: 'slack.webhook',
      workflowId: 'workflow-5',
    });
  });

  it('finds steps in on-failure fallback', () => {
    parseWorkflowYamlForAutocomplete.mockReturnValue({
      success: true,
      data: {
        id: 'workflow-6',
        steps: [
          {
            name: 'risky',
            type: 'console',
            'on-failure': {
              fallback: [{ name: 'fallback-step', type: 'email.send', 'connector-id': 'e-1' }],
            },
          },
        ],
      },
    });

    const result = extractStepInfoFromWorkflowYaml('valid: yaml', 'fallback-step');
    expect(result).toEqual({
      stepType: 'email.send',
      connectorType: 'email.send',
      workflowId: 'workflow-6',
    });
  });

  it('handles workflow without id', () => {
    parseWorkflowYamlForAutocomplete.mockReturnValue({
      success: true,
      data: {
        steps: [{ name: 'step-1', type: 'console' }],
      },
    });

    const result = extractStepInfoFromWorkflowYaml('valid: yaml', 'step-1');
    expect(result).toEqual({
      stepType: 'console',
      connectorType: undefined,
      workflowId: undefined,
    });
  });

  it('handles workflow with no steps', () => {
    parseWorkflowYamlForAutocomplete.mockReturnValue({
      success: true,
      data: {
        id: 'workflow-7',
      },
    });

    const result = extractStepInfoFromWorkflowYaml('valid: yaml', 'step-1');
    expect(result).toEqual({
      stepType: 'unknown',
      workflowId: 'workflow-7',
    });
  });
});
