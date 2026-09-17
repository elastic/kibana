/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { managedWorkflowDefinitions } from '.';
import {
  ACTION_WORKFLOW_INPUT,
  ACTION_WORKFLOW_TAG,
  actionMetadataSchema,
} from '../action_workflow';

/**
 * Contract test for every action workflow, whoever owns it. It asserts only the
 * shape a generic proposal gate depends on — never a specific action's values,
 * because the YAML is the source of truth for those.
 *
 * A new action is covered as soon as its definition is registered; nothing here
 * needs editing. Candidates are anything that *looks* like an action — it
 * carries the tag, or declares `consts.actionMetadata` — so forgetting either
 * half of the contract is caught rather than making the workflow invisible.
 */

/** Local shape: the parsed YAML is untyped and only these fields are asserted on. */
interface ParsedActionWorkflow {
  tags?: string[];
  consts?: { actionMetadata?: unknown };
  triggers?: Array<{
    type?: string;
    inputs?: { properties?: Record<string, { type?: string }>; required?: string[] };
  }>;
  steps?: Array<{ type?: string }>;
}

const actionWorkflowCandidates = managedWorkflowDefinitions
  .filter((definition): definition is typeof definition & { yaml: string } => 'yaml' in definition)
  .map((definition) => ({
    id: definition.id,
    parsed: parse(definition.yaml) as ParsedActionWorkflow,
  }))
  .filter(
    ({ parsed }) =>
      parsed.tags?.includes(ACTION_WORKFLOW_TAG) || parsed.consts?.actionMetadata !== undefined
  );

describe('action workflow contract', () => {
  it('finds at least one action workflow, or this suite is vacuously green', () => {
    expect(actionWorkflowCandidates.length).toBeGreaterThan(0);
  });

  describe.each(actionWorkflowCandidates.map(({ id, parsed }) => [id, parsed] as const))(
    '%s',
    (_id, workflow) => {
      it('carries the generic action tag, so the catalog is discoverable by tag', () => {
        expect(workflow.tags).toContain(ACTION_WORKFLOW_TAG);
      });

      it('declares valid actionMetadata under consts, the only place the schema preserves', () => {
        const parsed = actionMetadataSchema.safeParse(workflow.consts?.actionMetadata);

        // Surface the field-level reason rather than a bare `false`.
        expect(parsed.error?.issues ?? []).toEqual([]);
        expect(parsed.success).toBe(true);
      });

      it('takes a single required actionInput object, so the gate needs no per-action knowledge', () => {
        const inputs = workflow.triggers?.find(({ type }) => type === 'manual')?.inputs;

        expect(Object.keys(inputs?.properties ?? {})).toEqual([ACTION_WORKFLOW_INPUT]);
        expect(inputs?.properties?.[ACTION_WORKFLOW_INPUT]?.type).toBe('object');
        expect(inputs?.required).toContain(ACTION_WORKFLOW_INPUT);
      });

      it('emits an explicit output, since workflow.execute cannot type a child result', () => {
        expect(workflow.steps?.map(({ type }) => type)).toContain('workflow.output');
      });
    }
  );
});
