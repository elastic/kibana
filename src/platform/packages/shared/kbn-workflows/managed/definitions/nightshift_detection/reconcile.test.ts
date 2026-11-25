/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  NIGHTSHIFT_DETECTION_RECONCILE_WORKFLOW,
  NIGHTSHIFT_DETECTION_SOURCE_CHANGED,
} from './reconcile';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';

const workflow = parse(
  NIGHTSHIFT_DETECTION_RECONCILE_WORKFLOW.yamlTemplate({
    serviceAccountId: 'kibana/nightshift_detection',
  })
) as {
  settings: { concurrency: { key: string } };
  triggers: Array<{ type: string }>;
  steps: Array<{ name: string; type: string; condition?: string }>;
};

// Its triggers, plus the start the engine makes from server code when a source changes.
const allowedStarts = [
  ...workflow.triggers.map(({ type }) => type),
  NIGHTSHIFT_DETECTION_SOURCE_CHANGED,
];

describe('Nightshift detection rule reconcile workflow', () => {
  // Anyone allowed to run workflows could otherwise change rules as the service account.
  it('fails every run it does not start itself, before it calls the engine', () => {
    const [guard] = workflow.steps;

    // A start the guard does not name would only ever fail.
    expect(guard.condition).toMatch(/^not \(/);
    allowedStarts.forEach((type) =>
      expect(guard.condition).toContain(`execution.triggeredBy : "${type}"`)
    );
    expect(workflow.steps.some(({ type }) => type === 'kibana.request')).toBe(true);
  });

  // The route answers 200 for these, so without the step the run would show green.
  it('fails a run whose reconciliation was busy or partly failed, and only those', () => {
    const condition = workflow.steps.at(-1)?.condition ?? '';
    const isFailed = (output: Record<string, unknown>) =>
      createWorkflowLiquidEngine().evalValueSync(condition.slice(3, -2), {
        steps: { reconcile: { output } },
      });
    const completed = { status: 'completed', failures: [], strategy_errors: [] };

    expect(isFailed(completed)).toBe(false);
    expect(isFailed({ status: 'busy' })).toBe(true);
    expect(isFailed({ ...completed, failures: [{ rule_id: 'a' }] })).toBe(true);
    expect(isFailed({ ...completed, strategy_errors: [{ strategy: 'a' }] })).toBe(true);
  });

  // The group is applied before the guard runs, so a refused run sharing it would cancel the
  // reconciliation in flight.
  it('keeps a refused run out of the concurrency group its own starts share', () => {
    const engine = createWorkflowLiquidEngine();
    const groupOf = (triggeredBy: string) =>
      engine.parseAndRenderSync(workflow.settings.concurrency.key, { execution: { triggeredBy } });
    const [firstStart, ...otherStarts] = allowedStarts.map(groupOf);

    otherStarts.forEach((group) => expect(group).toBe(firstStart));
    expect(groupOf('manual')).not.toBe(firstStart);
  });
});
