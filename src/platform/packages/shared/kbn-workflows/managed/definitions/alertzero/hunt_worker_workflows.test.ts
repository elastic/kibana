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
  ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW,
  ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW,
  ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW,
  ALERTZERO_HUNT_WORKFLOW,
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW,
} from '.';
import { ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID } from './create_proposal';
import { createWorkflowLiquidEngine } from '../../../common/utils';

// Route-path and cross-package id checks (including the SYSTEM_SECURITY_HUNT_*
// cross-check) live in the alertzero PLUGIN's own hunt_children_contract.test.ts, not
// here: this package (kbn-workflows) is a generic platform package with no dependency on
// @kbn/alertzero-common (a security-solution-specific package; no other file in
// kbn-workflows imports runtime values from it, and adding one here is the wrong
// direction -- solution packages depend on platform packages, not the reverse). The
// plugin's test already safely imports both @kbn/workflows/managed and
// @kbn/alertzero-common, so that is where a real (non-mirrored) check against those
// constants belongs.

// The raw `parse(yaml)` tree, not WorkflowSchema's parsed output -- see
// attack_discovery_workflows.test.ts's identical note: the schema types nested step
// arrays as z.array(BaseStepSchema), which strips `with`/`tags`/`triggers` fields the
// schema itself doesn't define, so asserting against the schema's output would read
// `undefined` for everything this file checks.
interface TriggerInputProperty {
  type?: string;
  properties?: Record<string, unknown>;
}

interface TriggerInputSchema {
  properties?: Record<string, TriggerInputProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

interface YamlStep {
  name: string;
  type?: string;
  with?: {
    'workflow-id'?: string;
    inputs?: Record<string, unknown>;
    path?: string;
    updates?: Record<string, unknown>;
    [key: string]: unknown;
  };
  if?: string;
  steps?: YamlStep[];
}

interface YamlWorkflow {
  tags?: string[];
  triggers?: Array<{ type: string; inputs?: TriggerInputSchema }>;
  steps: YamlStep[];
  settings?: { concurrency?: { key?: string; strategy?: string; max?: number } };
}

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [step, ...flatten(step.steps ?? [])]);

const worker = parse(
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW.yamlTemplate({
    settingsVersion: 1,
    autonomyLevel: 'manual',
    scheduleInterval: '4h',
  })
) as YamlWorkflow;
const findOrCreateInvestigation = parse(
  ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW.yaml
) as YamlWorkflow;
const hunt = parse(ALERTZERO_HUNT_WORKFLOW.yaml) as YamlWorkflow;
const packageReport = parse(ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW.yaml) as YamlWorkflow;
const proposalGate = parse(ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW.yaml) as YamlWorkflow;

const workerSteps = flatten(worker.steps);
const packageReportSteps = flatten(packageReport.steps);
const proposalGateSteps = flatten(proposalGate.steps);

const stepIn = (steps: YamlStep[], name: string) => steps.find((step) => step.name === name);

const liquid = createWorkflowLiquidEngine();

// Evaluates a single `${{ }}` expression the way the engine does (same approach as
// coverage_review.test.ts's evaluateExpression / forensics_run_endpoint_analysis.test.ts's
// evaluate): strip the delimiters and run the real Liquid engine against a hand-built context.
const evaluateExpression = (expression: string, context: Record<string, unknown>): unknown => {
  const trimmed = expression.trim();
  if (!(trimmed.startsWith('${{') && trimmed.endsWith('}}'))) {
    throw new Error(`Expected \${{ }} expression, got: ${expression}`);
  }
  return liquid.evalValueSync(trimmed.slice(3, -2).trim(), context);
};

