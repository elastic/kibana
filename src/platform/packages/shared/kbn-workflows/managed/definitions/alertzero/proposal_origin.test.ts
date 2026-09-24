/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID, ALERTZERO_PROPOSAL_ORIGIN } from './constants';
import { managedWorkflowDefinitions } from '..';
import type { ManagedWorkflowDefinition } from '../../types';
import { CREATE_PROPOSAL_WORKFLOW_ID } from '../proposals';

/**
 * `origin` is an open vocabulary, so a typo'd one is not a validation error —
 * it is a proposal that silently never matches the queue's filter and is never
 * seen. Pinning the literal here is what turns that into a CI failure, and
 * sweeping every definition rather than naming call sites means a new one
 * cannot be added without one.
 */

interface WorkflowStep {
  name?: string;
  type?: string;
  with?: { 'workflow-id'?: string; inputs?: Record<string, unknown> };
  steps?: WorkflowStep[];
  cases?: Array<{ steps?: WorkflowStep[] }>;
  default?: WorkflowStep[];
}

interface ParsedWorkflow {
  steps?: WorkflowStep[];
}

/** Flattens the nesting a `switch` introduces alongside the ordinary `steps`. */
const flatten = (steps: WorkflowStep[]): WorkflowStep[] =>
  steps.flatMap((step) => [
    step,
    ...flatten(step.steps ?? []),
    ...flatten((step.cases ?? []).flatMap((branch) => branch.steps ?? [])),
    ...flatten(step.default ?? []),
  ]);

const alertzeroDefinitions: ManagedWorkflowDefinition[] = managedWorkflowDefinitions.filter(
  (definition) => definition.pluginId === ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID
);

/**
 * Templating here is placeholder substitution, so any plausible scalar renders
 * a parseable document. A template that needs a key this lacks throws, which is
 * the right outcome: it means a definition escaped this sweep.
 */
const TEMPLATE_VALUES = {
  settingsVersion: 1,
  autonomyLevel: 'manual',
  scheduleInterval: '1h',
  extras: { analysisWindowDays: 7 },
};

const proposalCallSites = alertzeroDefinitions.flatMap((definition) => {
  const yaml = definition.yaml ?? definition.yamlTemplate(TEMPLATE_VALUES);
  const workflow = parse(yaml) as ParsedWorkflow;

  return flatten(workflow.steps ?? [])
    .filter((step) => step.with?.['workflow-id'] === CREATE_PROPOSAL_WORKFLOW_ID)
    .map((step) => ({
      id: `${definition.id} › ${step.name ?? '(unnamed)'}`,
      inputs: step.with?.inputs ?? {},
    }));
});

describe('AlertZero proposal origin', () => {
  it('finds the call sites it is meant to be pinning', () => {
    expect(proposalCallSites.length).toBeGreaterThan(0);
  });

  it.each(proposalCallSites.map(({ id, inputs }) => [id, inputs]))(
    '%s stamps the AlertZero origin',
    (_id, inputs) => {
      expect(inputs.origin).toBe(ALERTZERO_PROPOSAL_ORIGIN);
    }
  );
});
