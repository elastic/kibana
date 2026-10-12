/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_SLACK_THREAD_WORKFLOW } from '.';
import { NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW } from './bound_slack_thread';
import { WorkflowSchema } from '../../../../spec/schema';

interface Step {
  name: string;
  type: string;
  with?: Record<string, unknown>;
  steps?: Step[];
}

const flatten = (steps: Step[]): Step[] =>
  steps.flatMap((step) => [step, ...flatten(step.steps ?? [])]);

describe('Nightshift bound Slack thread workflow', () => {
  const render = (spaceId: string) =>
    NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW.yamlTemplate({
      serviceAccountId: 'kibana/nightshift_investigator',
      spaceId,
    });

  it('runs as the service account and calls the bound investigation of its space', () => {
    const workflow = parse(render('obs'));
    const investigate = flatten(workflow.steps).find(({ name }) => name === 'investigate');

    expect(workflow.settings.run_as).toBe('kibana/nightshift_investigator');
    expect(investigate?.with?.['workflow-id']).toBe('system-nightshift-investigation-bound-obs');
    // The bound child runs with its own binding, so the call keeps the default identity mode.
    expect(investigate?.with?.['run-as-mode']).toBeUndefined();
    // Same schema outcome as the shared YAML: only run_as and the child id change.
    expect(WorkflowSchema.safeParse(workflow).success).toBe(
      WorkflowSchema.safeParse(parse(NIGHTSHIFT_SLACK_THREAD_WORKFLOW.yaml)).success
    );
  });

  it('refuses a value that is not a space id', () => {
    expect(() => render('Bad Space')).toThrow(/Invalid space id/);
  });
});
