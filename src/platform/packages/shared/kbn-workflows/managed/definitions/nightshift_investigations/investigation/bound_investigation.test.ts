/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW } from '.';
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

  it('renders the shared investigation YAML with settings.run_as', () => {
    const rendered = parse(render('kibana/nightshift_investigator'));
    const shared = parse(NIGHTSHIFT_INVESTIGATION_WORKFLOW.yaml);

    expect(rendered.settings.run_as).toBe('kibana/nightshift_investigator');
    expect({ ...rendered, settings: { ...rendered.settings, run_as: undefined } }).toEqual({
      ...shared,
      settings: { ...shared.settings, run_as: undefined },
    });
    expect(WorkflowSchema.safeParse(rendered).success).toBe(true);
  });

  it('quotes the account id so YAML special characters stay literal', () => {
    expect(parse(render('kibana/a: b')).settings.run_as).toBe('kibana/a: b');
  });

  it('refuses to render without an account', () => {
    expect(() => render('')).toThrow(/requires a serviceAccountId/);
  });
});
