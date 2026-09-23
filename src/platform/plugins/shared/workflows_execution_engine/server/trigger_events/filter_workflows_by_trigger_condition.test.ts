/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowDetailDto } from '@kbn/workflows';
import {
  classifyWorkflowTriggerMatch,
  workflowMatchesTriggerCondition,
} from './filter_workflows_by_trigger_condition';

/** Definition overrides for tests; allows custom trigger types (e.g. cases.updated). */
interface TestDefinitionOverrides {
  triggers?: Array<{ type: string; 'connector-id'?: string; on?: { condition?: string } }>;
  steps?: unknown[];
}

const createMockWorkflow = (
  overrides: Omit<Partial<WorkflowDetailDto>, 'definition'> & {
    definition?: TestDefinitionOverrides;
  } = {}
): WorkflowDetailDto =>
  ({
    id: 'wf-1',
    name: 'Test Workflow',
    enabled: true,
    definition: {
      triggers: [{ type: 'cases.updated' }],
      steps: [],
      ...overrides.definition,
    } as WorkflowDetailDto['definition'],
    ...overrides,
  } as WorkflowDetailDto);

describe('workflowMatchesTriggerCondition', () => {
  const mockLogger: Logger = {
    warn: jest.fn(),
  } as unknown as Logger;

  it('should return false when workflow has no triggers', () => {
    const workflow = createMockWorkflow({ definition: { triggers: [], steps: [] } });
    expect(workflowMatchesTriggerCondition(workflow, 'cases.updated', { severity: 'high' })).toBe(
      false
    );
  });

  it('should return false when workflow definition has no triggers', () => {
    const workflow = createMockWorkflow({ definition: { triggers: undefined as any, steps: [] } });
    expect(workflowMatchesTriggerCondition(workflow, 'cases.updated', {})).toBe(false);
  });

  it('should return false when no trigger matches the triggerId', () => {
    const workflow = createMockWorkflow({
      definition: { triggers: [{ type: 'manual' }], steps: [] },
    });
    expect(workflowMatchesTriggerCondition(workflow, 'cases.updated', {})).toBe(false);
  });

  it('should return true when trigger type matches and has no condition', () => {
    const workflow = createMockWorkflow({
      definition: { triggers: [{ type: 'cases.updated' }], steps: [] },
    });
    expect(workflowMatchesTriggerCondition(workflow, 'cases.updated', { caseId: '123' })).toBe(
      true
    );
  });

  it('should return true when trigger type matches and KQL condition matches payload', () => {
    const workflow = createMockWorkflow({
      definition: {
        triggers: [
          {
            type: 'cases.updated',
            on: { condition: 'event.severity: "high"' },
          },
        ],
        steps: [],
      },
    });
    expect(
      workflowMatchesTriggerCondition(workflow, 'cases.updated', { severity: 'high' }, mockLogger)
    ).toBe(true);
  });

  it('should return false when trigger type matches but KQL condition does not match payload', () => {
    const workflow = createMockWorkflow({
      definition: {
        triggers: [
          {
            type: 'cases.updated',
            on: { condition: 'event.severity: "high"' },
          },
        ],
        steps: [],
      },
    });
    expect(
      workflowMatchesTriggerCondition(workflow, 'cases.updated', { severity: 'low' }, mockLogger)
    ).toBe(false);
  });

  it('should return false and log when KQL condition throws', () => {
    const workflow = createMockWorkflow({
      definition: {
        triggers: [
          {
            type: 'cases.updated',
            on: { condition: 'invalid ( unclosed' },
          },
        ],
        steps: [],
      },
    });
    expect(workflowMatchesTriggerCondition(workflow, 'cases.updated', {}, mockLogger)).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should evaluate complex KQL with AND, OR, and NOT', () => {
    const workflow = createMockWorkflow({
      definition: {
        triggers: [
          {
            type: 'cases.updated',
            on: {
              condition:
                'event.severity: "high" and (event.category: "alerts" or event.category: "notifications") and not event.source: "legacy"',
            },
          },
        ],
        steps: [],
      },
    });

    expect(
      workflowMatchesTriggerCondition(
        workflow,
        'cases.updated',
        { severity: 'high', category: 'alerts', source: 'api' },
        mockLogger
      )
    ).toBe(true);

    expect(
      workflowMatchesTriggerCondition(
        workflow,
        'cases.updated',
        { severity: 'high', category: 'notifications', source: 'api' },
        mockLogger
      )
    ).toBe(true);

    expect(
      workflowMatchesTriggerCondition(
        workflow,
        'cases.updated',
        { severity: 'high', category: 'alerts', source: 'legacy' },
        mockLogger
      )
    ).toBe(false);

    expect(
      workflowMatchesTriggerCondition(
        workflow,
        'cases.updated',
        { severity: 'low', category: 'alerts', source: 'api' },
        mockLogger
      )
    ).toBe(false);

    expect(
      workflowMatchesTriggerCondition(
        workflow,
        'cases.updated',
        { severity: 'high', category: 'audit', source: 'api' },
        mockLogger
      )
    ).toBe(false);
  });

  it('should match when condition uses array field like Elasticsearch multi-valued semantics', () => {
    const workflow = createMockWorkflow({
      definition: {
        triggers: [
          {
            type: 'example.customTrigger',
            on: {
              condition: 'event.category: "alerts" and event.labels: "demo"',
            },
          },
        ],
        steps: [],
      },
    });
    expect(
      workflowMatchesTriggerCondition(
        workflow,
        'example.customTrigger',
        { category: 'alerts', labels: ['example', 'demo'], message: 'x', another: 'y' },
        mockLogger
      )
    ).toBe(true);
    expect(
      workflowMatchesTriggerCondition(
        workflow,
        'example.customTrigger',
        { category: 'alerts', labels: ['example'], message: 'x', another: 'y' },
        mockLogger
      )
    ).toBe(false);
  });
});

