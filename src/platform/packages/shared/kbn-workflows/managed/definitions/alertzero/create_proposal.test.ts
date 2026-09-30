/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import ALERTZERO_CREATE_PROPOSAL_YAML from './create_proposal.yaml';
import { createWorkflowLiquidEngine, parseDuration } from '../../../common/utils';
import { CREATE_PROPOSAL_WORKFLOW_ID } from '../proposals';
import CREATE_PROPOSAL_YAML from '../proposals/create_proposal.yaml';

interface WorkflowStep {
  name?: string;
  type?: string;
  with?: Record<string, unknown>;
}

interface ParsedWorkflow {
  settings?: { timeout?: string };
  triggers: Array<{
    type: string;
    inputs?: {
      properties?: Record<string, { type?: string }>;
      required?: string[];
      additionalProperties?: boolean;
    };
  }>;
  outputs?: Array<{ name: string; type: string }>;
  steps: WorkflowStep[];
}

const bridge = parse(ALERTZERO_CREATE_PROPOSAL_YAML) as ParsedWorkflow;
const gate = parse(CREATE_PROPOSAL_YAML) as ParsedWorkflow;

const inputsOf = (workflow: ParsedWorkflow) => workflow.triggers[0].inputs ?? {};
const propertiesOf = (workflow: ParsedWorkflow) => inputsOf(workflow).properties ?? {};

const reopenStep = () => bridge.steps.find((step) => step.name === 'reopen_investigation')!;
const resolveAutoApproveStep = () =>
  bridge.steps.find((step) => step.name === 'resolve_auto_approve')!;
const forward = () => bridge.steps.find((step) => step.name === 'create_proposal')!;
const forwardedInputs = () => (forward().with?.inputs ?? {}) as Record<string, string>;

