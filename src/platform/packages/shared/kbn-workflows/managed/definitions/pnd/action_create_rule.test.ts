/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERT_ZERO_ACTION_CREATE_RULE_WORKFLOW_ID } from './action_create_rule';
import ACTION_CREATE_RULE_YAML from './action_create_rule.yaml';
import POC_ACTION_WORKER_YAML from './poc_action_worker.yaml';

/** Local shape: the parsed YAML is untyped, and only these fields are asserted on. */
interface WorkflowStep {
  name?: string;
  type?: string;
  with?: Record<string, unknown>;
}

interface ParsedWorkflow {
  enabled: boolean;
  tags?: string[];
  consts?: Record<string, unknown>;
  triggers: Array<{ type: string; inputs?: { properties?: Record<string, unknown> } }>;
  steps: WorkflowStep[];
}

const actionWorkflow = parse(ACTION_CREATE_RULE_YAML) as ParsedWorkflow;
const workerWorkflow = parse(POC_ACTION_WORKER_YAML) as ParsedWorkflow;

describe('AlertZero create-rule action workflow', () => {
  it('carries the generic action tag so the catalog can be discovered by tag', () => {
    expect(actionWorkflow.tags).toContain('action');
  });

  it('declares its catalog metadata under consts, the only place the schema preserves', () => {
    expect(actionWorkflow.consts?.actionMetadata).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        category: 'tune',
        impact: 'low',
        reversible: true,
        approvalPolicy: 'always-gate',
      })
    );
  });

  it('takes a single actionInput object, matching the generic gate contract', () => {
    const properties = actionWorkflow.triggers.find(({ type }) => type === 'manual')?.inputs
      ?.properties;

    expect(Object.keys(properties ?? {})).toEqual(['actionInput']);
  });

  it('creates the rule through the registered security step rather than a raw request', () => {
    expect(actionWorkflow.steps.map(({ type }) => type)).toContain('security.createRule');
  });

  it('emits an explicit output, since workflow.execute cannot type the child result', () => {
    const output = actionWorkflow.steps.find(({ type }) => type === 'workflow.output') as {
      with?: Record<string, unknown>;
    };

    expect(Object.keys(output.with ?? {})).toEqual(expect.arrayContaining(['ruleId', 'ruleName']));
  });
});

describe('AlertZero PoC action worker', () => {
  it('ships disabled so it never runs unless someone turns it on', () => {
    expect(workerWorkflow.enabled).toBe(false);
  });

  it('constrains the agent to the known action workflow id', () => {
    const agentStep = workerWorkflow.steps.find(({ type }) => type === 'ai.agent') as {
      with?: { schema?: { properties?: { actionWorkflowId?: { enum?: string[] } } } };
    };

    expect(agentStep.with?.schema?.properties?.actionWorkflowId?.enum).toEqual([
      ALERT_ZERO_ACTION_CREATE_RULE_WORKFLOW_ID,
    ]);
  });

  it('delegates to the generic proposal gate, passing the conversation it created', () => {
    const execute = workerWorkflow.steps.find(({ type }) => type === 'workflow.execute') as {
      with?: { 'workflow-id'?: string; inputs?: Record<string, string> };
    };

    expect(execute.with?.['workflow-id']).toBe('system-create-conversation-proposal');
    expect(execute.with?.inputs?.conversationId).toContain(
      'steps.suggest_action.output.conversation_id'
    );
  });

  it('does not pass autoApprove, so the gate always runs', () => {
    const execute = workerWorkflow.steps.find(({ type }) => type === 'workflow.execute') as {
      with?: { inputs?: Record<string, string> };
    };

    expect(execute.with?.inputs?.autoApprove).toBeUndefined();
  });
});
