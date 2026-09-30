/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import type { WorkflowYaml } from '@kbn/workflows';
import { reconcilePageIds } from './page_ids';

const yamlWith = (pageTrigger: string) => `name: intake
# comments survive the rewrite
triggers:
  - type: manual
  - type: page
    title: Report an incident
${pageTrigger}steps:
  - name: log
    type: console
    with:
      message: hi
`;

const pageIdsOf = (yaml: string): unknown[] =>
  (parse(yaml).triggers as Array<Record<string, unknown>>)
    .filter((trigger) => trigger.type === 'page')
    .map((trigger) => trigger['page-id']);

const definitionOf = (yaml: string): WorkflowYaml => parse(yaml) as WorkflowYaml;

describe('reconcilePageIds', () => {
  it('assigns a page-id to a page trigger that has none, in YAML and definition', () => {
    const yaml = yamlWith('');
    const result = reconcilePageIds({ yaml, definition: definitionOf(yaml) });

    const [assigned] = pageIdsOf(result.yaml);
    expect(assigned).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(result.yaml).toContain('# comments survive the rewrite');
    const pageTrigger = result.definition?.triggers.find((trigger) => trigger.type === 'page');
    expect(pageTrigger).toEqual(expect.objectContaining({ 'page-id': assigned }));
  });

  it('keeps an existing page-id unchanged', () => {
    const yaml = yamlWith('    page-id: keep-me\n');
    const result = reconcilePageIds({ yaml, definition: definitionOf(yaml) });

    expect(result.yaml).toBe(yaml);
    expect(pageIdsOf(result.yaml)).toEqual(['keep-me']);
  });

  it('reuses the stored page-id when the incoming YAML dropped it', () => {
    const stored = definitionOf(yamlWith('    page-id: stored-id\n'));
    const yaml = yamlWith('');
    const result = reconcilePageIds({
      yaml,
      definition: definitionOf(yaml),
      previousDefinition: stored,
    });

    expect(pageIdsOf(result.yaml)).toEqual(['stored-id']);
  });

  it('replaces every page-id on clone and import', () => {
    const yaml = yamlWith('    page-id: original\n');
    const result = reconcilePageIds({ yaml, definition: definitionOf(yaml), regenerate: true });

    const [next] = pageIdsOf(result.yaml);
    expect(next).not.toBe('original');
    expect(next).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
  });

  it('leaves YAML without page triggers untouched', () => {
    const yaml = 'name: plain\ntriggers:\n  - type: manual\nsteps: []\n';
    expect(reconcilePageIds({ yaml, definition: undefined }).yaml).toBe(yaml);
  });
});
