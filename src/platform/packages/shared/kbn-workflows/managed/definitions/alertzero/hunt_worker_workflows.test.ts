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
    result_tier2_targets?: string;
    result_actionable_indices?: string;
    result_behaviors?: string;
    tier2_targets?: string;
    'workflow-id'?: string;
    inputs?: Record<string, unknown>;
    path?: string;
    method?: string;
    body?: Record<string, unknown>;
  };
  if?: string;
  'on-failure'?: { continue?: boolean };
  steps?: YamlStep[];
}

interface YamlWorkflow {
  tags?: string[];
  outputs?: { properties?: Record<string, { type?: string }> };
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
const huntSteps = flatten(hunt.steps);
const packageReportSteps = flatten(packageReport.steps);
const proposalGateSteps = flatten(proposalGate.steps);

const stepIn = (steps: YamlStep[], name: string) => steps.find((step) => step.name === name);

// Evaluates a single `${{ }}` expression the way the engine does (same approach as
// coverage_review.test.ts's evaluateExpression / forensics_run_endpoint_analysis.test.ts's
// evaluate): strip the delimiters and run the real Liquid engine against a hand-built context.
const evaluateExpression = (expression: string, context: Record<string, unknown>): unknown => {
  const trimmed = expression.trim();
  if (!(trimmed.startsWith('${{') && trimmed.endsWith('}}'))) {
    throw new Error(`Expected \${{ }} expression, got: ${expression}`);
  }
  return createWorkflowLiquidEngine().evalValueSync(trimmed.slice(3, -2).trim(), context);
};

describe('Hunt Watch worker chain', () => {
  it('records the hunt run on both new and reused investigations before attaching findings', () => {
    const append = stepIn(findOrCreateInvestigation.steps, 'append_workflow_execution');
    expect(append?.type).toBe('investigations.appendWorkflowExecutionId');
    expect(append?.['on-failure']).toEqual({ continue: true });
    expect(append?.with).toEqual({
      conversationId: '{{ steps.find_or_create.output.investigationConversationId }}',
      workflowExecutionId: '{{ inputs.runId }}',
    });
    const names = findOrCreateInvestigation.steps.map(({ name }) => name);
    expect(names.indexOf('find_or_create')).toBeLessThan(
      names.indexOf('append_workflow_execution')
    );
    expect(names.indexOf('append_workflow_execution')).toBeLessThan(
      names.indexOf('attach_threat_report')
    );
  });

  it.each([
    ['conv-1', 'exec-1', true],
    ['conv-1', '', false],
    ['', 'exec-1', false],
    [undefined, 'exec-1', false],
  ])(
    'only appends when a hunt conversation and run ID exist: %p, %p',
    (conversationId, runId, expected) => {
      const condition =
        stepIn(findOrCreateInvestigation.steps, 'append_workflow_execution')?.if ?? '';
      expect(
        evaluateExpression(condition, {
          inputs: { runId },
          steps: { find_or_create: { output: { investigationConversationId: conversationId } } },
        })
      ).toBe(expected);
    }
  );

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

  // A clean run attaches no SSE, so the coordinator's Tier 2 targets and executed behaviors
  // reach packaging only as inputs threaded hunt -> Worker -> packaging child -> step. The
  // Worker leg is not wired here: its YAML is a `yamlTemplate` whose fingerprint guard needs a
  // `version` bump, which is left to the owner. Until then these inputs arrive absent, which
  // the step treats as "no dataset hint / no query".
  describe('the coordinator result handed to packaging', () => {
    const resultVariables = () =>
      huntSteps.find((step) => step.with?.result_tier2_targets !== undefined)?.with ?? {};
    const decideInputs = () => stepIn(packageReportSteps, 'decide_and_package')?.with ?? {};

    it('declares the three results as hunt outputs', () => {
      expect(Object.keys(hunt.outputs?.properties ?? {})).toEqual(
        expect.arrayContaining(['tier2_targets', 'actionable_indices', 'behaviors'])
      );
    });

    it('declares behaviors as an array', () => {
      expect(hunt.outputs?.properties?.behaviors?.type).toBe('array');
    });

    it.each([
      ['tier2_targets', ['logs-aws.cloudtrail-*'], ['logs-aws.cloudtrail-*']],
      ['tier2_targets', undefined, []],
    ])(
      'reads %s as an array (%p) even when the coordinator did not run',
      (_name, value, expected) => {
        expect(
          evaluateExpression(resultVariables().result_tier2_targets as string, {
            steps: {
              run_hunt_coordinator: { output: value ? { tier2_targets: value } : undefined },
            },
          })
        ).toEqual(expected);
      }
    );

    it('reads behaviors as an empty array when Tier 2 never ran', () => {
      expect(
        evaluateExpression(resultVariables().result_behaviors as string, {
          steps: { run_hunt_coordinator: { output: { tier2_targets: [] } } },
        })
      ).toEqual([]);
    });

    it('reads behaviors from the coordinator Tier 2 result', () => {
      expect(
        evaluateExpression(resultVariables().result_behaviors as string, {
          steps: {
            run_hunt_coordinator: { output: { tier2: { behaviors: [{ technique_id: 'T1110' }] } } },
          },
        })
      ).toEqual([{ technique_id: 'T1110' }]);
    });

    it('declares the three inputs on the packaging child without requiring them', () => {
      const inputs = packageReport.triggers?.[0]?.inputs;

      expect(
        ['tier2Targets', 'actionableIndices', 'behaviors'].map(
          (key) => key in (inputs?.properties ?? {}) && !(inputs?.required ?? []).includes(key)
        )
      ).toEqual([true, true, true]);
    });

    it('forwards the three inputs from the packaging child into the step', () => {
      expect(
        ['tier2Targets', 'actionableIndices', 'behaviors'].map((key) => key in decideInputs())
      ).toEqual([true, true, true]);
    });
  });

  it('the packaging child dispatches the gate by its registered id', () => {
    const dispatch = stepIn(
      flatten(stepIn(packageReportSteps, 'start_proposal_gates')?.steps ?? []),
      'dispatch_gate'
    );

    expect(dispatch?.with?.['workflow-id']).toBe(ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW.id);
  });

  // The gate's settlement predicate lives entirely in Liquid (resolve_settlement_counts ->
  // resolve_settled -> close_if_settled's `if`), so it has no TypeScript step handler to unit
  // test directly -- evaluated here against the real YAML the way the engine would, same
  // approach coverage_review.test.ts's evaluateMarkProcessed uses for its own chained
  // data.set -> if. Covers elastic/security-team#19773's two counting bugs: the requery
  // pagination fix (status-scoped `total` reads replacing a truncated page) and the
  // pending/executing fail-closed default (a failed status read must never be
  // indistinguishable from "nothing outstanding").
  describe('proposal gate settlement predicate', () => {
    const settlementCounts = stepIn(proposalGateSteps, 'resolve_settlement_counts')?.with as
      | Record<string, string>
      | undefined;
    const settledWith = stepIn(proposalGateSteps, 'resolve_settled')?.with as
      | Record<string, string>
      | undefined;
    const closeIf = stepIn(proposalGateSteps, 'close_if_settled')?.if;

    // `undefined` models `on-failure: continue: true` swallowing a failed read: the step
    // entry exists with an `error`, but no `output` -- never a missing step entry entirely.
    type RequeryOutcome = { total: number } | undefined;

    const evaluateSettlement = ({
      created,
      createdRetry,
      pending,
      pendingRetry,
      executing,
      executingRetry,
      expectedProposalCount,
    }: {
      created?: RequeryOutcome;
      createdRetry?: RequeryOutcome;
      pending?: RequeryOutcome;
      pendingRetry?: RequeryOutcome;
      executing?: RequeryOutcome;
      executingRetry?: RequeryOutcome;
      expectedProposalCount: number;
    }) => {
      const asStepResult = (outcome: RequeryOutcome) =>
        outcome ? { output: outcome } : { error: { message: 'request failed' } };

      const stepsContext = {
        steps: {
          requery_created: asStepResult(created),
          requery_created_retry: asStepResult(createdRetry),
          requery_pending: asStepResult(pending),
          requery_pending_retry: asStepResult(pendingRetry),
          requery_executing: asStepResult(executing),
          requery_executing_retry: asStepResult(executingRetry),
        },
        inputs: { expectedProposalCount },
      };

      const createdCount = evaluateExpression(settlementCounts!.created_count, stepsContext);
      const pendingCount = evaluateExpression(settlementCounts!.pending_count, stepsContext);
      const executingCount = evaluateExpression(settlementCounts!.executing_count, stepsContext);

      const settlementContext = {
        variables: {
          created_count: createdCount,
          pending_count: pendingCount,
          executing_count: executingCount,
        },
        inputs: { expectedProposalCount },
      };

      const settled = evaluateExpression(settledWith!.settled, settlementContext);
      const closes = evaluateExpression(closeIf!, { variables: { settled } });

      return { createdCount, pendingCount, executingCount, settled, closes };
    };

    it('settles and closes once every count confirms clean, including a genuine zero', () => {
      const result = evaluateSettlement({
        created: { total: 3 },
        createdRetry: { total: 3 },
        pending: { total: 0 },
        pendingRetry: { total: 0 },
        executing: { total: 0 },
        executingRetry: { total: 0 },
        expectedProposalCount: 3,
      });

      // Pins that a successful `total: 0` stays 0 rather than falling through to the
      // fail-closed `default: 1` -- only a missing (failed) read should ever do that.
      expect(result).toEqual({
        createdCount: 3,
        pendingCount: 0,
        executingCount: 0,
        settled: true,
        closes: true,
      });
    });

    it('does not close when a page beyond the first 100 still has a pending Proposal', () => {
      // The bug this ticket fixes: before the pagination fix, pending/executing were tallied
      // by filtering a `size: 100` page client-side, which could never see a pending Proposal
      // past that page. `total` from a status-scoped query is unaffected by page size, so a
      // large count here still settles correctly only once it is genuinely 0.
      const result = evaluateSettlement({
        created: { total: 140 },
        pending: { total: 1 },
        executing: { total: 0 },
        expectedProposalCount: 3,
      });

      expect(result.pendingCount).toBe(1);
      expect(result.settled).toBe(false);
      expect(result.closes).toBe(false);
    });

    it('fails closed, not open, when both pending reads fail', () => {
      // The regression this guards: before the fail-closed default, a failed pending pair
      // collapsed to a literal 0 (same as "nothing pending"), and a correctly-read
      // created_count/executing_count could still satisfy the rest of the predicate --
      // closing the Investigation over a Proposal this gate simply failed to observe.
      const result = evaluateSettlement({
        created: { total: 3 },
        executing: { total: 0 },
        expectedProposalCount: 3,
      });

      expect(result.pendingCount).toBe(1);
      expect(result.settled).toBe(false);
      expect(result.closes).toBe(false);
    });

    it('fails closed, not open, when both executing reads fail', () => {
      const result = evaluateSettlement({
        created: { total: 3 },
        pending: { total: 0 },
        expectedProposalCount: 3,
      });

      expect(result.executingCount).toBe(1);
      expect(result.settled).toBe(false);
      expect(result.closes).toBe(false);
    });

    it('does not settle when both creation reads fail, even with nothing pending or executing', () => {
      // created_count's own `default: 0` needs no fail-closed sentinel: a 0 created count
      // essentially never clears `>= expectedProposalCount`, so a failed creation pair already
      // blocks settlement the same way it did before the requery was split into three pairs.
      const result = evaluateSettlement({
        pending: { total: 0 },
        executing: { total: 0 },
        expectedProposalCount: 3,
      });

      expect(result.createdCount).toBe(0);
      expect(result.settled).toBe(false);
      expect(result.closes).toBe(false);
    });

    it('falls back to the first read when only the retry fails', () => {
      const result = evaluateSettlement({
        created: { total: 3 },
        pending: { total: 0 },
        executing: { total: 0 },
        expectedProposalCount: 3,
      });

      expect(result).toEqual({
        createdCount: 3,
        pendingCount: 0,
        executingCount: 0,
        settled: true,
        closes: true,
      });
    });
  });

  describe('hunt — attach_impact', () => {
    const attachImpact = stepIn(huntSteps, 'attach_impact');
    const coordinatorOutput = (impactedEntities: unknown) => ({
      steps: { run_hunt_coordinator: { output: { impacted_entities: impactedEntities } } },
    });

    // Over HTTP, not the `investigations.attachImpact` step: impact is owner-only, and the
    // step's in-process request does not resolve to the profile uid find_or_create's HTTP
    // request recorded as the Investigation's owner.
    it("records impact through the internal impact route on the run's Investigation", () => {
      expect(attachImpact?.type).toBe('kibana.request');
      expect(attachImpact?.with?.method).toBe('POST');
      expect(attachImpact?.with?.path).toBe(
        '/s/{{ workflow.spaceId }}/internal/investigations/impact'
      );
      expect(attachImpact?.with?.body).toEqual({
        conversationId: '{{ inputs.investigationConversationId }}',
        entities: '${{ steps.run_hunt_coordinator.output.impacted_entities }}',
      });
      expect(JSON.stringify(hunt)).not.toContain('investigations.attachImpact');
    });

    it('does not fail the hunt when impact cannot be recorded', () => {
      expect(attachImpact?.['on-failure']).toEqual({ continue: true });
    });

    // The shared step rejects an empty list, and the coordinator only sends one on a confirmed hit.
    it.each([
      ['absent (no confirmed hit)', undefined, false],
      ['empty (hit named no host or user)', [], false],
      ['non-empty', [{ id: 'host:a', name: 'a', type: 'host' }], true],
    ])('runs only when the coordinator sent entities: %s', (_label, entities, expected) => {
      expect(evaluateExpression(attachImpact!.if!, coordinatorOutput(entities))).toBe(expected);
    });

    // The results message reports the impact outcome, so it has to run after the attach.
    it('runs after the SSE attachments and before the results message', () => {
      const names = hunt.steps.map((step) => step.name);
      expect(names.indexOf('attach_impact')).toBeGreaterThan(names.indexOf('attach_sse'));
      expect(names.indexOf('attach_impact')).toBeLessThan(
        names.indexOf('write_hunt_results_message')
      );
    });

    describe('results message impact line', () => {
      const template = String(
        stepIn(huntSteps, 'write_hunt_results_message')?.with?.inputs?.message
      );
      const render = (context: Record<string, unknown>): string =>
        createWorkflowLiquidEngine().parseAndRenderSync(template, {
          execution: { id: 'exec-1' },
          ...context,
        });
      const hitOutput = (impactedEntities: unknown[]) => ({
        narrative: 'Narrative.',
        sse: [{ attachment_id: 'a' }],
        impacted_entities: impactedEntities,
      });
      const twoEntities = [
        { id: 'host:a', name: 'a', type: 'host' },
        { id: 'user:b', name: 'b', type: 'user' },
      ];

      it('counts the entities this run recorded', () => {
        const message = render({
          steps: {
            run_hunt_coordinator: { output: hitOutput(twoEntities) },
            attach_impact: { output: { id: 'impact-1', entities: twoEntities } },
          },
        });
        expect(message).toContain('_Recorded impact: 2 host(s) and user(s)._');
      });

      // `kibana.request` failures carry the status only as an `HTTP <status>:` message prefix.
      it.each([
        ['403', "the Worker's identity lacks the Manage investigations privilege."],
        ['404', "the Worker's identity does not own this Investigation, or it no longer exists."],
        ['400', "an Investigation's impact holds at most 100 hosts and users"],
        ['409', 'another writer updated it at the same time.'],
        ['500', 'See hunt execution exec-1.'],
      ])('explains an HTTP %s by its status', (status, expected) => {
        const message = render({
          steps: {
            run_hunt_coordinator: { output: hitOutput(twoEntities) },
            attach_impact: {
              error: { type: 'Error', message: `HTTP ${status}: {"message":"internal detail"}` },
            },
          },
        });
        expect(message).toContain('_Could not record impact');
        expect(message).toContain(expected);
        // A raw response body would reach every later agent round as user input.
        expect(message).not.toContain('internal detail');
      });

      it('says why nothing was recorded when the hit named no host or user', () => {
        const message = render({
          steps: { run_hunt_coordinator: { output: hitOutput([]) } },
        });
        expect(message).toContain('_No impact recorded: the confirmed hits name no host or user._');
      });

      it('adds no impact line to a run that confirmed nothing', () => {
        const message = render({
          steps: { run_hunt_coordinator: { output: { narrative: 'Narrative.' } } },
        });
        expect(message.trim()).toBe('Narrative.');
      });
    });
  });

  describe('package report benign-close outcome', () => {
    const statusWith = stepIn(packageReportSteps, 'resolve_package_status')?.with as Record<
      string,
      string
    >;
    const summaryWith = stepIn(packageReportSteps, 'resolve_package_summary')?.with as Record<
      string,
      string
    >;
    const liquid = createWorkflowLiquidEngine();
    const render = (template: string, context: Record<string, unknown>) =>
      liquid.parseAndRenderSync(template, context).trim();

    const dismissOutcomeWith = stepIn(packageReportSteps, 'resolve_dismiss_outcome')
      ?.with as Record<string, string>;

    const dismissCase = (dismissStep: Record<string, unknown> | undefined) => {
      const base = {
        inputs: { investigationConversationId: 'conv-1' },
        steps: {
          decide_and_package: { output: { status: 'packaged', dismiss: true, proposals: [] } },
          // A skipped step has no entry at all; a continued failure has an `error` and no `output`.
          ...(dismissStep ? { dismiss_investigation_if_clean: dismissStep } : {}),
        },
      };
      return {
        ...base,
        variables: {
          dispatch_failed_count: 0,
          dismiss_close_failed: evaluateExpression(dismissOutcomeWith.dismiss_close_failed, base),
        },
      };
    };

    it('resolves the dismiss attempt before the status and summary read it', () => {
      const order = packageReport.steps.map((step) => step.name);
      const dismissIdx = order.indexOf('dismiss_investigation_if_clean');

      expect(dismissIdx).toBeGreaterThan(-1);
      expect(dismissIdx).toBeLessThan(order.indexOf('resolve_package_status'));
      expect(dismissIdx).toBeLessThan(order.indexOf('resolve_package_summary'));
    });

    it('reports run_incomplete and an open Investigation when the close patch failed', () => {
      const ctx = dismissCase({ error: { message: 'patch rejected' } });
      const status = render(statusWith.package_status, ctx);
      const reason = render(statusWith.package_reason, ctx);
      const summary = render(summaryWith.package_summary, {
        ...ctx,
        variables: { ...ctx.variables, package_status: status, package_reason: reason },
      });

      expect(ctx.variables.dismiss_close_failed).toBe(true);
      expect(status).toBe('run_incomplete');
      expect(reason).toContain('patch rejected');
      // The Worker journal shows only `reason` on a run_incomplete packaging, so the
      // retry guidance has to live here and not just in the summary.
      expect(reason).toContain('still open');
      expect(reason).toContain('manual run');
      expect(summary).toContain('still open');
      expect(summary).not.toContain('closed this Investigation as benign');
    });

    it('is unchanged when the close succeeded', () => {
      const ctx = dismissCase({ output: {} });
      const status = render(statusWith.package_status, ctx);
      const summary = render(summaryWith.package_summary, {
        ...ctx,
        variables: { ...ctx.variables, package_status: status },
      });

      expect(ctx.variables.dismiss_close_failed).toBe(false);
      expect(status).toBe('success');
      expect(summary).toContain('closed this Investigation as benign');
    });

    it('is unchanged when the dismiss step never ran', () => {
      const ctx = dismissCase(undefined);

      expect(ctx.variables.dismiss_close_failed).toBe(false);
      expect(render(statusWith.package_status, ctx)).toBe('success');
    });
  });
});
