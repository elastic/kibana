/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  ALERTZERO_ACTION_ENABLE_RULE_WORKFLOW_ID,
  ALERTZERO_ACTION_INSTALL_PREBUILT_RULE_WORKFLOW_ID,
  ALERTZERO_DETECTION_COVERAGE_WORKFLOW,
  ALERTZERO_DETECTION_COVERAGE_WORKFLOW_ID,
  ALERTZERO_RULE_CREATION_WORKFLOW_ID,
} from '.';
import { CREATE_INVESTIGATION_PROPOSAL_WORKFLOW } from '../agentic_investigations';

/**
 * The verdicts the detection-coverage skill may return. Duplicated here as a literal on
 * purpose: this package must not import from a Security-solution plugin. The security
 * plugin asserts the same list against its own `DETECTION_COVERAGE_VERDICTS` constant, so
 * a change on either side fails a test rather than silently diverging.
 */
const VERDICTS = [
  'covered_enabled',
  'covered_disabled',
  'prebuilt_available',
  'no_coverage',
] as const;

/** Every verdict must select exactly one route flag. */
const ROUTE_BY_VERDICT = {
  covered_disabled: 'enable',
  prebuilt_available: 'install',
  covered_enabled: 'confirm',
  no_coverage: 'create',
} as const;

const PROPOSAL_STEPS = ['propose_enable', 'propose_install', 'propose_confirm', 'propose_report'];

interface YamlStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  cases?: Array<{ match: string; steps: YamlStep[] }>;
  default?: YamlStep[];
  'on-failure'?: { continue?: boolean };
}

interface YamlWorkflow {
  settings?: { timeout?: string };
  steps: YamlStep[];
  outputs?: Array<{ name: string }>;
  triggers?: Array<{
    type: string;
    inputs?: { properties?: Record<string, { type?: string; maxLength?: number }> };
  }>;
}

const workerDefinition = parse(ALERTZERO_DETECTION_COVERAGE_WORKFLOW.yaml) as YamlWorkflow;
const gateDefinition = parse(CREATE_INVESTIGATION_PROPOSAL_WORKFLOW.yaml) as YamlWorkflow;

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [
    step,
    ...flatten(step.steps ?? []),
    ...flatten(step.else ?? []),
    ...flatten(step.default ?? []),
    ...(step.cases ?? []).flatMap((c) => flatten(c.steps)),
  ]);

const allWorkerSteps = flatten(workerDefinition.steps);
const stepByName = (name: string) => allWorkerSteps.find((step) => step.name === name);
const stepIndex = (name: string) => allWorkerSteps.findIndex((step) => step.name === name);
const inputsOf = (step: YamlStep | undefined) =>
  (step?.with?.inputs ?? {}) as Record<string, unknown>;
const hours = (timeout: unknown) => Number(String(timeout).replace(/h$/, ''));

