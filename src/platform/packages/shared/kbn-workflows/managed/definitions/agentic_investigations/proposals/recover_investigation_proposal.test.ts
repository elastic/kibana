/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import RECOVER_INVESTIGATION_PROPOSAL_YAML from './recover_investigation_proposal.yaml';

interface WorkflowStep {
  name?: string;
  type?: string;
  if?: string;
  with?: Record<string, unknown>;
}
interface ParsedWorkflow {
  settings?: { 'on-failure'?: { fallback?: WorkflowStep[] } };
  triggers: Array<{
    type: string;
    inputs?: { properties?: Record<string, unknown>; required?: string[] };
  }>;
  steps: WorkflowStep[];
}

const workflow = parse(RECOVER_INVESTIGATION_PROPOSAL_YAML) as ParsedWorkflow;

describe('recover-investigation-proposal workflow', () => {
  it('clones the failed original as its first step', () => {
    expect(workflow.steps[0]?.type).toBe('investigations.cloneProposal');
  });
  it('has no autonomy input: recovery always parks on a human gate', () => {
    const manual = workflow.triggers.find(({ type }) => type === 'manual');
    expect(Object.keys(manual?.inputs?.properties ?? {})).not.toContain('autoApprove');
  });
  it('never spawns itself: a failed recovery is terminal', () => {
    expect(RECOVER_INVESTIGATION_PROPOSAL_YAML).not.toContain('workflow.executeAsync');
  });
  it('requires only the proposal id from its caller', () => {
    const manual = workflow.triggers.find(({ type }) => type === 'manual');
    expect(manual?.inputs?.required).toEqual(['proposalId']);
  });
  it('parses every condition with the ${{ }} expression syntax, never a single-brace variant', () => {
    // e2e-caught defect class: `${ ((...)) }` parses as YAML but explodes at
    // execution time, silently disabling the whole on-failure chain.
    const conditions: string[] = [];
    for (const entry of [
      ...workflow.steps,
      ...(workflow.settings?.['on-failure']?.fallback ?? []),
    ]) {
      if (entry.if !== undefined) conditions.push(entry.if);
    }
    expect(conditions.length).toBeGreaterThan(0);
    for (const condition of conditions) {
      expect(condition).toMatch(/^\$\{\{/);
      expect(condition).toMatch(/\}\}$/);
    }
  });
  it('records a failed action on the clone so the queue shows the outcome', () => {
    const fallback = workflow.settings?.['on-failure']?.fallback ?? [];
    expect(fallback.map(({ type }) => type)).toContain('investigations.updateProposal');
  });
});