describe('AlertZero create proposal bridge', () => {
  describe('reopen investigation', () => {
    it('is the first step and targets the reopen step type', () => {
      expect(bridge.steps[0].name).toBe('reopen_investigation');
      expect(reopenStep().type).toBe('investigations.reopen');
    });

    it('passes the conversationId input through as an expression', () => {
      expect(reopenStep().with?.conversationId).toBe('${{ inputs.conversationId }}');
    });
  });

  describe('resolve auto approve', () => {
    it('is a data.set step that guards autoApprove based on reopen output', () => {
      expect(resolveAutoApproveStep().type).toBe('data.set');
    });

    const evaluateAutoApprove = (autoApprove: boolean | undefined, reopened: boolean): unknown =>
      createWorkflowLiquidEngine().evalValueSync(
        String(resolveAutoApproveStep().with?.value)
          .replace(/^\$\{\{/, '')
          .replace(/\}\}$/, '')
          .trim(),
        { inputs: { autoApprove }, steps: { reopen_investigation: { output: { reopened } } } }
      );

    it.each([true, false, undefined])(
      'never auto-approves on a reopened investigation (caller autoApprove: %s)',
      (autoApprove) => {
        expect(evaluateAutoApprove(autoApprove, true)).toBe(false);
      }
    );

    it.each([
      [true, true],
      [false, false],
      [undefined, false],
    ])(
      'follows the caller on an investigation that was already open (autoApprove: %s)',
      (autoApprove, expected) => {
        expect(evaluateAutoApprove(autoApprove, false)).toBe(expected);
      }
    );
  });

  describe('the forward', () => {
    it('targets the shared gate', () => {
      expect(forward().type).toBe('workflow.execute');
      expect(forward().with?.['workflow-id']).toBe(CREATE_PROPOSAL_WORKFLOW_ID);
    });

    // The whole reason this workflow exists. A literal cannot be forgotten by a
    // caller the way an input can, and `origin` is matched by exact equality, so
    // a wrong one hides the proposal from the queue that was meant to show it.
    it('stamps the origin itself rather than templating it', () => {
      expect(forwardedInputs().origin).toBe('alertzero');
    });

    it('does not accept an origin a caller could pass through', () => {
      expect(propertiesOf(bridge)).not.toHaveProperty('origin');
    });
  });

  describe('input parity with the gate', () => {
    // The gate closes its inputs to additional properties, so an input added
    // there is silently dropped here until it is mirrored. This is the guard
    // that turns that into a build failure.
    it('declares every gate input except the origin it owns', () => {
      const expected = Object.keys(propertiesOf(gate))
        .filter((name) => name !== 'origin')
        .sort();
      // Guards the comparison itself: two empty lists would otherwise match.
      expect(expected.length).toBeGreaterThan(0);
      expect(Object.keys(propertiesOf(bridge)).sort()).toEqual(expected);
    });

    it('keeps the declared types identical', () => {
      const bridgeTypes = Object.entries(propertiesOf(bridge)).map(([name, schema]) => [
        name,
        schema.type,
      ]);
      const gateTypes = Object.entries(propertiesOf(gate))
        .filter(([name]) => name !== 'origin')
        .map(([name, schema]) => [name, schema.type]);
      expect(bridgeTypes.sort()).toEqual(gateTypes.sort());
    });

    it('requires what the gate requires, minus the origin it supplies', () => {
      expect([...(inputsOf(bridge).required ?? [])].sort()).toEqual(
        (inputsOf(gate).required ?? []).filter((name) => name !== 'origin').sort()
      );
    });

    it('forwards every input it declares', () => {
      expect(Object.keys(forwardedInputs()).sort()).toEqual(
        [...Object.keys(propertiesOf(bridge)), 'origin'].sort()
      );
    });

    // `{{ }}` renders through Liquid and turns an absent input into `''`, which
    // the gate rejects for `autoApprove` (boolean) and `actionInput` (object) —
    // failing the run over a field the caller simply did not set. `${{ }}`
    // evaluates instead, preserving the type and passing `undefined` through.
    //
    // `autoApprove` is excluded: it is sourced from `resolve_auto_approve`
    // rather than passed through directly, because the reopen guard can force
    // it false regardless of what the caller set.
    it('forwards with expression syntax so an unset input stays unset', () => {
      const templated = Object.entries(forwardedInputs()).filter(
        ([name]) => name !== 'origin' && name !== 'autoApprove'
      );
      expect(templated.length).toBeGreaterThan(0);
      for (const [name, value] of templated) {
        expect([name, value]).toEqual([name, `\${{ inputs.${name} }}`]);
      }
    });

    it('sources autoApprove from the reopen guard rather than directly from inputs', () => {
      expect(forwardedInputs().autoApprove).toBe('${{ steps.resolve_auto_approve.output.value }}');
    });
  });

  describe('output parity with the gate', () => {
    // Callers read `steps.<step>.output.decision` and friends off this workflow.
    // Dropping one leaves those expressions undefined, which is falsy rather
    // than loud: approval branches would simply stop firing.
    it('re-declares the gate contract verbatim', () => {
      expect(bridge.outputs).toEqual(gate.outputs);
    });

    it('emits each one from the forwarded step', () => {
      const emitted = bridge.steps.find((step) => step.type === 'workflow.output')!;
      for (const { name } of gate.outputs ?? []) {
        expect(emitted.with?.[name]).toBe(`{{ steps.create_proposal.output.${name} }}`);
      }
    });
  });

  // This run parks in WAITING_FOR_CHILD for as long as the gate holds the
  // decision. The engine's 6h default would cancel it out from under the
  // analyst, and a cancelled parent runs no handler, so the proposal would
  // strand `pending`.
  // Strictly, not equally: this workflow's clock starts before it launches
  // the gate, so matching ceilings would expire the parent first and lose a
  // decision the child had already reached.
  it('outlives the gate it waits on', () => {
    const ceiling = parseDuration(bridge.settings?.timeout ?? '');
    expect(ceiling).toBeGreaterThan(parseDuration(gate.settings?.timeout ?? ''));
  });
});