describe('Detection Coverage worker', () => {
  it('is registered as a worker, not a catalog watch', () => {
    expect(ALERTZERO_DETECTION_COVERAGE_WORKFLOW.id).toBe(ALERTZERO_DETECTION_COVERAGE_WORKFLOW_ID);
    // Workers carry no `watch` selector, so they stay out of the Watch catalog.
    expect(
      (ALERTZERO_DETECTION_COVERAGE_WORKFLOW as { visibility?: { selectors?: unknown } }).visibility
        ?.selectors
    ).toBeUndefined();
  });

  describe('verdict enum drift', () => {
    it('declares exactly the canonical verdicts in the agent output schema', () => {
      const schema = stepByName('coverage_check')?.with?.schema as {
        properties?: { verdict?: { enum?: string[] } };
        required?: string[];
      };
      expect(schema?.properties?.verdict?.enum).toEqual([...VERDICTS]);
      // Without `verdict` required, a silent omission would fall through to report-only.
      expect(schema?.required).toContain('verdict');
    });

    it('routes every canonical verdict to exactly one flag', () => {
      const routes = stepByName('route_verdict')?.with as Record<string, string>;
      expect(Object.keys(routes).sort()).toEqual(Object.values(ROUTE_BY_VERDICT).slice().sort());
      for (const verdict of VERDICTS) {
        const owners = Object.entries(routes)
          .filter(([, expression]) => expression.includes(`verdict == '${verdict}'`))
          .map(([flag]) => flag);
        expect(owners).toEqual([ROUTE_BY_VERDICT[verdict]]);
      }
    });

    // A verdict the actions cannot honour must surface to the analyst, not vanish.
    it('reports whenever no route matched', () => {
      const report = String((stepByName('route_fallback')?.with as Record<string, string>).report);
      for (const flag of Object.values(ROUTE_BY_VERDICT)) {
        expect(report).toContain(`steps.route_verdict.output.${flag} != true`);
      }
      expect(stepByName('propose_report')?.if).toContain(
        'steps.route_fallback.output.report == true'
      );
    });

    it('offers the enable action only for a rule resolved to a saved object', () => {
      const routes = stepByName('route_verdict')?.with as Record<string, string>;
      expect(routes.enable).toContain('steps.resolve_rule.output.id != null');
      expect(routes.install).toContain('structured_output.prebuilt_version > 0');
    });
  });

  describe('investigation', () => {
    it('resolves the saved object from the signature id before proposing', () => {
      const resolve = stepByName('resolve_rule');
      expect(resolve?.type).toBe('kibana.request');
      expect(String(resolve?.with?.path)).toContain(
        'rule_id={{ steps.coverage_check.output.structured_output.rule_id | url_encode }}'
      );
      expect(stepIndex('resolve_rule')).toBeLessThan(stepIndex('route_verdict'));
    });

    // Without an investigation there is nowhere to propose, so a failed create must
    // fail the run rather than continue into a proposal with an empty conversation id.
    it('opens an investigation from the template for every verdict but no_coverage', () => {
      const create = stepByName('create_investigation');
      expect(create?.type).toBe('ai.conversation.create');
      expect(create?.with?.template_id).toBe('investigation');
      expect(create?.if).toContain("verdict != 'no_coverage'");
      expect(create).not.toHaveProperty('on-failure');
    });

    it('attaches the matched rule by reference under a fixed attachment id', () => {
      const attach = stepByName('attach_rule');
      expect(attach?.type).toBe('ai.attachment.add');
      expect(attach?.with?.type).toBe('security.rule');
      expect(attach?.with?.id).toBe('coverage-rule');
      expect(attach?.with?.origin).toBe(
        '{{ steps.coverage_check.output.structured_output.rule_id }}'
      );
      expect(attach?.if).toContain('steps.resolve_rule.output.id != null');
    });

    it('refreshes the attachment with the rule as it exists after the action', () => {
      const refetch = stepByName('refetch_rule');
      const refresh = stepByName('refresh_rule_attachment');
      const attachInstalled = stepByName('attach_installed_rule');

      expect(refetch?.if).toContain('steps.record_decision.output.applied == true');
      expect(String(refetch?.with?.path)).toContain(
        'id={{ steps.resolve_rule.output.id | url_encode }}'
      );
      expect(String(refetch?.with?.path)).toContain(
        'rule_id={{ steps.coverage_check.output.structured_output.rule_id | url_encode }}'
      );

      expect(refresh?.type).toBe('ai.attachment.update');
      expect(refresh?.with?.attachment_id).toBe('coverage-rule');
      expect(JSON.stringify(refresh?.with)).toContain('steps.refetch_rule.output | json');
      expect(refresh?.if).toContain('steps.refetch_rule.output.id != null');

      // A prebuilt rule has no saved object until installed, so it is attached afterwards.
      expect(attachInstalled?.type).toBe('ai.attachment.add');
      expect(attachInstalled?.if).toContain('steps.route_verdict.output.install == true');
      expect(attachInstalled?.with?.id).toBe('coverage-rule');
    });

    it('closes the investigation on a decision and leaves it open on a timeout', () => {
      const resolved = stepByName('close_investigation_resolved');
      const dismissed = stepByName('close_investigation_dismissed');
      expect(resolved?.type).toBe('ai.conversation.metadata.patch');
      expect(resolved?.if).toContain('steps.record_decision.output.approved == true');
      expect(dismissed?.if).toContain('steps.record_decision.output.dismissed == true');
      expect((resolved?.with?.updates as Record<string, string>).status).toBe('closed');
      expect((dismissed?.with?.updates as Record<string, string>).status).toBe('closed');
    });
  });

  describe('proposal gate', () => {
    // The worker has no gate of its own: the decision lives on the investigation as a
    // proposal, and the gate workflow runs the action as the approver.
    it('has no approval gate of its own', () => {
      const types = allWorkerSteps.map(({ type }) => type);
      expect(types).not.toContain('waitForApproval');
      expect(types).not.toContain('waitForInput');
      expect(types).not.toContain('security.enableRule');
    });

    it('proposes through the investigation gate, one proposal per route', () => {
      const proposals = allWorkerSteps.filter(
        ({ type, with: input }) =>
          type === 'workflow.execute' &&
          input?.['workflow-id'] === CREATE_INVESTIGATION_PROPOSAL_WORKFLOW.id
      );
      expect(proposals.map(({ name }) => name)).toEqual(PROPOSAL_STEPS);

      for (const proposal of proposals) {
        expect(proposal.if).toContain('steps.create_investigation.output.conversation_id != null');
        // A failed or timed-out gate must fail the run rather than read as a decision.
        expect(proposal).not.toHaveProperty('on-failure');
        expect(inputsOf(proposal).conversationId).toBe(
          '{{ steps.create_investigation.output.conversation_id }}'
        );
      }
    });

    it('runs the enable action against the resolved saved-object id', () => {
      const enable = inputsOf(stepByName('propose_enable'));
      expect(enable.actionWorkflowId).toBe(ALERTZERO_ACTION_ENABLE_RULE_WORKFLOW_ID);
      expect(enable.actionInput).toEqual({ id: '{{ steps.resolve_rule.output.id }}' });
      expect(enable.autoApprove).toBe(false);
      expect(stepByName('propose_enable')?.if).toContain(
        'steps.route_verdict.output.enable == true'
      );
    });

    // The rule has no saved object until installed, so the install action is the one
    // place the signature id is the handle.
    it('runs the install action against the signature id and package version', () => {
      const install = inputsOf(stepByName('propose_install'));
      expect(install.actionWorkflowId).toBe(ALERTZERO_ACTION_INSTALL_PREBUILT_RULE_WORKFLOW_ID);
      expect(install.actionInput).toEqual({
        rule_id: '{{ steps.coverage_check.output.structured_output.rule_id }}',
        version: '${{ steps.coverage_check.output.structured_output.prebuilt_version }}',
      });
      expect(install.autoApprove).toBe(false);
      expect(stepByName('propose_install')?.if).toContain(
        'steps.route_verdict.output.install == true'
      );
    });

    // The gate types actionInput as an object, so action-less proposals omit the keys
    // rather than pass an empty value.
    it.each(['propose_confirm', 'propose_report'])('%s carries no action', (name) => {
      const inputs = inputsOf(stepByName(name));
      expect(inputs).not.toHaveProperty('actionWorkflowId');
      expect(inputs).not.toHaveProperty('actionInput');
    });

    it('dispatches rule creation only for no_coverage and outside the gate', () => {
      const creation = stepByName('run_rule_creation');
      expect(creation?.type).toBe('workflow.execute');
      expect(creation?.with?.['workflow-id']).toBe(ALERTZERO_RULE_CREATION_WORKFLOW_ID);
      expect(creation?.if).toContain('steps.route_verdict.output.create == true');
      expect(creation?.['on-failure']?.continue).toBe(true);
    });

    // The worker parks in WAITING_FOR_CHILD while the gate holds the decision for up to
    // 168h; the engine's default 6h timeout would cancel it.
    it('outlives the proposal gate it waits on', () => {
      expect(String(workerDefinition.settings?.timeout)).toMatch(/^\d+h$/);
      expect(hours(workerDefinition.settings?.timeout)).toBeGreaterThan(
        hours(gateDefinition.settings?.timeout)
      );
    });
  });

  describe('failure containment', () => {
    // A step that dies takes the run with it, so the human never learns what happened.
    // Every step that calls out must let the run reach `emit_result` and report the truth.
    it.each([
      'coverage_check',
      'resolve_rule',
      'attach_rule',
      'run_rule_creation',
      'refetch_rule',
      'refresh_rule_attachment',
      'attach_installed_rule',
      'close_investigation_resolved',
      'close_investigation_dismissed',
    ])('%s continues on failure so the run still reports', (name) => {
      expect(stepByName(name)?.['on-failure']?.continue).toBe(true);
    });
  });

  describe('outcome flags', () => {
    const emit = stepByName('emit_result')?.with as Record<string, string> | undefined;
    const decision = stepByName('record_decision')?.with as Record<string, string> | undefined;

    // The gate reports `succeeded` only after the action workflow completed, `approved`
    // for an action-less proposal, `dismissed` otherwise. A run that never proposed
    // matches none of them.
    it('derives every decision flag from the gate status', () => {
      expect(String(decision?.applied)).toContain(
        "steps.propose_enable.output.status == 'succeeded'"
      );
      expect(String(decision?.applied)).toContain(
        "steps.propose_install.output.status == 'succeeded'"
      );
      expect(String(decision?.approved)).toContain(
        "steps.propose_confirm.output.status == 'approved'"
      );
      expect(String(decision?.approved)).toContain(
        "steps.propose_report.output.status == 'approved'"
      );
      for (const name of PROPOSAL_STEPS) {
        expect(String(decision?.dismissed)).toContain(`steps.${name}.output.status == 'dismissed'`);
      }
    });

    // The action ran inside the gate, and `succeeded` only says the action workflow
    // completed: an install whose package had nothing to install still completes. Every
    // flag must assert evidence from the re-read rule, never the gate status alone.
    it.each([
      ['rule_enabled', 'steps.refetch_rule.output.enabled == true'],
      ['rule_installed', 'steps.refetch_rule.output.id != null'],
    ])('%s asserts mutation evidence, not the gate status alone', (flag, expression) => {
      expect(emit?.[flag]).toContain(expression);
      expect(emit?.[flag]).not.toContain('error == null }}');
    });

    // One field per action tells the caller exactly which approved operation left no trace.
    it.each([
      [
        'enable_approved_not_applied',
        'propose_enable',
        'steps.refetch_rule.output.enabled == true',
      ],
      ['install_approved_not_applied', 'propose_install', 'steps.refetch_rule.output.id != null'],
    ])('%s flags an approval that left no evidence', (flag, gate, evidence) => {
      expect(emit?.[flag]).toContain(`steps.${gate}.output.status == 'succeeded'`);
      expect(emit?.[flag]).toContain(`not (`);
      expect(emit?.[flag]).toContain(evidence);
    });

    it('separates an installed rule that stayed off from a missing install', () => {
      expect(emit?.installed_not_enabled).toContain(
        "steps.propose_install.output.status == 'succeeded'"
      );
      expect(emit?.installed_not_enabled).toContain('steps.refetch_rule.output.id != null');
      expect(emit?.installed_not_enabled).toContain('steps.refetch_rule.output.enabled != true');
    });

    it('reports whether the analyst confirmed an enabled rule covers the gap', () => {
      expect(emit?.coverage_confirmed).toContain(
        "steps.propose_confirm.output.status == 'approved'"
      );
    });

    it('separates "no decision made" from "no gap found"', () => {
      expect(emit?.check_error).toContain('produced no verdict');
    });

    it('propagates the creation worker outcome', () => {
      expect(emit?.rule_created).toContain('steps.run_rule_creation.output.created');
      expect(emit?.created_rule_name).toContain('steps.run_rule_creation.output.rule_name');
    });

    it('hands the investigation back to the caller', () => {
      expect(emit?.investigation_id).toBe(
        '{{ steps.create_investigation.output.conversation_id }}'
      );
    });
  });

  describe('preconditions and unsupported paths', () => {
    it('caps every free-text input before it reaches the model', () => {
      const props = workerDefinition.triggers?.[0]?.inputs?.properties;
      expect(Object.keys(props ?? {}).length).toBeGreaterThan(0);
      // Report every offender at once, and name it: an uncapped field is the one that
      // reaches the model with an unbounded prompt.
      const uncapped = Object.entries(props ?? {})
        .filter(([, schema]) => schema.type === 'string' && !schema.maxLength)
        .map(([name]) => name);
      expect(uncapped).toEqual([]);
    });
  });

  it('reports an outcome flag for every action path', () => {
    const outputs = (workerDefinition.outputs ?? []).map((output) => output.name);
    expect(outputs).toEqual(
      expect.arrayContaining([
        'verdict',
        'existing_rule',
        'investigation_id',
        'coverage_confirmed',
        'rule_enabled',
        'rule_installed',
        'installed_not_enabled',
      ])
    );
  });
});
