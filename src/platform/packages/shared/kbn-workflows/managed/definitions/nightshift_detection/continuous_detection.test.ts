/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_CONTINUOUS_DETECTION_WORKFLOW } from './continuous_detection';

const SERVICE_ACCOUNT_ID = 'kibana/nightshift_detection';

const workflow = parse(
  NIGHTSHIFT_CONTINUOUS_DETECTION_WORKFLOW.yamlTemplate({ serviceAccountId: SERVICE_ACCOUNT_ID })
) as {
  enabled: boolean;
  settings: { run_as: string };
  triggers: Array<{ type: string; with: { every: string } }>;
  steps: Array<{ name: string; type: string; condition?: string; steps?: unknown[] }>;
};

describe('Nightshift continuous detection workflow', () => {
  // Anyone allowed to run workflows could otherwise run the engine as the service account.
  it('fails every run the schedule did not start, before it calls the engine', () => {
    const [guard, tick] = workflow.steps;

    expect(guard).toEqual({
      name: 'refuse_direct_runs',
      type: 'if',
      condition: 'not execution.triggeredBy : "scheduled"',
      steps: [expect.objectContaining({ name: 'refuse', type: 'workflow.fail' })],
    });
    expect(tick.name).toBe('tick');
  });

  it('runs every minute as the service account, which stays a quoted string', () => {
    expect(workflow.triggers).toEqual([{ type: 'scheduled', with: { every: '1m' } }]);
    expect(workflow.settings.run_as).toBe(SERVICE_ACCOUNT_ID);
  });

  it('is installed off, so the space setup decides when it starts', () => {
    expect(workflow.enabled).toBe(false);
  });
});
