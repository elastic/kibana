/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_ACTION_WORKFLOW_IDS } from '.';
import { ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID } from './constants';
import { managedWorkflowDefinitions } from '../..';
import { WorkflowExecuteStepInputSchema } from '../../../spec/schema';

interface YamlStep {
  name: string;
  type: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  default?: YamlStep[];
  cases?: Array<{ steps: YamlStep[] }>;
  'on-failure'?: { fallback?: YamlStep[] };
}

const flatten = (steps: YamlStep[] = []): YamlStep[] =>
  steps.flatMap((step) => [
    step,
    ...flatten(step.steps),
    ...flatten(step.else),
    ...flatten(step.default),
    ...(step.cases ?? []).flatMap(({ steps: caseSteps }) => flatten(caseSteps)),
    ...flatten(step['on-failure']?.fallback),
  ]);

// A superset of every Worker's template values; each renderer reads only its own.
const TEMPLATE_VALUES = {
  autonomyLevel: 'supervised',
  scheduleInterval: '24h',
  settingsVersion: 1,
  serviceAccountId: 'alertzero-worker',
  extras: { analysisWindowDays: 7, fpCountThreshold: 5, fpRateThresholdPct: 50 },
};

const actionIds: readonly string[] = ALERTZERO_ACTION_WORKFLOW_IDS;

const childCalls = managedWorkflowDefinitions
  .filter(({ pluginId }) => pluginId === ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID)
  .flatMap((definition) => {
    const yaml =
      'yamlTemplate' in definition
        ? (definition.yamlTemplate as (values: typeof TEMPLATE_VALUES) => string)(TEMPLATE_VALUES)
        : definition.yaml;
    return flatten((parse(yaml) as { steps: YamlStep[] }).steps)
      .filter(({ type }) => type === 'workflow.execute' || type === 'workflow.executeAsync')
      .map((step) => ({ owner: definition.id, step }));
  });

// Workers run as their service account, and every child they start, directly or
// transitively, runs as that same account. The engine allows that only when the
// calling step names the child and `run-as-mode` literally.
describe('AlertZero service account inheritance', () => {
  const workerChainCalls = childCalls.filter(({ owner }) => !actionIds.includes(owner));
  const actionCalls = childCalls.filter(({ owner }) => actionIds.includes(owner));

  it('finds child calls in both worker chains and actions', () => {
    expect(workerChainCalls.length).toBeGreaterThan(0);
    expect(actionCalls.length).toBeGreaterThan(0);
  });

  // The step input schema is not strict, so a misspelled identity key is silently
  // ignored and the child runs as the original caller. Strict parsing catches it.
  it.each(childCalls.map(({ owner, step }) => [owner, step.name, step] as const))(
    '%s step %s uses only known workflow.execute inputs',
    (_owner, _name, step) => {
      const result = WorkflowExecuteStepInputSchema.strict().safeParse(step.with);

      expect(result.success ? null : result.error.issues).toBeNull();
    }
  );

  it.each(workerChainCalls.map(({ owner, step }) => [owner, step.name, step] as const))(
    '%s step %s inherits the parent service account by literal id',
    (_owner, _name, step) => {
      expect(step.with?.['run-as-mode']).toBe('inherit');
      expect(String(step.with?.['workflow-id'])).not.toContain('{{');
    }
  );

  // A proposal starts its action by a templated id, so the action never runs as a
  // service account, and `inherit` inside it would fail every approved action.
  it.each(actionCalls.map(({ owner, step }) => [owner, step.name, step] as const))(
    'action %s step %s keeps the default identity',
    (_owner, _name, step) => {
      expect(step.with?.['run-as-mode']).toBeUndefined();
    }
  );
});
