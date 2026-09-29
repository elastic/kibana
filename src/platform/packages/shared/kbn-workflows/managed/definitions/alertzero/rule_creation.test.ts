/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_RULE_CREATION_WORKFLOW } from '.';

/**
 * Pins the prompt contract of the rule-creation worker's draft_creation ai.agent step.
 * The detection-watch-rule-creation eval suite scores these behaviours (Canary Tripped,
 * Gap Addressed, Tool Routing), so a prompt edit that drops a guard must fail here
 * before it can silently move an eval cell.
 */

interface YamlStep {
  name: string;
  type: string;
  with?: Record<string, unknown>;
}

const workflowDefinition = parse(ALERTZERO_RULE_CREATION_WORKFLOW.yaml) as {
  steps: YamlStep[];
};

const draftStep = workflowDefinition.steps.find((step) => step.name === 'draft_creation');
const message = String(draftStep?.with?.message ?? '');
const schema = draftStep?.with?.schema as
  | { properties?: Record<string, unknown>; required?: string[] }
  | undefined;

describe('Rule Creation worker draft_creation prompt', () => {
  it('is an ai.agent step with a message and structured output schema', () => {
    expect(draftStep?.type).toBe('ai.agent');
    expect(message.length).toBeGreaterThan(0);
    expect(schema?.properties).toBeDefined();
  });

  it('keeps the provided-context short-circuit', () => {
    expect(message).toMatch(/supplied context is\s+sufficient; do not ask a follow-up question/);
  });

  it('declares a quality gate that declines unwinnable gaps instead of drafting', () => {
    expect(message).toMatch(/[Qq]uality gate/);
    expect(message).toMatch(/confidence is below 0\.3/);
    expect(message).toMatch(/catch-all/);
    expect(message).toMatch(/set skipped to true/);
  });

  it('exposes the gate decision in the structured output schema', () => {
    expect(schema?.properties).toHaveProperty('skipped');
    expect(schema?.properties).toHaveProperty('reason');
    // The agent must always declare the gate decision; a declined draft carries no rule.
    expect(schema?.required).toContain('skipped');
    expect(schema?.required).not.toContain('rule');
  });

  it('forbids speculative tools the workflow already covers in later steps', () => {
    expect(message).toMatch(/[Nn]o speculative tools/);
    expect(message).toMatch(/no rule\s+preview/);
  });

  it('bounds corroboration to at most one lookup', () => {
    expect(message).toMatch(/at most one/);
  });

  it('forbids tool calls after the draft tool returns', () => {
    expect(message).toMatch(/call no further tools/);
  });
});