describe('classifyWorkflowTriggerMatch', () => {
  const mockLogger: Logger = {
    warn: jest.fn(),
  } as unknown as Logger;

  it('returns disabled when workflow is not enabled', () => {
    const workflow = createMockWorkflow({ enabled: false });
    expect(classifyWorkflowTriggerMatch(workflow, 'cases.updated', {}, mockLogger)).toBe(
      'disabled'
    );
  });

  it('returns kql_false when condition does not match', () => {
    const workflow = createMockWorkflow({
      definition: {
        triggers: [
          {
            type: 'cases.updated',
            on: { condition: 'event.severity: "high"' },
          },
        ],
        steps: [],
      },
    });
    expect(
      classifyWorkflowTriggerMatch(workflow, 'cases.updated', { severity: 'low' }, mockLogger)
    ).toBe('kql_false');
  });

  it('returns kql_error when KQL throws', () => {
    const workflow = createMockWorkflow({
      definition: {
        triggers: [
          {
            type: 'cases.updated',
            on: { condition: 'invalid ( unclosed' },
          },
        ],
        steps: [],
      },
    });
    expect(classifyWorkflowTriggerMatch(workflow, 'cases.updated', {}, mockLogger)).toBe(
      'kql_error'
    );
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('returns matched when trigger has no condition', () => {
    const workflow = createMockWorkflow({
      definition: { triggers: [{ type: 'cases.updated' }], steps: [] },
    });
    expect(classifyWorkflowTriggerMatch(workflow, 'cases.updated', {}, mockLogger)).toBe('matched');
  });

  describe('requiresConnectorId', () => {
    const connectorEventOptions = { requiresConnectorId: true };

    it('returns matched when YAML connector-id equals payload connectorId', () => {
      const workflow = createMockWorkflow({
        definition: {
          triggers: [{ type: 'inboundWebhook.received', 'connector-id': 'webhook-1' }],
          steps: [],
        },
      });
      expect(
        classifyWorkflowTriggerMatch(
          workflow,
          'inboundWebhook.received',
          { connectorId: 'webhook-1' },
          mockLogger,
          connectorEventOptions
        )
      ).toBe('matched');
    });

    it('returns connector_id_mismatch when YAML connector-id differs', () => {
      const workflow = createMockWorkflow({
        definition: {
          triggers: [
            {
              type: 'inboundWebhook.received',
              'connector-id': 'webhook-1',
              on: { condition: 'event.body.action: created' },
            },
          ],
          steps: [],
        },
      });
      expect(
        classifyWorkflowTriggerMatch(
          workflow,
          'inboundWebhook.received',
          { connectorId: 'webhook-2', body: { action: 'created' } },
          mockLogger,
          connectorEventOptions
        )
      ).toBe('connector_id_mismatch');
    });

    it('returns connector_id_mismatch when YAML connector-id is missing or empty', () => {
      const missing = createMockWorkflow({
        definition: { triggers: [{ type: 'inboundWebhook.received' }], steps: [] },
      });
      const empty = createMockWorkflow({
        definition: {
          triggers: [{ type: 'inboundWebhook.received', 'connector-id': '   ' }],
          steps: [],
        },
      });
      expect(
        classifyWorkflowTriggerMatch(
          missing,
          'inboundWebhook.received',
          { connectorId: 'webhook-1' },
          mockLogger,
          connectorEventOptions
        )
      ).toBe('connector_id_mismatch');
      expect(
        classifyWorkflowTriggerMatch(
          empty,
          'inboundWebhook.received',
          { connectorId: 'webhook-1' },
          mockLogger,
          connectorEventOptions
        )
      ).toBe('connector_id_mismatch');
    });

    it('returns connector_id_mismatch when payload connectorId is missing', () => {
      const workflow = createMockWorkflow({
        definition: {
          triggers: [{ type: 'inboundWebhook.received', 'connector-id': 'webhook-1' }],
          steps: [],
        },
      });
      expect(
        classifyWorkflowTriggerMatch(
          workflow,
          'inboundWebhook.received',
          {},
          mockLogger,
          connectorEventOptions
        )
      ).toBe('connector_id_mismatch');
    });

    it('applies KQL after a connector-id match', () => {
      const workflow = createMockWorkflow({
        definition: {
          triggers: [
            {
              type: 'inboundWebhook.received',
              'connector-id': 'webhook-1',
              on: { condition: 'event.body.action: created' },
            },
          ],
          steps: [],
        },
      });
      expect(
        classifyWorkflowTriggerMatch(
          workflow,
          'inboundWebhook.received',
          { connectorId: 'webhook-1', body: { action: 'created' } },
          mockLogger,
          connectorEventOptions
        )
      ).toBe('matched');
      expect(
        classifyWorkflowTriggerMatch(
          workflow,
          'inboundWebhook.received',
          { connectorId: 'webhook-1', body: { action: 'deleted' } },
          mockLogger,
          connectorEventOptions
        )
      ).toBe('kql_false');
    });

    it('does not gate cases.updated or built-in triggers when the flag is off', () => {
      const workflow = createMockWorkflow({
        definition: {
          triggers: [{ type: 'cases.updated', 'connector-id': 'ignored' }],
          steps: [],
        },
      });
      expect(
        classifyWorkflowTriggerMatch(
          workflow,
          'cases.updated',
          { connectorId: 'other' },
          mockLogger
        )
      ).toBe('matched');
      expect(
        classifyWorkflowTriggerMatch(createMockWorkflow(), 'cases.updated', {}, mockLogger)
      ).toBe('matched');
    });

    it('matches the same-type trigger whose connector-id equals the payload, not the first block', () => {
      const workflow = createMockWorkflow({
        definition: {
          triggers: [
            {
              type: 'inboundWebhook.received',
              'connector-id': 'webhook-1',
              on: { condition: 'event.body.action: created' },
            },
            {
              type: 'inboundWebhook.received',
              'connector-id': 'webhook-2',
              on: { condition: 'event.body.action: paid' },
            },
          ],
          steps: [],
        },
      });
      expect(
        classifyWorkflowTriggerMatch(
          workflow,
          'inboundWebhook.received',
          { connectorId: 'webhook-2', body: { action: 'paid' } },
          mockLogger,
          connectorEventOptions
        )
      ).toBe('matched');
      expect(
        classifyWorkflowTriggerMatch(
          workflow,
          'inboundWebhook.received',
          { connectorId: 'webhook-2', body: { action: 'created' } },
          mockLogger,
          connectorEventOptions
        )
      ).toBe('kql_false');
    });
  });
});
