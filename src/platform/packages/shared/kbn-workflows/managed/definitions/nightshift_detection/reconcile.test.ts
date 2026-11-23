/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_DETECTION_RECONCILE_WORKFLOW } from './reconcile';

const workflow = parse(
  NIGHTSHIFT_DETECTION_RECONCILE_WORKFLOW.yamlTemplate({
    serviceAccountId: 'kibana/nightshift_detection',
  })
) as {
  triggers: Array<{ type: string }>;
  steps: Array<{ name: string; type: string; condition?: string }>;
};

describe('Nightshift detection rule reconcile workflow', () => {
  // Anyone allowed to run workflows could otherwise change rules as the service account.
  it('fails every run its own triggers did not start, before it calls the engine', () => {
    const [guard] = workflow.steps;
    const triggerTypes = workflow.triggers.map(({ type }) => type);

    // A trigger the guard does not name would start runs that only ever fail.
    expect(guard.condition).toMatch(/^not \(/);
    triggerTypes.forEach((type) =>
      expect(guard.condition).toContain(`execution.triggeredBy : "${type}"`)
    );
    expect(workflow.steps.at(-1)?.type).toBe('kibana.request');
  });
});
