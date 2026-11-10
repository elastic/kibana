/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { FLEET_PACKAGE_WORKFLOW } from './fleet';

const PACKAGE_WORKFLOW_BODY =
  'name: Package workflow\ntriggers:\n  - type: manual\nsteps:\n  - name: hello\n    type: console\n    with:\n      message: hello\n';

const render = (yaml: string): Record<string, unknown> =>
  parse(FLEET_PACKAGE_WORKFLOW.yamlTemplate({ yaml }));

describe('FLEET_PACKAGE_WORKFLOW yamlTemplate', () => {
  it('disables a package workflow that declares enabled: true', () => {
    const rendered = render(`enabled: true\n${PACKAGE_WORKFLOW_BODY}`);

    expect(rendered.enabled).toBe(false);
  });

  it('disables a package workflow that declares no enabled field', () => {
    const rendered = render(PACKAGE_WORKFLOW_BODY);

    expect(rendered.enabled).toBe(false);
  });

  it('keeps the rest of the package workflow unchanged', () => {
    const rendered = render(`enabled: true\n${PACKAGE_WORKFLOW_BODY}`);

    expect(rendered).toEqual({ ...parse(PACKAGE_WORKFLOW_BODY), enabled: false });
  });

  it.each([
    ['invalid YAML', 'name: [unclosed'],
    ['a non-mapping document', '- just\n- a list\n'],
  ])('throws for %s', (_description, yaml) => {
    expect(() => render(yaml)).toThrow('Package workflow must be a valid YAML mapping');
  });
});