describe('Hunt Watch worker chain', () => {
  // 1b: the two feature children carry exactly the shared tag pair, and neither the
  // Worker-only watch tags.
  it.each([
    ['hunt_package_report', packageReport],
    ['hunt_proposal_gate', proposalGate],
  ])('%s is tagged exactly security + continuous-threat-hunt', (_name, yaml) => {
    expect(new Set(yaml.tags ?? [])).toEqual(new Set(['security', 'continuous-threat-hunt']));
  });

  it.each([
    ['hunt_package_report', packageReport],
    ['hunt_proposal_gate', proposalGate],
  ])('%s carries neither watch nor watch-hunt', (_name, yaml) => {
    expect(yaml.tags ?? []).not.toContain('watch');
    expect(yaml.tags ?? []).not.toContain('watch-hunt');
  });

  // Narrows, but does not close, the existing-Proposals guard's race window (see the YAML's own
  // concurrency comment for why) — queued, not dropped, so a racing run still packages rather
  // than being silently lost.
  it('hunt_package_report serializes per Investigation via a queued concurrency key', () => {
    expect(packageReport.settings?.concurrency).toEqual({
      key: 'hunt-package-report-{{ inputs.investigationConversationId }}',
      strategy: 'queue',
      max: 1,
    });
  });

  // 1e: each child's own declared trigger input schema is what the caller's payload is
  // checked against -- not a hand-typed copy of it that could drift from the real schema.
  describe('call-site inputs satisfy the declared child schema', () => {
    const requiredInputsOf = (child: YamlWorkflow): string[] =>
      child.triggers?.[0]?.inputs?.required ?? [];
    const declaredPropertiesOf = (child: YamlWorkflow): string[] =>
      Object.keys(child.triggers?.[0]?.inputs?.properties ?? {});
    const isClosed = (child: YamlWorkflow): boolean =>
      child.triggers?.[0]?.inputs?.additionalProperties === false;

    const assertSatisfies = (child: YamlWorkflow, callSiteInputs: Record<string, unknown>) => {
      const provided = Object.keys(callSiteInputs);
      const required = requiredInputsOf(child);
      const declared = declaredPropertiesOf(child);

      expect(required.filter((key) => !provided.includes(key))).toEqual([]);
      if (isClosed(child)) {
        expect(provided.filter((key) => !declared.includes(key))).toEqual([]);
      }
    };

    it('find_or_create_investigation call site', () => {
      assertSatisfies(
        findOrCreateInvestigation,
        stepIn(workerSteps, 'find_or_create_investigation')?.with?.inputs ?? {}
      );
    });

    it('hunt call site', () => {
      assertSatisfies(hunt, stepIn(workerSteps, 'hunt')?.with?.inputs ?? {});
    });

    it('package_report call site', () => {
      assertSatisfies(packageReport, stepIn(workerSteps, 'package_report')?.with?.inputs ?? {});
    });

    it('proposal_gate call site', () => {
      const dispatch = stepIn(
        flatten(stepIn(packageReportSteps, 'start_proposal_gates')?.steps ?? []),
        'dispatch_gate'
      );

      assertSatisfies(proposalGate, dispatch?.with?.inputs ?? {});
    });
  });

  // 1c/1d: uniqueness and workflow.execute-id resolution across the WHOLE registry are
  // proven in managed_workflow_definitions.test.ts ("registers all four hunt child ids
  // exactly once", "resolves every workflow.execute/executeAsync id the Worker's
  // rendered YAML references"); this just pins the ids these five files actually
  // resolve to, so a rename on one side (a child's own id constant) without the other
  // (the caller's workflow-id string) fails here instead of at runtime.
  it.each([
    ['find_or_create_investigation', ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW.id],
    ['hunt', ALERTZERO_HUNT_WORKFLOW.id],
    ['package_report', ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW.id],
  ] as const)('the Worker dispatches %s by its registered id', (stepName, id) => {
    expect(stepIn(workerSteps, stepName)?.with?.['workflow-id']).toBe(id);
  });

  describe('the sweep gate', () => {
    const renderedWorker = ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW.yamlTemplate({
      settingsVersion: 1,
      autonomyLevel: 'manual',
      scheduleInterval: '4h',
    });

    it('renders with no technology placeholder, const, or child input', () => {
      expect(renderedWorker).not.toMatch(/technolog/i);
      expect(renderedWorker).not.toMatch(/__WORKER_[A-Z_]+__/);
      expect(stepIn(workerSteps, 'hunt')?.with?.inputs).not.toHaveProperty('technology');
      expect(hunt.triggers?.[0]?.inputs?.properties).not.toHaveProperty('technology');
    });

    it('reads the single scope status, and only ok or degraded lets the sweep proceed', () => {
      const gate = stepIn(workerSteps, 'resolve_index_scope_gate') as YamlStep & {
        with: { index_scope_blocked: string };
      };

      // A missing output (an errored call) matches neither status, so it reads as blocked.
      expect(gate.with.index_scope_blocked).toBe(
        "${{ steps.check_index_scope.output.status != 'ok' and steps.check_index_scope.output.status != 'degraded' }}"
      );
      expect(stepIn(workerSteps, 'count_index_scope_statuses')).toBeUndefined();
    });
  });

  it('the packaging child dispatches the gate by its registered id', () => {
    const dispatch = stepIn(
      flatten(stepIn(packageReportSteps, 'start_proposal_gates')?.steps ?? []),
      'dispatch_gate'
    );

    expect(dispatch?.with?.['workflow-id']).toBe(ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW.id);
  });

  // The Worker's autonomy decides whether a forensics handoff waits for an analyst, the
  // same way the Attack Discovery Worker's does for the same handoff. It travels
  // Worker -> packaging child -> gate -> the bridge's `autoApprove`, as plain inputs.
  describe('autonomy reaches the gate', () => {
    it('is forwarded from the Worker settings to the packaging child', () => {
      expect(stepIn(workerSteps, 'package_report')?.with?.inputs?.autonomy).toBe(
        '{{ consts.worker_settings.autonomy }}'
      );
    });

    it('is forwarded from the packaging child to every gate', () => {
      const dispatch = stepIn(
        flatten(stepIn(packageReportSteps, 'start_proposal_gates')?.steps ?? []),
        'dispatch_gate'
      );

      expect(dispatch?.with?.inputs?.autonomy).toBe('{{ inputs.autonomy }}');
      expect(dispatch?.with?.inputs?.hostName).toBe('{{ foreach.item.hostName }}');
    });

    it.each([
      ['supervised', true],
      ['assisted', false],
      ['manual', false],
      [undefined, false],
    ])('auto-approves at %s autonomy: %s', (autonomy, expected) => {
      const context = stepIn(proposalGateSteps, 'resolve_context')?.with as Record<string, string>;
      const resolved = liquid.parseAndRenderSync(context.autonomy, {
        inputs: { autonomy },
        consts: { default_autonomy: 'manual' },
      });
      const autoApprove = stepIn(proposalGateSteps, 'resolve_auto_approve')?.with as Record<
        string,
        string
      >;

      expect(
        evaluateExpression(autoApprove.value, {
          steps: { resolve_context: { output: { autonomy: resolved } } },
        })
      ).toBe(expected);
    });

    it('hands the resolved auto-approve to the bridge', () => {
      const create = stepIn(proposalGateSteps, 'create_and_gate_proposal');

      expect(create?.with?.['workflow-id']).toBe(ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID);
      expect(create?.with?.inputs?.autoApprove).toBe(
        '${{ steps.resolve_auto_approve.output.value }}'
      );
    });
  });

  // The gate records the decision and never closes the Investigation: an approved
  // handoff leaves it open for the report Forensics Watch writes into it, and a
  // dismissed or expired one is an analyst's to close, since the same Investigation
  // may carry other handoffs still awaiting a decision. Evaluated against the real YAML
  // the way the engine would.
  describe('proposal gate decision recording', () => {
    const recordDecision = stepIn(proposalGateSteps, 'record_decision')?.with as Record<
      string,
      string
    >;

    const evaluateDecision = (output?: {
      proposalId?: string;
      status?: string;
      decision?: string;
    }) => {
      const context = {
        steps: {
          create_and_gate_proposal: output ? { output } : { error: { message: 'boom' } },
        },
      };
      return {
        created: evaluateExpression(recordDecision.created, context),
        approved: evaluateExpression(recordDecision.approved, context),
        acknowledged: evaluateExpression(recordDecision.acknowledged, context),
        declined: evaluateExpression(recordDecision.declined, context),
        expired: evaluateExpression(recordDecision.expired, context),
      };
    };
    const none = {
      created: true,
      approved: false,
      acknowledged: false,
      declined: false,
      expired: false,
    };

    it('counts a handoff as approved only once its action succeeded', () => {
      expect(
        evaluateDecision({ proposalId: 'p1', decision: 'approved', status: 'succeeded' })
      ).toEqual({ ...none, approved: true });
    });

    it('does not count an approved handoff whose action failed as handed off', () => {
      expect(
        evaluateDecision({ proposalId: 'p1', decision: 'approved', status: 'failed' })
      ).toEqual(none);
    });

    // The analyst recommendation carries no action, so approving it settles `no_action`.
    it('records an approved recommendation as acknowledged, not handed off', () => {
      expect(
        evaluateDecision({ proposalId: 'p1', decision: 'approved', status: 'no_action' })
      ).toEqual({ ...none, acknowledged: true });
      const journal = stepIn(proposalGateSteps, 'journal_decision')?.with as {
        inputs: { message: string };
      };
      expect(journal.inputs.message).toContain('Acknowledged the analyst recommendation');
    });

    it('records a dismissal', () => {
      expect(
        evaluateDecision({ proposalId: 'p1', decision: 'dismissed', status: 'no_action' })
      ).toEqual({ ...none, declined: true });
    });

    it('records an expiry', () => {
      expect(evaluateDecision({ proposalId: 'p1', status: 'expired' })).toEqual({
        ...none,
        expired: true,
      });
    });

    // elastic/security-team#19849's first direction: a Proposal the bridge could not create
    // is journaled, not silently lost.
    it('records a creation failure as not created, and journals it', () => {
      expect(evaluateDecision(undefined)).toEqual({ ...none, created: false });
      const journal = stepIn(proposalGateSteps, 'journal_decision')?.with as {
        inputs: { message: string };
      };
      expect(journal.inputs.message).toContain('record_decision.output.created != true');
      expect(journal.inputs.message).toContain('create_and_gate_proposal.error.message');
    });

    it('keeps the Investigation open on approval, and only then', () => {
      const record = stepIn(proposalGateSteps, 'record_forensics_handoff');

      expect(record?.type).toBe('ai.conversation.metadata.patch');
      expect(record?.if).toBe('${{ steps.record_decision.output.approved == true }}');
      expect(record?.with?.updates?.status).toBe('open');
    });

    it('never closes the Investigation and never counts its Proposals', () => {
      const closers = proposalGateSteps.filter(
        (step) =>
          step.type === 'ai.conversation.metadata.patch' && step.with?.updates?.status === 'closed'
      );
      expect(closers).toEqual([]);
      expect(proposalGateSteps.map(({ name }) => name)).not.toEqual(
        expect.arrayContaining([expect.stringMatching(/^requery_|^close_if_settled$/)])
      );
      expect(proposalGate.triggers?.[0]?.inputs?.properties).not.toHaveProperty(
        'expectedProposalCount'
      );
    });
  });
});
