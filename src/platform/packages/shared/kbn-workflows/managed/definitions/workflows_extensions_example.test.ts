/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import { parse } from 'yaml';
import type { ServiceAccountWorkflowTemplateValues } from './workflows_extensions_example';
import { EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID } from './workflows_extensions_example';
import { getManagedWorkflowDefinitions } from '..';
import { requiresDelegatedIdentity } from '../../definition/requires_delegated_identity';
import type { WorkflowYaml } from '../../spec/schema';

const render = (values: ServiceAccountWorkflowTemplateValues) => {
  const definition = getManagedWorkflowDefinitions().find(
    (d) => d.id === EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID
  );
  if (!definition?.yamlTemplate) throw new Error('expected yamlTemplate');
  return { definition: parse(definition.yamlTemplate(values)) as unknown as WorkflowYaml };
};

describe(`${EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID} conditionalChild`, () => {
  it('unconditional inherit parent is flagged by requiresDelegatedIdentity', () => {
    const wf = render({ childWorkflowId: 'system-example-child', runAsMode: 'inherit' });
    expect(requiresDelegatedIdentity(wf)).toBe(true);
  });

  it('conditionalChild parent is not flagged (step-level if on the inherit)', () => {
    const wf = render({
      childWorkflowId: 'system-example-child',
      runAsMode: 'inherit',
      conditionalChild: true,
    });
    expect(requiresDelegatedIdentity(wf)).toBe(false);
    const childStep = (
      wf.definition.steps as Array<{ type: string; name?: string; if?: string }>
    ).find((s) => s.name === 'child');
    expect(childStep?.type).toBe('workflow.execute');
    expect(childStep?.if).toBe('${{ workflow.spaceId != blank }}');
  });

  it('child-only template (no childWorkflowId) is not flagged', () => {
    expect(requiresDelegatedIdentity(render({}))).toBe(false);
  });
});
