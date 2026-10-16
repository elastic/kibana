/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW, NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } from '.';
import {
  NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW,
  NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
} from './bound_investigation';
import { WorkflowSchema } from '../../../../spec/schema';

describe('Nightshift bound investigation workflow', () => {
  const render = (serviceAccountId: string) =>
    NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW.yamlTemplate({ serviceAccountId });

  it('is a dynamic, per-space definition owned by nightshiftInvestigations', () => {
    expect(NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW.id).toBe(
      NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID
    );
    expect(NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW.pluginId).toBe('nightshiftInvestigations');
    expect(NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW.management.lifecycle).toBe('dynamic');
  });

  it('runs as the service account and hands its inputs to the global investigation', () => {
    const rendered = parse(render('kibana/nightshift_investigator'));

    expect(rendered.settings.run_as).toBe('kibana/nightshift_investigator');
    expect(rendered.steps).toEqual([
      {
        name: 'investigate',
        type: 'workflow.execute',
        with: {
          'workflow-id': NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
          'run-as-mode': 'inherit',
          inputs: '${{ inputs }}',
        },
      },
    ]);
    expect(WorkflowSchema.safeParse(rendered).success).toBe(true);
  });

  it('names the investigation after its own run unless the caller names one', () => {
    const [trigger] = parse(render('kibana/nightshift_investigator')).triggers;

    expect(trigger.inputs.properties.investigation_id.default).toBe('{{ execution.id }}');
    expect(trigger.inputs.additionalProperties).toBe(true);
  });

  it('outlives the investigation it waits for', () => {
    const toMinutes = (timeout: string) => Number(timeout.replace(/m$/, ''));
    const wrapper = parse(render('kibana/nightshift_investigator'));
    const investigation = parse(NIGHTSHIFT_INVESTIGATION_WORKFLOW.yaml);

    expect(toMinutes(wrapper.settings.timeout)).toBeGreaterThan(
      toMinutes(investigation.settings.timeout)
    );
  });

  it('quotes the account id so YAML special characters stay literal', () => {
    expect(parse(render('kibana/a: b')).settings.run_as).toBe('kibana/a: b');
  });

  it('refuses to render without an account', () => {
    expect(() => render('')).toThrow(/requires a serviceAccountId/);
  });
});
