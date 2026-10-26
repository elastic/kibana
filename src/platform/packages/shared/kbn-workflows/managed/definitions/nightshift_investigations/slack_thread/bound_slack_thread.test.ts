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

describe('Nightshift bound Slack thread workflow', () => {
  const render = () =>
    NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW.yamlTemplate({
      serviceAccountId: 'kibana/nightshift_agent',
    });

  it('renders the shared Slack thread YAML with settings.run_as', () => {
    const rendered = parse(render());
    const shared = parse(NIGHTSHIFT_SLACK_THREAD_WORKFLOW.yaml);

    expect(rendered.settings.run_as).toBe('kibana/nightshift_agent');
    expect({ ...rendered, settings: { ...rendered.settings, run_as: undefined } }).toEqual({
      ...shared,
      settings: { ...shared.settings, run_as: undefined },
    });
    expect(WorkflowSchema.safeParse(rendered).success).toBe(
      WorkflowSchema.safeParse(shared).success
    );
  });

  it('leaves the global copy unbound', () => {
    expect(NIGHTSHIFT_SLACK_THREAD_WORKFLOW.yaml).not.toContain('run_as');
    expect(parse(NIGHTSHIFT_SLACK_THREAD_WORKFLOW.yaml).settings.run_as).toBeUndefined();
  });

  it('refuses to render without an account', () => {
    expect(() =>
      NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW.yamlTemplate({ serviceAccountId: '' })
    ).toThrow(/requires a serviceAccountId/);
  });
});
