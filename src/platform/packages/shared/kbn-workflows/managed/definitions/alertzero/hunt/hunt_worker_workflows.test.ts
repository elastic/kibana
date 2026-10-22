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
import { createWorkflowLiquidEngine } from '../../../../common/utils';
import { WorkflowGraph } from '../../../../graph';
import type { WorkflowYaml } from '../../../../spec/schema';
import { ALERTZERO_JOURNAL_NOTE_WORKFLOW } from '../journal_note';

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
    result_report_intent_targets?: string;
    result_behaviors?: string;
    report_intent_targets?: string;
    'workflow-id'?: string;
    'run-as-mode'?: string;
    inputs?: Record<string, unknown>;
    path?: string;
    method?: string;
    body?: Record<string, unknown>;
  };
  if?: string;
  'on-failure'?: {
    continue?: boolean;
    retry?: { 'max-attempts'?: number; delay?: string };
  };
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

  // Kept for what it still buys (see the YAML's own concurrency comment for what that is, and for
  // why it is not what keeps two runs from creating the same Proposal) — queued, not dropped, so a
  // racing run still packages rather than being silently lost.
  it('hunt_package_report serializes per Investigation via a queued concurrency key', () => {
    expect(packageReport.settings?.concurrency).toEqual({
      key: 'hunt-package-report-{{ inputs.investigationConversationId }}',
      strategy: 'queue',
      max: 1,
    });
  });

  // A clean run whose dismissal was held (open Proposal) or failed closed (lookup error) must say
  // so in the summary, and a lookup failure must surface as run_incomplete like the mint-side one:
  // nothing waits to close that Investigation and no sweep retries it.
  describe('dismissHold wiring', () => {
    const dataSetWith = (name: string): Record<string, string> =>
      (stepIn(packageReportSteps, name)?.with ?? {}) as Record<string, string>;

    it('summarises each non-none dismissHold value', () => {
      const summary = dataSetWith('resolve_package_summary').package_summary;
      expect(summary).toContain("packaged.dismissHold == 'open_proposal'");
      expect(summary).toContain("packaged.dismissHold == 'check_failed'");
      // Held branches must precede the benign-close branch, or they would never render.
      expect(summary.indexOf("dismissHold == 'open_proposal'")).toBeLessThan(
        summary.indexOf('packaged.dismiss == true -%}')
      );
    });

    it('marks a dismissHold lookup failure as run_incomplete with a reason', () => {
      const { package_status: status, package_reason: reason } =
        dataSetWith('resolve_package_status');
      expect(status).toContain("output.dismissHold == 'check_failed'");
      expect(reason).toContain("output.dismissHold == 'check_failed'");
    });

    it('only closes the Investigation when packaging decided to dismiss', () => {
      expect(stepIn(packageReportSteps, 'dismiss_investigation_if_clean')?.if).toContain(
        'output.dismiss == true'
      );
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
  // reach packaging only as inputs threaded hunt -> Worker -> packaging child -> step.
  describe('the coordinator result handed to packaging', () => {
    const resultVariables = () =>
      huntSteps.find((step) => step.with?.result_report_intent_targets !== undefined)?.with ?? {};
    const workerInputs = () => stepIn(workerSteps, 'package_report')?.with?.inputs ?? {};
    const decideInputs = () => stepIn(packageReportSteps, 'decide_and_package')?.with ?? {};

    it('declares the coordinator results as hunt outputs', () => {
      expect(Object.keys(hunt.outputs?.properties ?? {})).toEqual(
        expect.arrayContaining(['report_intent_targets', 'behaviors'])
      );
    });

    it('declares behaviors as an array', () => {
      expect(hunt.outputs?.properties?.behaviors?.type).toBe('array');
    });

    it.each([
      ['a report match', ['logs-aws.cloudtrail-*'], ['logs-aws.cloudtrail-*']],
      ['no coordinator output', undefined, []],
    ])('reads report_intent_targets as an array for %s (%p)', (_name, value, expected) => {
      expect(
        evaluateExpression(resultVariables().result_report_intent_targets as string, {
          steps: {
            read_hunt_result: value
              ? { output: { data: { result: { report_intent_targets: value } } } }
              : undefined,
          },
        })
      ).toEqual(expected);
    });

    it('reads behaviors as an empty array when Tier 2 never ran', () => {
      expect(
        evaluateExpression(resultVariables().result_behaviors as string, {
          steps: {
            read_hunt_result: { output: { data: { result: { report_intent_targets: [] } } } },
          },
        })
      ).toEqual([]);
    });

    const behaviorsOutput = (behaviors: unknown[]) =>
      evaluateExpression(resultVariables().result_behaviors as string, {
        steps: { read_hunt_result: { output: { data: { result: { tier2: { behaviors } } } } } },
      });
    const executedBehavior = (technique_id: string) => ({
      technique_id,
      execution: { executed: true, row_count: 0, hit: false },
    });

    it('reads the executed behaviors from the coordinator Tier 2 result', () => {
      expect(behaviorsOutput([executedBehavior('T1110')])).toEqual([executedBehavior('T1110')]);
    });

    it('leaves out behaviors that did not execute', () => {
      expect(
        behaviorsOutput([
          { technique_id: 'T1078' },
          { technique_id: 'T1059', execution: { executed: false, row_count: 0, hit: false } },
          executedBehavior('T1110'),
        ])
      ).toEqual([executedBehavior('T1110')]);
    });

    it('keeps an executed behavior that follows more than 20 unexecuted ones', () => {
      const unexecuted = Array.from({ length: 25 }, (_, i) => ({ technique_id: `T${i}` }));

      expect(behaviorsOutput([...unexecuted, executedBehavior('T1110')])).toEqual([
        executedBehavior('T1110'),
      ]);
    });

    it('caps the executed behaviors at the 20 packaging accepts', () => {
      const executed = Array.from({ length: 25 }, (_, i) => executedBehavior(`T${i}`));

      expect((behaviorsOutput(executed) as unknown[]).length).toBe(20);
    });

    it('forwards the report-intent targets and behaviors from the hunt output into the packaging call', () => {
      expect(['reportIntentTargets', 'behaviors'].map((key) => key in workerInputs())).toEqual([
        true,
        true,
      ]);
    });

    it('reads the packaging call inputs as empty arrays when the hunt output is missing', () => {
      expect(
        evaluateExpression(workerInputs().reportIntentTargets as string, {
          steps: { hunt: { output: undefined } },
        })
      ).toEqual([]);
    });

    it('declares the two inputs on the packaging child without requiring them', () => {
      const inputs = packageReport.triggers?.[0]?.inputs;

      expect(
        ['reportIntentTargets', 'behaviors'].map(
          (key) => key in (inputs?.properties ?? {}) && !(inputs?.required ?? []).includes(key)
        )
      ).toEqual([true, true]);
    });

    it('forwards the two inputs from the packaging child into the step', () => {
      expect(['reportIntentTargets', 'behaviors'].map((key) => key in decideInputs())).toEqual([
        true,
        true,
      ]);
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

  // Polled `state` is the sentinel (not "start answered"); give-up / failed → failed, not partial.
  describe('hunt — result status from the polled envelope', () => {
    const variables = stepIn(huntSteps, 'resolve_result_status')?.with as Record<string, string>;
    const liquid = createWorkflowLiquidEngine();
    const render = (template: string, readOutput: unknown): string =>
      liquid
        .parseAndRenderSync(template, {
          inputs: { investigationConversationId: 'conv-1' },
          execution: { id: 'exec-1' },
          steps: {
            run_hunt_coordinator: {
              output: { run_id: 'run-1', state: 'running', result_attachment_id: 'att-1' },
            },
            ...(readOutput === undefined ? {} : { read_hunt_result: { output: readOutput } }),
          },
        })
        .trim();
    const status = (readOutput: unknown) => render(variables.result_status, readOutput);
    const reason = (readOutput: unknown) => render(variables.result_reason, readOutput);

    const LIMIT_REASON =
      'Hunt coordinator did not finish before the hunt child stopped polling (60 reads, 10s apart); see hunt execution exec-1.';

    it('is success with no reason for a completed, complete run', () => {
      const completed = { data: { state: 'completed', result: { completeness: 'complete' } } };
      expect(status(completed)).toBe('success');
      expect(reason(completed)).toBe('');
    });

    it('is partial for a completed run that was incomplete but retryable', () => {
      const completed = {
        data: {
          state: 'completed',
          result: { completeness: 'incomplete_retryable', message: 'Tier 2 timed out' },
        },
      };
      expect(status(completed)).toBe('partial');
      expect(reason(completed)).toContain('incomplete but retryable (Tier 2 timed out)');
    });

    it('is failed with the fixed limit reason when the poll ends on a run still running', () => {
      const running = { data: { state: 'running' } };
      expect(status(running)).toBe('failed');
      expect(reason(running)).toBe(LIMIT_REASON);
    });

    it('is failed with the fixed limit reason when every read failed and nothing was ever read', () => {
      expect(status(undefined)).toBe('failed');
      expect(reason(undefined)).toBe(LIMIT_REASON);
    });

    it('is failed with the envelope message when the run reported failure', () => {
      const failed = { data: { state: 'failed', error: { message: 'Hunt coordinator failed' } } };
      expect(status(failed)).toBe('failed');
      expect(reason(failed)).toBe('Hunt coordinator failed');
    });

    it('still names the missing Investigation first, before any envelope state', () => {
      const rendered = liquid
        .parseAndRenderSync(variables.result_reason, {
          inputs: { investigationConversationId: '' },
          execution: { id: 'exec-1' },
          steps: {},
        })
        .trim();
      expect(rendered).toContain('no Investigation available');
    });

    it('still quotes the start error when the start call itself failed', () => {
      const rendered = liquid
        .parseAndRenderSync(variables.result_reason, {
          inputs: { investigationConversationId: 'conv-1' },
          execution: { id: 'exec-1' },
          steps: { run_hunt_coordinator: { error: { message: 'HTTP 500: {"message":"x"}' } } },
        })
        .trim();
      expect(rendered).toBe('HTTP 500: {"message":"x"}');
    });
  });

  // The contract test compares YAML fields. This builds the engine's execution graph, so the
  // poll loop's constructs (while + max-iterations + timeout around a nested if) are known to
  // compile, and the loop is wired to exit by `continue` rather than fail when it hits the limit.
  describe('hunt — poll loop as the engine compiles it', () => {
    const graph = WorkflowGraph.fromWorkflowDefinition(hunt as unknown as WorkflowYaml);

    it('exits the poll by continue at 60 reads, backstopped by a 12 minute timeout zone', () => {
      expect(graph.getNode('exitWhile_poll_hunt_coordinator')).toMatchObject({
        type: 'exit-while',
        maxIterations: 60,
        onLimit: 'continue',
      });
      expect(graph.getNode('enterTimeoutZone_poll_hunt_coordinator')).toMatchObject({
        type: 'enter-timeout-zone',
        timeout: '12m',
        stepType: 'step_level_timeout',
      });
    });

    // `if_poll_hunt_coordinator` is the guard the step's own `if:` compiles to.
    it('keeps the read, the running check, and the delay inside the loop body', () => {
      expect([...graph.getInnerStepIds('poll_hunt_coordinator')].sort()).toEqual([
        'if_poll_hunt_coordinator',
        'poll_delay',
        'read_hunt_result',
        'wait_if_running',
      ]);
    });
  });

  describe('hunt — attach_impact', () => {
    const attachImpact = stepIn(huntSteps, 'attach_impact');
    const coordinatorOutput = (impactedEntities: unknown) => ({
      steps: {
        read_hunt_result: { output: { data: { result: { impacted_entities: impactedEntities } } } },
      },
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
        entities: '${{ steps.read_hunt_result.output.data.result.impacted_entities }}',
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
            read_hunt_result: { output: { data: { result: hitOutput(twoEntities) } } },
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
            read_hunt_result: { output: { data: { result: hitOutput(twoEntities) } } },
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
          steps: { read_hunt_result: { output: { data: { result: hitOutput([]) } } } },
        });
        expect(message).toContain('_No impact recorded: the confirmed hits name no host or user._');
      });

      it('adds no impact line to a run that confirmed nothing', () => {
        const message = render({
          steps: {
            read_hunt_result: { output: { data: { result: { narrative: 'Narrative.' } } } },
          },
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

  // A finding is created under an id derived from what it proposes, and a finding a live
  // proposal already covers creates nothing and says where it went.
  describe('caller-chosen proposal ids and convergence', () => {
    const gateTrigger = proposalGate.triggers?.[0]?.inputs;

    it('declares proposalId on the gate and requires it: a payload without one would mint a random id and defeat the dedup', () => {
      expect(Object.keys(gateTrigger?.properties ?? {})).toContain('proposalId');
      expect(gateTrigger?.required).toContain('proposalId');
    });

    it('forwards the id packaging resolved when it dispatches each gate', () => {
      const dispatch = stepIn(
        flatten(stepIn(packageReportSteps, 'start_proposal_gates')?.steps ?? []),
        'dispatch_gate'
      );

      expect(String(dispatch?.with?.inputs?.proposalId)).toContain('foreach.item.proposalId');
    });

    it('hands the id to the create step, which is what makes two racing runs create one proposal', () => {
      const create = stepIn(proposalGateSteps, 'create_and_gate_proposal');

      expect(String(create?.with?.inputs?.proposalId)).toContain('inputs.proposalId');
    });

    it('lets the gate carry on past a lost race instead of aborting it', () => {
      // The loser's create fails with a conflict before any gate is parked, and the requery
      // after it still has to run.
      expect(stepIn(proposalGateSteps, 'create_and_gate_proposal')?.['on-failure']?.continue).toBe(
        true
      );
    });

    describe('a lost race', () => {
      // Two reports that reach one host in one sweep are packaged side by side and can both find
      // the subject free. The service creates one Proposal and refuses the other, whose gate used
      // to carry on in silence.
      const fetchStep = stepIn(proposalGateSteps, 'fetch_existing_proposal');
      const resolveStep = stepIn(proposalGateSteps, 'resolve_lost_race');
      const journalStep = stepIn(proposalGateSteps, 'journal_lost_race');
      const lostRaceWith = resolveStep?.with as Record<string, string>;
      const liquid = createWorkflowLiquidEngine();

      const gate = (overrides: {
        fetched?: Record<string, unknown> | undefined;
        spaceId?: string;
      }) => ({
        inputs: {
          conversationId: 'conv-1',
          title: 'Isolate host A',
        },
        workflow: { spaceId: overrides.spaceId ?? 'default' },
        steps:
          overrides.fetched === undefined
            ? {}
            : { fetch_existing_proposal: { output: overrides.fetched } },
      });

      it('only reads the existing Proposal after the create failed', () => {
        expect(fetchStep?.type).toBe('kibana.request');
        expect(fetchStep?.if).toContain('create_and_gate_proposal.error.message');
        expect(fetchStep?.with?.method).toBe('GET');
        expect(fetchStep?.with?.path).toContain('/internal/proposals/{{ inputs.proposalId }}');
      });

      it('retries that read, since the winner may not be searchable yet, and carries on if it still fails', () => {
        expect(fetchStep?.['on-failure']?.retry?.['max-attempts']).toBeGreaterThan(1);
        expect(fetchStep?.['on-failure']?.continue).toBe(true);
      });

      it('is a lost race only when the Proposal under the id belongs to another conversation', () => {
        const isLost = (fetched: Record<string, unknown> | undefined) =>
          evaluateExpression(lostRaceWith.lost_race, gate({ fetched }));

        expect(isLost({ conversationId: 'conv-other' })).toBe(true);
        // The gate itself failed on this Investigation's own Proposal: not a race.
        expect(isLost({ conversationId: 'conv-1' })).toBe(false);
        // The read was skipped, or failed: nothing true can be said, so nothing is written.
        expect(isLost(undefined)).toBe(false);
        expect(isLost({})).toBe(false);
        expect(isLost({ conversationId: '' })).toBe(false);
      });

      it('says where the finding went, and that this Investigation stays open', () => {
        const note = liquid
          .parseAndRenderSync(
            lostRaceWith.lost_race_note,
            gate({ fetched: { conversationId: 'conv-other' } })
          )
          .trim();

        expect(note).toContain('"Isolate host A"');
        expect(note).toContain('(/app/alertzero?selectedConversationId=conv-other)');
        expect(note).toContain('no second Proposal was created');
        expect(note).toContain('stays open until an analyst closes it');
      });

      it('links the space the Investigation is in', () => {
        const note = liquid.parseAndRenderSync(
          lostRaceWith.lost_race_note,
          gate({ fetched: { conversationId: 'conv-other' }, spaceId: 'sec' })
        );

        expect(note).toContain('(/s/sec/app/alertzero?selectedConversationId=conv-other)');
      });

      it('names the action when the gate was given no title', () => {
        const note = liquid.parseAndRenderSync(lostRaceWith.lost_race_note, {
          ...gate({ fetched: { conversationId: 'conv-other' } }),
          inputs: { conversationId: 'conv-1' },
        });

        expect(note).toContain('"the proposed action"');
      });

      it('writes it on this Investigation through the journal workflow, and never fails the gate over it', () => {
        expect(journalStep?.if).toContain('variables.lost_race == true');
        expect(journalStep?.with?.['workflow-id']).toBe(ALERTZERO_JOURNAL_NOTE_WORKFLOW.id);
        expect(journalStep?.with?.['run-as-mode']).toBe('inherit');
        expect(String(journalStep?.with?.inputs?.conversation_id)).toContain(
          'inputs.investigationConversationId'
        );
        expect(String(journalStep?.with?.inputs?.message)).toContain('variables.lost_race_note');
        expect(journalStep?.['on-failure']?.continue).toBe(true);
      });

      it('happens after the create and before the settlement requery that closes the Investigation', () => {
        const order = proposalGate.steps.map((step) => step.name);

        expect(order.indexOf('fetch_existing_proposal')).toBeGreaterThan(
          order.indexOf('create_and_gate_proposal')
        );
        expect(order.indexOf('journal_lost_race')).toBeGreaterThan(
          order.indexOf('fetch_existing_proposal')
        );
        expect(order.indexOf('journal_lost_race')).toBeLessThan(order.indexOf('requery_created'));
      });
    });

    describe('the convergence notes', () => {
      const notes = stepIn(packageReportSteps, 'write_convergence_notes') as
        | (YamlStep & { foreach?: string; mode?: string; if?: string })
        | undefined;
      const noteCall = stepIn(flatten(notes?.steps ?? []), 'write_convergence_note');

      it('runs one note per converged finding, and only when packaging ran and converged any', () => {
        expect(notes?.foreach).toContain('decide_and_package.output.converged');
        expect(notes?.if).toContain("status == 'packaged'");
        expect(notes?.if).toContain('converged != empty');
      });

      it('lets one failed note settle without aborting the others', () => {
        expect(notes?.mode).toBe('settled');
      });

      it('writes the line packaging composed, on this Investigation, through the journal workflow', () => {
        expect(noteCall?.with?.['workflow-id']).toBe(ALERTZERO_JOURNAL_NOTE_WORKFLOW.id);
        expect(noteCall?.with?.['run-as-mode']).toBe('inherit');
        expect(String(noteCall?.with?.inputs?.conversation_id)).toContain(
          'inputs.investigationConversationId'
        );
        expect(String(noteCall?.with?.inputs?.message)).toContain('foreach.item.note');
      });
    });

    describe('the run summary', () => {
      const summaryWith = stepIn(packageReportSteps, 'resolve_package_summary')?.with as Record<
        string,
        string
      >;
      const liquid = createWorkflowLiquidEngine();
      const render = (output: Record<string, unknown>) =>
        liquid
          .parseAndRenderSync(summaryWith.package_summary, {
            steps: {
              decide_and_package: {
                output: {
                  status: 'packaged',
                  dismiss: false,
                  dismissHold: 'none',
                  mintSuppression: 'none',
                  proposals: [],
                  converged: [],
                  alreadyOpenCount: 0,
                  proposalBullets: [],
                  omittedProposalCount: 0,
                  coverage: { written: [], skipped: [] },
                  ...output,
                },
              },
            },
            variables: { package_status: 'success', dispatch_failed_count: 0 },
          })
          .trim();
      const converged = (count: number) =>
        Array.from({ length: count }, (_, i) => ({ proposalId: `p-${i}`, note: 'n' }));

      it('says every proposal already exists when every finding converged, instead of claiming any were prepared', () => {
        const text = render({ converged: converged(2) });

        expect(text).toContain(
          'every proposal it would have raised already exists, so none was created: 2 were raised by another Investigation (the journal says where).'
        );
        expect(text).not.toContain('Packaging prepared');
      });

      it('uses the singular for one', () => {
        expect(render({ converged: converged(1) })).toContain(
          'none was created: 1 was raised by another Investigation'
        );
      });

      // A rerun landing on its own pending or executing proposal creates nothing and closes
      // nothing. Without its own branch this fell through to "prepared 0 proposals ... launched an
      // approval gate for each".
      it('says the findings are already open on this Investigation when a rerun finds its own', () => {
        const text = render({ alreadyOpenCount: 2 });

        expect(text).toContain(
          'every proposal it would have raised already exists, so none was created: 2 are already open on this Investigation.'
        );
        expect(text).not.toContain('Packaging prepared');
        expect(text).not.toContain('raised by another Investigation');
      });

      it('uses the singular for one of its own', () => {
        expect(render({ alreadyOpenCount: 1 })).toContain(
          'none was created: 1 is already open on this Investigation.'
        );
      });

      it('names both when some converged elsewhere and some are already open here', () => {
        expect(render({ converged: converged(1), alreadyOpenCount: 2 })).toContain(
          'none was created: 1 was raised by another Investigation (the journal says where) and 2 are already open on this Investigation.'
        );
      });

      it('keeps the coverage clause after either', () => {
        expect(
          render({ alreadyOpenCount: 1, coverage: { written: [{ kiId: 'k' }], skipped: [] } })
        ).toContain('already open on this Investigation; also recorded 1 coverage knowledge item');
      });

      it('counts converged findings beside the ones it prepared', () => {
        const text = render({
          proposals: [{ proposalId: 'p-new' }],
          proposalBullets: ['- Isolate host B'],
          converged: converged(1),
        });

        expect(text).toContain('Packaging prepared 1 proposal');
        expect(text).toContain('1 more finding already has a Proposal, so none was created for it');
      });

      it('counts findings already open here beside the ones it prepared', () => {
        const text = render({
          proposals: [{ proposalId: 'p-new' }],
          proposalBullets: ['- Isolate host B'],
          alreadyOpenCount: 2,
        });

        expect(text).toContain('Packaging prepared 1 proposal');
        expect(text).toContain(
          '2 more findings already have a Proposal, so none was created for them'
        );
      });

      it('is unchanged when nothing converged', () => {
        const text = render({ proposals: [{ proposalId: 'p-new' }], proposalBullets: ['- x'] });

        expect(text).toContain('Packaging prepared 1 proposal');
        expect(text).not.toContain('already');
      });

      it('no longer mentions an Investigation-wide existing-proposals guard anywhere', () => {
        expect(summaryWith.package_summary).not.toContain('existing_proposals');
        expect(summaryWith.package_summary).not.toContain(
          'already has a Proposal from an earlier run'
        );
      });
    });
  });
});
