/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';

import { PND_WATCH_POST_INCIDENT_WORKFLOW, PND_WORKFLOW_TEMPLATE_VALUES } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';

/**
 * The only detection-rule fields a PND tuning proposal may name.
 *
 * ⚠️ The authoritative source is `PND_TUNABLE_RULE_FIELDS` in `@kbn/pnd-common`, which this package
 * **cannot** import: `@kbn/workflows` is `group: platform` and `@kbn/pnd-common` is
 * `group: security`, and `@kbn/imports/no_group_crossing_imports` forbids platform depending on a
 * solution. So the set is restated here and the cross-package pin lives on the `@kbn/pnd-common`
 * side, in a project that references both packages.
 *
 * `query` is IN the set as of this bead. A query rewrite does change which documents the rule
 * matches, which is exactly why it was excluded while the card showed nothing but the model's word
 * for it — and exactly what the review flow now makes reviewable: the approver reads the rule's own
 * query beside the proposed one, and a before/after alert count this workflow measures itself. It is
 * the one member carrying a precondition no allow-list can express, so `_apply` enforces that
 * separately by re-fetching the rule and refusing a `query` patch on any rule whose `type` is not
 * `query`.
 *
 * Alert suppression and `threshold` stay out because they change how alerts GROUP rather than which
 * documents match, which breaks alert continuity and cannot be shown as a diff. `exceptions_list`
 * stays out for a reason of its own: a rule patch *replaces* that array rather than merging it, so an
 * LLM-authored value would silently detach every exception list already attached to the rule.
 */
const EXPECTED_TUNABLE_RULE_FIELDS = ['enabled', 'investigation_fields', 'note', 'query'];

/**
 * The watches allowed to raise a `security.detectionChangeSignal` this workflow will act on.
 *
 * ⚠️ Pinned as literals for the same group-crossing reason as the field set above: the ids live in
 * `SYSTEM_SECURITY_WATCH_IDS` / `PND_WATCH_WORKFLOW_IDS` in `@kbn/pnd-common`, which this platform
 * package may not import.
 *
 * `system-security-watch-post-incident` is deliberately NOT here. It is the subscriber; the
 * containment gate that emits the claim is registered on Watch Floor, so post-incident can never be
 * a producer — and a watch that allow-lists its own id is one future emit away from triggering
 * itself.
 */
const EXPECTED_CLAIM_PRODUCER_WATCH_IDS = [
  'system-security-watch-dark',
  'system-security-watch-deep',
  'system-security-watch-floor',
  'system-security-watch-officer',
];

interface ParsedOnFailure {
  continue?: boolean | string;
  retry?: { 'max-attempts'?: number; delay?: string };
}

interface ParsedReasoningSection {
  title?: string;
  body?: string;
}

interface ParsedAttachment {
  type?: string;
  id?: string;
  data?: { alert?: string; attachmentLabel?: string };
}

interface ParsedJsonSchema {
  type?: string;
  description?: string;
  maxLength?: number;
  properties?: Record<string, ParsedJsonSchema>;
  required?: string[];
}

interface ParsedStepWith {
  attachments?: ParsedAttachment[];
  correlationId?: string;
  body?: Record<string, unknown>;
  conversation_id?: string;
  headers?: Record<string, string>;
  inputs?: {
    invocation_count?: number;
    preview_body?: Record<string, unknown>;
    query_override?: string;
    rule?: string;
    space_id?: string;
    timeframe_end?: string;
  };
  message?: string;
  metadata?: Record<string, string>;
  method?: string;
  outcome?: string;
  path?: string;
  phase?: string;
  query?: Record<string, string>;
  rationale?: string;
  reasoning?: { summary?: string; sections?: ParsedReasoningSection[] };
  schema?: ParsedJsonSchema;
  timeframeEnd?: string;
  'workflow-id'?: string;
}

interface ParsedStep {
  name: string;
  type: string;
  'agent-id'?: string;
  condition?: string;
  'create-conversation'?: boolean;
  else?: ParsedStep[];
  if?: string;
  'on-failure'?: ParsedOnFailure;
  'public-conversation'?: boolean;
  status?: string;
  steps?: ParsedStep[];
  timeout?: string;
  with?: ParsedStepWith;
}

interface ParsedTrigger {
  type: string;
  on?: { condition?: string };
}

interface ParsedWorkflow {
  name?: string;
  settings?: { timeout?: string };
  steps?: ParsedStep[];
  triggers?: ParsedTrigger[];
}

// `yamlTemplate` rather than `yaml`: decision 7 moved every PND definition onto a template that
// ignores the values it is handed. See the comment at the top of `./index.ts`.
const parsed = parse(
  PND_WATCH_POST_INCIDENT_WORKFLOW.yamlTemplate(PND_WORKFLOW_TEMPLATE_VALUES)
) as ParsedWorkflow;

/** Every step in the tree, flattened through `steps` and `else` branches. */
const flatten = (steps: ParsedStep[] | undefined): ParsedStep[] =>
  (steps ?? []).flatMap((step) => [step, ...flatten(step.steps), ...flatten(step.else)]);

const allSteps = flatten(parsed.steps);

const getStep = (name: string): ParsedStep => {
  const step = allSteps.find((s) => s.name === name);
  if (!step) {
    throw new Error(`No '${name}' step found in Post-Incident Watch workflow`);
  }
  return step;
};

/** The `if` step whose true- or false-branch directly contains `name`, when one exists. */
const findEnclosingIf = (name: string): ParsedStep | undefined =>
  allSteps.find(
    (step) =>
      step.type === 'if' &&
      [...(step.steps ?? []), ...(step.else ?? [])].some((child) => child.name === name)
  );

/** Names of the steps in `container`, in declaration order. */
const stepNames = (container: ParsedStep[] | undefined): string[] =>
  (container ?? []).map(({ name }) => name);

/**
 * Renders a template the way the execution engine does. `WorkflowTemplatingEngine`
 * (`workflows_execution_engine/server/templating_engine.ts`) builds the shared workflow Liquid
 * engine with `strictFilters: true` and `strictVariables: false`, and the non-strict variables are
 * the whole reason a missing step output renders as an empty string instead of throwing. Rendering
 * with any other options would prove nothing about the real degraded path.
 */
const render = (template: string | undefined, context: Record<string, unknown>): string =>
  createWorkflowLiquidEngine({ strictFilters: true, strictVariables: false }).parseAndRenderSync(
    template ?? '',
    context
  );

/**
 * A `security.detectionChangeSignal` payload as PND emits it from the Watch Floor containment gate.
 *
 * The evidence is a KINDED REF ARRAY rather than a top-level `correlationId` (D7), which is
 * why `set_correlation_id` exists at all.
 *
 * `ruleRef` is present because this watch takes the TUNING branch of the claim; it is optional on the
 * producer side, and the degraded shape is asserted separately.
 *
 * ⚠️ `timestamp` is deliberately NOT in `DetectionChangeSignalEventSchema` and is deliberately here:
 * the engine validates the emitter's raw payload and then builds the step context as
 * `{ ...payload, timestamp, spaceId, … }` (`trigger_event_handler.ts`), so `event.timestamp` is
 * readable from a template even though an emitter cannot supply it. `set_backtest_window` anchors the
 * backtest on it.
 */
const CLAIM_EVENT = {
  evidenceRefs: [
    { id: 'ad-1', kind: 'attack_discovery' },
    { id: 'conversation-1', kind: 'conversation' },
  ],
  gapDescription: 'No rule covers the persistence this incident used',
  ruleRef: 'rule-1',
  sourceRunId: 'run-1',
  sourceWatchId: 'system-security-watch-floor',
  spaceId: 'default',
  tactics: ['Persistence'],
  timestamp: '2026-02-03T04:05:06.000Z',
};

/** `derive_ids` succeeded; only the draft is missing. Shared by both degraded contexts below. */
const DERIVED_IDS_STEP = {
  derive_ids: {
    output: {
      attackDiscoveryTitle: 'Credential dumping on host-1',
      tuningAgentId: 'pnd.tuning',
      tuningConversationId: 'conversation-1',
    },
  },
};

/**
 * The step context the gate sees after `draft_tuning` fails and its `on-failure.continue` carries
 * the run onward. `continue` leaves the step FAILED rather than re-marking it completed, and the
 * `ai.agent` handler returns a partial output on failure (`agent_builder/server/step_types/
 * run_agent_step.ts`), so `output` exists with an empty `message` and **no** `structured_output`.
 */
const CONTEXT_WITHOUT_DRAFT = {
  event: CLAIM_EVENT,
  steps: {
    ...DERIVED_IDS_STEP,
    draft_tuning: { output: { message: '', metadata: { usage: {} } } },
  },
};

/**
 * The other failure shape: a step that throws without a partial output gets the `null` FAILED-step
 * sentinel written as its output (`step_execution_runtime.ts`'s `failStep`). `null` is not
 * `undefined`, so it is worth pinning that the degraded branch still fires through it.
 */
const CONTEXT_WITH_NULL_DRAFT_OUTPUT = {
  event: CLAIM_EVENT,
  steps: { ...DERIVED_IDS_STEP, draft_tuning: { output: null } },
};

/**
 * The same context after a successful draft, so the normal path can be asserted alongside it.
 *
 * A NON-query tuning, which is the case where both backtest sides are inconclusive by design: only a
 * query change alters which documents the rule matches, so there is nothing for a preview to compare.
 * The model returns no `preview` object at all any more — it never could (`security.run_rule_preview`
 * sits behind a default-false experimental flag and the agent holds `NO_TOOLS`), and the workflow
 * measures the backtest itself now.
 */
const CONTEXT_WITH_DRAFT = {
  event: CLAIM_EVENT,
  steps: {
    ...DERIVED_IDS_STEP,
    draft_tuning: {
      output: {
        structured_output: {
          change: { enabled: true },
          proposal: 'I propose enabling the rule; declining changes nothing.',
          rationale: 'The rule was disabled and would have caught the observed behaviour.',
          ruleId: 'rule-1',
          ruleName: 'Suspicious PowerShell',
        },
      },
    },
  },
};

/**
 * A query tuning whose backtest both previews measured, which is the case this bead exists to make
 * possible: a real query diff with a real before/after count behind it.
 *
 * The as-proposed side is a MEASURED zero, deliberately. A zero and an unmeasured side are the two
 * values a reader must never confuse, so the fixture pins the one that renders as a bare number.
 */
const CONTEXT_WITH_MEASURED_BACKTEST = {
  event: CLAIM_EVENT,
  steps: {
    ...DERIVED_IDS_STEP,
    draft_tuning: {
      output: {
        structured_output: {
          change: { query: 'process.name : "powershell.exe" and process.args : "-enc"' },
          current_query: 'process.name : "powershell.exe"',
          proposal: 'I propose narrowing the query; declining changes nothing.',
          proposed_query: 'process.name : "powershell.exe" and process.args : "-enc"',
          rationale: 'The unqualified query fires on every PowerShell launch.',
          ruleId: 'rule-1',
          ruleName: 'Suspicious PowerShell',
        },
      },
    },
    fetch_tuning_rule: { output: { query: 'process.name : "powershell.exe"', type: 'query' } },
    preview_current_query: { output: { alert_count: 9, is_aborted: false, succeeded: true } },
    preview_proposed_query: { output: { alert_count: 0, is_aborted: false, succeeded: true } },
    set_backtest_window: { output: { timeframeEnd: '2026-02-03T04:05:06.000Z' } },
  },
};

// kibana-phf4.8: this watch subscribed to `pnd.incidentClosed`, which says only "an incident closed"
// (D14 / P3) and carries ids alone. It now subscribes to `security.detectionChangeSignal` — the CLAIM
// that detection coverage is missing or mistuned — which carries the analyst's own gap description,
// the incident's ATT&CK tactics and refs to the evidence. `pnd.incidentClosed` stays registered and
// stays emitted, deliberately with no subscriber.
//
// Everything here is asserted against the PARSED document, never the raw YAML: the condition is a
// `>-` folded scalar, so no line of it is contiguous in source and a source grep proves nothing about
// what the engine evaluates.
describe('watch_post_incident.yaml subscribes to the coverage-gap claim (kibana-phf4.8)', () => {
  const claimTrigger = (parsed.triggers ?? []).find(
    ({ type }) => type === 'security.detectionChangeSignal'
  );
  const condition = claimTrigger?.on?.condition;

  it('subscribes to the claim', () => {
    expect(claimTrigger).toBeDefined();
  });

  it('no longer subscribes to the pnd.incidentClosed lifecycle fact', () => {
    expect((parsed.triggers ?? []).map(({ type }) => type)).not.toContain('pnd.incidentClosed');
  });

  it('stays manually runnable, so the watch can be exercised without an emit', () => {
    expect((parsed.triggers ?? []).map(({ type }) => type)).toContain('manual');
  });

  it('declares no third trigger', () => {
    expect(parsed.triggers).toHaveLength(2);
  });

  it('leaves the manual trigger unconditioned, so a manual run is never filtered out', () => {
    expect((parsed.triggers ?? []).find(({ type }) => type === 'manual')?.on).toBeUndefined();
  });

  // The whole condition, as the engine sees it after folding. `@kbn/eval-kql` evaluates this string
  // in memory against `{ event: payload }`, so this is the exact text that decides whether a claim
  // starts Phase 4.
  it('restricts the claim to the watches that can produce one', () => {
    expect(condition).toBe(
      'event.sourceWatchId: ("system-security-watch-floor" or "system-security-watch-officer" or "system-security-watch-dark" or "system-security-watch-deep")'
    );
  });

  it.each(EXPECTED_CLAIM_PRODUCER_WATCH_IDS)('allow-lists %s', (watchId) => {
    expect(condition).toContain(`"${watchId}"`);
  });

  // One future emit from its own steps would otherwise make this watch trigger itself.
  it('never allow-lists its own id', () => {
    expect(condition).not.toContain('system-security-watch-post-incident');
  });

  // ADR-014: a trigger condition that does not match means the workflow does not run, so a positive
  // allow-list is fail-closed for free. A `not (…)` deny-list fails OPEN for every producer nobody
  // thought of.
  it('is a positive allow-list rather than a negation (ADR-014)', () => {
    expect(condition).not.toContain('not ');
  });

  // ⛔ `event.evidenceRefs.kind: "attack_discovery"` looks like the natural extra clause and can
  // never be true: `readContextPath` walks segments with `segment in result`, and `evidenceRefs` is
  // an array of OBJECTS, so the path "does not exist" and the condition is permanently false. Adding
  // it would silently stop this watch from ever running.
  it('never conditions on the object-array evidence refs, which can never match in memory', () => {
    expect(condition).not.toContain('evidenceRefs');
  });

  // The load-bearing half of the swap. `versionStrategy: 'auto'` only re-applies the YAML when the
  // version increases, so an un-bumped edit leaves an installed stack subscribed to the OLD trigger —
  // which nothing stops emitting, so Phase 4 would keep running off the lifecycle fact and every
  // symptom would point at the emit rather than at the install.
  it('bumps the managed version, so the new trigger reaches an installed stack', () => {
    expect(PND_WATCH_POST_INCIDENT_WORKFLOW.version).toBeGreaterThan(6);
  });
});

// The claim carries no top-level `correlationId` — its evidence is a kinded ref array (D7),
// because Dark Watch's evidence is hunt findings with no Attack Discovery anywhere in its path. So
// the id every step below keys on is projected out of the refs exactly once, here.
describe('watch_post_incident.yaml recovers the attack discovery id from the claim (kibana-phf4.8)', () => {
  const step = getStep('set_correlation_id');
  const template = step.with?.correlationId;

  // Six steps read `steps.set_correlation_id.output.*`, and only a step that has already run
  // has an output.
  it('runs first, before anything reads the id', () => {
    expect(stepNames(parsed.steps)[0]).toBe('set_correlation_id');
  });

  // `DataSetStepImpl._run` returns the rendered `with` block AS the step output, which is what makes
  // `steps.set_correlation_id.output.correlationId` readable at all.
  it('stays a data.set, because its output is its rendered with-block', () => {
    expect(step.type).toBe('data.set');
  });

  it('projects the id out of the claim evidence', () => {
    expect(render(template, { event: CLAIM_EVENT })).toBe('ad-1');
  });

  it('ignores refs of other kinds', () => {
    expect(
      render(template, {
        event: {
          evidenceRefs: [
            { id: 'hunt-1', kind: 'hunt_finding' },
            { id: 'ad-2', kind: 'attack_discovery' },
          ],
        },
      })
    ).toBe('ad-2');
  });

  // The engine renders with `strictVariables: false`, so both degraded shapes render the empty string
  // rather than failing — exactly what `{{ event.attackDiscoveryAlertId }}` produced on a manual run,
  // which is why nothing downstream changes: `_derive` fails, its `continue: true` carries the run to
  // the gate, and the card says plainly that nothing was drafted.
  it('renders empty on a manual run, rather than failing the step', () => {
    expect(render(template, {})).toBe('');
  });

  it('renders empty for a claim whose refs name no attack discovery', () => {
    expect(
      render(template, { event: { evidenceRefs: [{ id: 'hunt-1', kind: 'hunt_finding' }] } })
    ).toBe('');
  });

  // Asserted on the parsed document rather than the YAML source: a `{{ … }}` inside a folded scalar
  // is not contiguous in source, so a raw-text search could pass while a reference survived.
  it('leaves no step reading the id off the event any more', () => {
    expect(JSON.stringify(parsed)).not.toContain('event.attackDiscoveryAlertId');
  });
});

// A5: Phase 4 had no `derive_ids` at all, so it could not name a conversation, attach the discovery
// or title anything. The step is identical in shape to the Deep Watch's, keyed on the attack
// discovery id `set_correlation_id` recovered from the claim's evidence refs.
describe('watch_post_incident.yaml phase-4 parity (A5)', () => {
  const step = getStep('derive_ids');

  it('derives the conversation context first, right after the id it keys on', () => {
    expect(stepNames(parsed.steps)[1]).toBe('derive_ids');
  });

  it('is a kibana.request step', () => {
    expect(step.type).toBe('kibana.request');
  });

  // kibana.request sends `path` verbatim for its raw-API form (buildKibanaRequest short-circuits on
  // `kibana.request` before applySpacePrefix), so the space has to be prefixed by hand.
  it('prefixes the space explicitly, because kibana.request sends path verbatim', () => {
    expect(step.with?.path).toBe('/s/{{ workflow.spaceId }}/internal/pnd/conversations/_derive');
  });

  it('keys on the attack discovery id recovered from the claim', () => {
    expect(step.with?.query?.correlationId).toBe(
      '{{ steps.set_correlation_id.output.correlationId }}'
    );
  });

  // PND's own routes ARE versioned, unlike Agent Builder's `_rename`.
  it('sends elastic-api-version, because PND internal routes are versioned', () => {
    expect(step.with?.headers?.['elastic-api-version']).toBe('1');
  });

  it('retries transient failures before degrading', () => {
    expect(step['on-failure']?.retry?.['max-attempts']).toBe(3);
  });

  it('continues on exhausted failure rather than aborting the run', () => {
    expect(step['on-failure']?.continue).toBe(true);
  });
});

// kibana-tjil.1: this watch's only gate is alwaysGate and already parks; the autonomy read
// existed for parity and is gone with the Floor's. Nothing here may reintroduce it.
describe('watch_post_incident.yaml always-park (kibana-tjil.1)', () => {
  it('declares no read_autonomy step', () => {
    expect(allSteps.map(({ name }) => name)).not.toContain('read_autonomy');
  });
});

// ⛔ ADR-005 / S8 / D15: `await_apply_tuning` is `alwaysGate`. It has no `if` wrapper by design, so no
// autonomy level can auto-accept it, and it must never gain one.
//
// ⚠️ Since bead kibana-phf4.33 this, the `alwaysGate` flag itself and `_auto_respond`'s unconditional refusal
// are the only record of the invariant: the Watch settings page's Approval gates table was deleted per
// the 2026-08-10 design, so nothing outside the code says that a tuning always needs a human.
describe('watch_post_incident.yaml alwaysGate structural invariant', () => {
  it('declares await_apply_tuning at the top level', () => {
    expect(stepNames(parsed.steps)).toContain('await_apply_tuning');
  });

  // 30d, not the 72h default. Expiry FAILS the step, which is fail-closed.
  it('waits 30 days at the tuning gate before failing closed', () => {
    expect(getStep('await_apply_tuning').timeout).toBe('30d');
  });

  // The engine's default `settings.timeout` is 6h from **run** start. Idle HITL resume takes
  // min(step timeout, workflow timeout), so omitting this expires a recently parked gate as
  // soon as the Post-Incident run itself is 6h old — even though the step still says 30d.
  it('sets the workflow timeout to 30d so the run clock cannot undercut the HITL wait', () => {
    expect(parsed.settings?.timeout).toBe('30d');
  });

  it('bumps the managed version, so the workflow timeout reaches an installed stack', () => {
    expect(PND_WATCH_POST_INCIDENT_WORKFLOW.version).toBeGreaterThan(13);
  });

  it('never wraps await_apply_tuning in an if step', () => {
    expect(findEnclosingIf('await_apply_tuning')).toBeUndefined();
  });

  it('never wraps its reasoning block in an if step either', () => {
    expect(findEnclosingIf('reason_apply_tuning')).toBeUndefined();
  });
});

// kibana-phf4.11: the draft used to be recall — the model named a rule from training data and
// described a change to a query it had never seen. This read is what turns it into a CHOICE over the
// rules that actually fired the alerts behind this incident, each with its current query.
describe('watch_post_incident.yaml candidate rule menu (kibana-phf4.11)', () => {
  const step = getStep('read_candidate_rules');

  it('is a kibana.request step', () => {
    expect(step.type).toBe('kibana.request');
  });

  it('GETs the candidate rules', () => {
    expect(step.with?.method).toBe('GET');
  });

  // kibana.request sends `path` verbatim, so the space has to be prefixed by hand.
  it('targets the internal candidate-rules route in the workflow space', () => {
    expect(step.with?.path).toBe('/s/{{ workflow.spaceId }}/internal/pnd/tuning/candidate-rules');
  });

  it('sends elastic-api-version, because PND internal routes are versioned', () => {
    expect(step.with?.headers?.['elastic-api-version']).toBe('1');
  });

  it('keys on the attack discovery recovered from the claim', () => {
    expect(step.with?.query?.correlationId).toBe(
      '{{ steps.set_correlation_id.output.correlationId }}'
    );
  });

  it('passes the claim ruleRef through, so a signal that named a rule pins the menu to it', () => {
    expect(step.with?.query?.ruleRef).toBe('{{ event.ruleRef }}');
  });

  // `ruleRef` is optional on the producer side (present means tuning, absent means creation), and the
  // route reads an empty value as "the whole menu" rather than as "no rule matched".
  it('renders an empty ruleRef for a claim that named no rule, rather than failing', () => {
    expect(render(step.with?.query?.ruleRef, { event: {} })).toBe('');
  });

  it('retries transient failures before degrading', () => {
    expect(step['on-failure']?.retry?.['max-attempts']).toBe(3);
  });

  // R2/D5: the single gate downstream is alwaysGate, so a failed read can only make the card thinner,
  // never open a gate that should have stayed shut.
  it('continues on failure, so a failed read can only thin the card', () => {
    expect(step['on-failure']?.continue).toBe(true);
  });

  it('runs after the id it keys on', () => {
    const names = stepNames(parsed.steps);

    expect(names.indexOf('read_candidate_rules')).toBeGreaterThan(
      names.indexOf('set_correlation_id')
    );
  });

  it('runs before the draft that chooses from it', () => {
    const names = stepNames(parsed.steps);

    expect(names.indexOf('read_candidate_rules')).toBeLessThan(names.indexOf('draft_tuning'));
  });

  it('hands the menu to the model', () => {
    expect(getStep('draft_tuning').with?.message).toContain(
      '{{ steps.read_candidate_rules.output.rules | json }}'
    );
  });

  it('tells the model to choose from the menu rather than from memory', () => {
    expect(getStep('draft_tuning').with?.message).toContain('Do not name a rule from memory');
  });

  it('requires the chosen id to be copied verbatim, because the backtest and the apply resolve it', () => {
    expect(getStep('draft_tuning').with?.message).toContain('copy its `id` into `ruleId`');
  });

  it('takes the coverage gap from what the analyst recorded rather than re-deriving it', () => {
    expect(getStep('draft_tuning').with?.message).toContain('{{ event.gapDescription }}');
  });

  it('carries the tactics the analyst filed the gap under', () => {
    expect(getStep('draft_tuning').with?.message).toContain('{{ event.tactics | json }}');
  });

  // `== blank` rather than `unless`: an empty string is TRUTHY in Liquid, and `strictVariables: false`
  // means a failed read renders as one rather than throwing — so the degraded prompt has to be
  // asserted as rendered text.
  it('tells the model plainly when the read produced no menu at all', () => {
    expect(
      render(getStep('draft_tuning').with?.message, { event: CLAIM_EVENT, steps: DERIVED_IDS_STEP })
    ).toContain('NONE — the candidate-rule read did not return');
  });

  it('bumps the managed version, so the menu reaches an installed stack', () => {
    expect(PND_WATCH_POST_INCIDENT_WORKFLOW.version).toBeGreaterThan(7);
  });
});

describe('watch_post_incident.yaml tuning conversation (A2 / A4 / A5)', () => {
  const step = getStep('draft_tuning');

  it('opens the phase-4 conversation at the third derived UUIDv5', () => {
    expect(step.with?.conversation_id).toBe('{{ steps.derive_ids.output.tuningConversationId }}');
  });

  // ADR-011: agent existence and agent-id availability degrade together.
  it('takes its agent id from _derive rather than hardcoding one', () => {
    expect(step['agent-id']).toBe('{{ steps.derive_ids.output.tuningAgentId }}');
  });

  it('stamps the phase on the agent execution', () => {
    expect(step.with?.metadata?.pnd_conversation_kind).toBe('tuning');
  });

  it('stamps the attack discovery id, so all three phases of one attack correlate', () => {
    expect(step.with?.metadata?.pnd_attack_discovery_alert_id).toBe(
      '{{ steps.set_correlation_id.output.correlationId }}'
    );
  });

  it('attaches the attack discovery as a security.alert', () => {
    expect(step.with?.attachments?.[0]?.type).toBe('security.alert');
  });

  it('reuses the same stable attachment id as the Deep Watch', () => {
    expect(step.with?.attachments?.[0]?.id).toBe(
      'pnd-ad-{{ steps.set_correlation_id.output.correlationId }}'
    );
  });

  it('labels the chip with the attack discovery title', () => {
    expect(step.with?.attachments?.[0]?.data?.attachmentLabel).toBe(
      'Attack discovery: {{ steps.derive_ids.output.attackDiscoveryTitle }}'
    );
  });

  // The event carries only ids, so `{{ event | json }}` handed the model a blob with no attack
  // narrative in it.
  it('no longer dumps the raw event into the prompt', () => {
    expect(step.with?.message).not.toContain('{{ event | json }}');
  });

  it('gives the model the attack narrative instead', () => {
    expect(step.with?.message).toContain('{{ steps.derive_ids.output.attackDiscoveryMarkdown }}');
  });

  it('names the incident conversation for traceability', () => {
    expect(step.with?.message).toContain('{{ steps.derive_ids.output.incidentConversationId }}');
  });

  it('creates the conversation as public, so any analyst working the queue can read it', () => {
    expect(step['public-conversation']).toBe(true);
  });

  // Still multi-step tool work rather than one completion — `attachment_read` over the discovery
  // markdown, then a choice across a menu of rules and their current queries. The step no longer
  // previews anything itself, but the timeout stays where the epic put it: shortening it would be an
  // unrelated behaviour change to the one step whose failure history is this watch's R2.
  it('allows time for multi-step tool use', () => {
    expect(step.timeout).toBe('1800s');
  });

  it('asks the agent to state what it will propose for approval', () => {
    expect(step.with?.message).toContain('what you will propose for human approval');
  });

  it('returns that statement in structured output so the gate card can quote it verbatim', () => {
    expect(step.with?.schema?.properties).toHaveProperty('proposal');
  });
});

// R2, the confirmed root cause of "no tuning proposal has ever surfaced in the UI": `draft_tuning`
// carried no `on-failure` while every neighbouring step did, so any agent failure aborted the run.
//
// R2a is why that made only *tuning* invisible: in the Deep Watch the first gate PRECEDES the first
// `ai.agent`, so an LLM failure there still leaves a parked gate an analyst can see. Here the only
// gate FOLLOWS `draft_tuning`, so an abort left nothing to render anywhere. R2b is why the failure
// rate is highest on exactly this step: its structured-output schema requires five fields including
// a nested object, against three scalars in the Deep Watch.
describe('watch_post_incident.yaml draft_tuning degradation (R2)', () => {
  const step = getStep('draft_tuning');

  it('continues on failure, so an agent failure can never abort the run before the gate', () => {
    expect(step['on-failure']?.continue).toBe(true);
  });

  // Deliberately no retry, unlike the kibana.request steps: this is an 1800s multi-step agent turn
  // that creates a conversation at a fixed id, and Agent Builder's create is `op_type: 'create'`, so
  // a retry after a partial failure re-runs half an hour of tool work into a likely id conflict. The
  // two neighbouring `ai.agent` steps use the same bare `continue: true`.
  it('does not retry the 1800s agent turn', () => {
    expect(step['on-failure']?.retry).toBeUndefined();
  });

  it('declares the only gate after draft_tuning, which is what makes the handler load-bearing', () => {
    const names = stepNames(parsed.steps);

    expect(names.indexOf('await_apply_tuning')).toBeGreaterThan(names.indexOf('draft_tuning'));
  });

  // `versionStrategy: 'auto'` only re-applies the YAML when the version increases, so a fix that
  // does not bump the version never reaches an installed stack. Greater-than rather than equal, so
  // later beads can keep bumping it.
  it('bumps the managed version, so the fix actually reaches an installed stack', () => {
    expect(PND_WATCH_POST_INCIDENT_WORKFLOW.version).toBeGreaterThan(2);
  });
});

// B6a, layer 1 of three: the schema closes the object so the model cannot propose anything outside
// the safe set. The layer that actually enforces the boundary is `_apply`'s server-side allow-list.
describe('watch_post_incident.yaml constrained tuning proposal (B6a)', () => {
  const changeSchema = getStep('draft_tuning').with?.schema?.properties?.change;

  it('models the proposed change as an object rather than free text', () => {
    expect(changeSchema?.type).toBe('object');
  });

  it('allows exactly the non-continuity-breaking rule fields', () => {
    expect(Object.keys(changeSchema?.properties ?? {}).sort()).toEqual(
      [...EXPECTED_TUNABLE_RULE_FIELDS].sort()
    );
  });

  // Widened by this bead, and only because the review flow caught up: the approver now reads the
  // rule's own query beside the proposed one and a before/after count the workflow measured. The
  // precondition the allow-list cannot express — `type` must be `query` — is enforced by `_apply`
  // re-fetching the rule, not here.
  it('lets the model propose a query rewrite, now that the card carries a diff and a backtest', () => {
    expect(changeSchema?.properties).toHaveProperty('query');
  });

  // The composed summary is truncated at 8192 characters by `extractReasoningSummary`, silently, so
  // every free-form field on this schema is bounded well below it.
  it('bounds the proposed query, so one field cannot crowd the composed card', () => {
    expect(changeSchema?.properties?.query?.maxLength).toBe(2000);
  });

  it('still refuses alert suppression, which changes how alerts group', () => {
    expect(changeSchema?.properties).not.toHaveProperty('alert_suppression');
  });

  it('still refuses threshold, for the same alert-continuity reason', () => {
    expect(changeSchema?.properties).not.toHaveProperty('threshold');
  });

  // Its own separate reason: a rule patch REPLACES this array rather than merging it, so an
  // LLM-authored value would silently detach every exception list already on the rule.
  it('still refuses exceptions_list, which a patch replaces rather than merges', () => {
    expect(changeSchema?.properties).not.toHaveProperty('exceptions_list');
  });

  it('requires the change', () => {
    expect(getStep('draft_tuning').with?.schema?.required).toContain('change');
  });

  it('requires the rule id the change applies to', () => {
    expect(getStep('draft_tuning').with?.schema?.required).toContain('ruleId');
  });

  it('requires the rule name, because a bare id is not reviewable', () => {
    expect(getStep('draft_tuning').with?.schema?.required).toContain('ruleName');
  });

  it('tells the agent which fields it may name', () => {
    expect(getStep('draft_tuning').with?.message).toContain('investigation_fields');
  });

  it('tells the agent when a query change is permitted at all', () => {
    expect(getStep('draft_tuning').with?.message).toContain(
      'Propose `query` ONLY when the rule you chose reports `"type": "query"`'
    );
  });

  it('tells the agent that suppression and threshold are still forbidden', () => {
    expect(getStep('draft_tuning').with?.message).toContain(
      'Never propose an alert-suppression or `threshold` change'
    );
  });
});

// A8: a tuning proposal without a backtest is a request to trust the model — so this bead stopped
// ASKING for one. The model authored a `preview` object it could never fill: it holds `NO_TOOLS`, and
// `security.run_rule_preview` is registered only behind
// `experimentalFeatures.rulePreviewAttachmentEnabled` (default FALSE), so every value in it would
// have been invented. The workflow measures the backtest itself now, with two `workflow.execute`
// calls, and the schema carries only the two queries that measurement needs.
describe('watch_post_incident.yaml tuning backtest is measured, not asked for (A8 / R5)', () => {
  const schema = getStep('draft_tuning').with?.schema;

  it('no longer asks the model for a backtest it cannot measure', () => {
    expect(schema?.properties).not.toHaveProperty('preview');
  });

  it('takes the rule query as-is, so the card can show a diff rather than a replacement', () => {
    expect(schema?.properties).toHaveProperty('current_query');
  });

  it('takes the proposed query, which is the side the workflow backtests', () => {
    expect(schema?.properties).toHaveProperty('proposed_query');
  });

  it('bounds the current query to match the proposed one', () => {
    expect(schema?.properties?.current_query?.maxLength).toBe(2000);
  });

  it('bounds the proposed query the same way', () => {
    expect(schema?.properties?.proposed_query?.maxLength).toBe(2000);
  });

  // A tuning that changes `enabled` or `note` has no query to diff, and that is a perfectly valid
  // draft — requiring either field would fail the step for proposing the safest change on the menu.
  it('requires no current query, so a non-query tuning is still a valid draft', () => {
    expect(schema?.required).not.toContain('current_query');
  });

  it('requires no proposed query either', () => {
    expect(schema?.required).not.toContain('proposed_query');
  });

  it('no longer names the rule-preview tool the agent never held', () => {
    expect(getStep('draft_tuning').with?.message).not.toContain('security.run_rule_preview');
  });

  it('forbids the model reporting counts at all, because the workflow measures them', () => {
    expect(getStep('draft_tuning').with?.message).toContain(
      'do not estimate, invent, or describe alert counts anywhere'
    );
  });

  // A difference between the two would show the approver a measurement of something nobody proposed.
  it('requires the backtested query and the applied query to be the same bytes', () => {
    expect(getStep('draft_tuning').with?.message).toContain('byte-identical to `change.query`');
  });
});

// A3: `_rename` is unversioned (plain `router.post`, `access: 'internal'`), so it must NOT carry
// `elastic-api-version`.
describe('watch_post_incident.yaml deterministic tuning title (A3)', () => {
  const step = getStep('rename_tuning');

  it('is a kibana.request step', () => {
    expect(step.type).toBe('kibana.request');
  });

  it('POSTs the rename', () => {
    expect(step.with?.method).toBe('POST');
  });

  it('targets the unversioned internal _rename route in the workflow space', () => {
    expect(step.with?.path).toBe(
      '/s/{{ workflow.spaceId }}/internal/agent_builder/conversations/{{ steps.derive_ids.output.tuningConversationId }}/_rename'
    );
  });

  it('omits elastic-api-version, because _rename is not a versioned route', () => {
    expect(step.with?.headers).not.toHaveProperty('elastic-api-version');
  });

  it('titles the conversation from the attack discovery title alone', () => {
    expect(step.with?.body?.title).toBe(
      "{{ steps.derive_ids.output.attackDiscoveryTitle | default: 'Attack Discovery' }}"
    );
  });

  // kibana-phf4.16: the kind a conversation renders with is re-derived from the UUIDv5 namespace
  // that minted its id, so a tag in the title would be a second source of truth.
  it('stamps no kind tag into the title', () => {
    expect(step.with?.body?.title).not.toMatch(/\[[A-Za-z]+\]/);
  });

  it('continues on failure, because a title is cosmetic', () => {
    expect(step['on-failure']?.continue).toBe(true);
  });

  it('renames the conversation immediately after drafting the tuning', () => {
    const names = stepNames(parsed.steps);

    expect(names.indexOf('rename_tuning')).toBe(names.indexOf('draft_tuning') + 1);
  });

  // Without the bump the tagged title keeps arriving from the YAML already installed on the stack,
  // and reads as a UI bug rather than as a stale install (kibana-phf4.16).
  it('bumps the managed version past the tagged-title era', () => {
    expect(PND_WATCH_POST_INCIDENT_WORKFLOW.version).toBeGreaterThan(8);
  });
});

// kibana-phf4.11: the rule the model chose, as this space's rules API returns it. Three jobs — it
// VALIDATES an LLM-authored id, it supplies the authoritative current query for the diff, and it
// supplies `type`, the only trustworthy answer to "may a `query` change be proposed on this rule".
describe('watch_post_incident.yaml fetches the chosen rule (kibana-phf4.11)', () => {
  const step = getStep('fetch_tuning_rule');

  it('is a kibana.request step', () => {
    expect(step.type).toBe('kibana.request');
  });

  it('GETs the rule', () => {
    expect(step.with?.method).toBe('GET');
  });

  // `?id=` is the saved-object id, matching the id the apply route patches by. A model that returns
  // the rule's `rule_id` instead 404s here rather than being looked up a second way, deliberately: a
  // fallback would put a real backtest on a card whose approval could not be applied.
  it('looks the rule up by saved-object id in the workflow space', () => {
    expect(step.with?.path).toBe(
      '/s/{{ workflow.spaceId }}/api/detection_engine/rules?id={{ steps.draft_tuning.output.structured_output.ruleId }}'
    );
  });

  it("sends the rules API's own version rather than PND's", () => {
    expect(step.with?.headers?.['elastic-api-version']).toBe('2023-10-31');
  });

  it('skips entirely when the draft named no rule', () => {
    expect(step.if).toContain('steps.draft_tuning.output.structured_output.ruleId != blank');
  });

  // `nil != ''` is TRUE in Liquid while `nil != blank` is FALSE, so the `''` spelling would fail open
  // on exactly the degraded runs this guard exists for.
  it('guards with blank rather than the empty string, which fails open on nil', () => {
    expect(step.if).not.toContain("!= ''");
  });

  it('retries transient failures before degrading', () => {
    expect(step['on-failure']?.retry?.['max-attempts']).toBe(2);
  });

  it('continues on failure, so an unresolvable rule id can never abort the run', () => {
    expect(step['on-failure']?.continue).toBe(true);
  });

  it('runs after the draft whose choice it validates', () => {
    const names = stepNames(parsed.steps);

    expect(names.indexOf('fetch_tuning_rule')).toBeGreaterThan(names.indexOf('draft_tuning'));
  });
});

// ONE window, decided once, so both previews provably measure the same span. Two templates that look
// identical today are two templates that can drift, and a backtest whose sides ran over different
// windows is worse than none because it reads as a real comparison.
describe('watch_post_incident.yaml single backtest window (kibana-phf4.11)', () => {
  const step = getStep('set_backtest_window');

  // `DataSetStepImpl._run` returns the rendered `with` block AS the step output, which is what makes
  // `steps.set_backtest_window.output.timeframeEnd` readable at all.
  it('stays a data.set, because its output is its rendered with-block', () => {
    expect(step.type).toBe('data.set');
  });

  // NOT `now`: a rule's `from` lookback is relative to `timeframeEnd`, so anchoring at now would
  // backtest a window in which this incident's events had already aged past the lookback, and both
  // sides would come back 0 — two honest-looking zeroes that mean nothing.
  it('anchors the window at the moment the incident was contained', () => {
    expect(step.with?.timeframeEnd).toBe('{{ event.timestamp }}');
  });

  it('renders the timestamp the engine stamps onto the trigger event', () => {
    expect(render(step.with?.timeframeEnd, { event: CLAIM_EVENT })).toBe(
      '2026-02-03T04:05:06.000Z'
    );
  });

  // A manual run has no `event` — and no attack discovery to tune from either, so nothing is lost by
  // both previews skipping rather than sending an empty `timeframeEnd` into the preview API.
  it('renders empty on a manual run, so both previews skip', () => {
    expect(render(step.with?.timeframeEnd, {})).toBe('');
  });

  // Read off `inputs.timeframe_end` rather than out of a caller-composed `preview_body`: the preview
  // workflow composes the body now, and the window is the one part of it only the caller can know.
  it.each(['preview_current_query', 'preview_proposed_query'])(
    'is the single source of the window for %s',
    (stepName) => {
      expect(getStep(stepName).with?.inputs?.timeframe_end).toBe(
        '{{ steps.set_backtest_window.output.timeframeEnd }}'
      );
    }
  );

  it('runs before the previews that read it', () => {
    const names = stepNames(parsed.steps);

    expect(names.indexOf('set_backtest_window')).toBeLessThan(
      names.indexOf('preview_current_query')
    );
  });
});

// The backtest itself: two runs of UPSTREAM's `system-security-rule-preview` over the one window
// above, never a PND copy of it. Its output contract is `{ succeeded, alert_count, preview_id,
// is_aborted, error_text }`, which is exactly what this needs, and every step inside it carries
// `continue: true`.
//
// ⚠️ THE BODY IS NO LONGER COMPOSED HERE, and that is the point. Both sides pass the fetched RULE and
// let the preview workflow compose the body, because a caller-composed body is a body every caller
// has to get right: the 13-field block this replaces was a field-for-field copy of the one in
// `rule_tuning.yaml` (#283488), and neither carried `timestamp_override` — so both measured on
// `@timestamp` while the rule they were backtesting ran on its own override, and the approver read
// that count as the measured effect of the proposed query. `rule_preview.test.ts` pins what the
// worker now guarantees.
//
// One consequence belongs here rather than there: "identical in every field but the query" is now
// STRUCTURAL. One composition site builds both bodies from one rule, and the two call sites differ
// only by `query_override` — so the property no longer depends on this file policing thirteen fields
// twice.
describe('watch_post_incident.yaml before/after rule preview (kibana-phf4.11)', () => {
  /** The preview inputs with the one field that differs between the two sides removed. */
  const inputsWithoutQueryOverride = (stepName: string): Record<string, unknown> =>
    Object.fromEntries(
      Object.entries(getStep(stepName).with?.inputs ?? {}).filter(
        ([key]) => key !== 'query_override'
      )
    );

  describe.each(['preview_current_query', 'preview_proposed_query'])('%s', (stepName) => {
    const step = getStep(stepName);

    it('runs a workflow rather than reimplementing the preview', () => {
      expect(step.type).toBe('workflow.execute');
    });

    it("calls upstream's rule-preview workflow, never a PND copy of it", () => {
      expect(step.with?.['workflow-id']).toBe('system-security-rule-preview');
    });

    it('previews in the workflow space', () => {
      expect(step.with?.inputs?.space_id).toBe('{{ workflow.spaceId }}');
    });

    // The rule as the rules API returns it, so every field the preview needs — including the time
    // semantics the old hand-picked body dropped — travels without this file naming them one by one.
    it('passes the fetched rule rather than a body composed from the model', () => {
      expect(step.with?.inputs?.rule).toBe('${{ steps.fetch_tuning_rule.output }}');
    });

    // A leftover literal body would take a second, silent path through the worker.
    it('composes no body of its own', () => {
      expect(step.with?.inputs).not.toHaveProperty('preview_body');
    });

    // Two invocations, so the preview covers the window rather than a single rule execution.
    it('asks for two rule invocations', () => {
      expect(step.with?.inputs?.invocation_count).toBe(2);
    });

    it('measures over the one window both sides share', () => {
      expect(step.with?.inputs?.timeframe_end).toBe(
        '{{ steps.set_backtest_window.output.timeframeEnd }}'
      );
    });

    it('only runs when a query change was actually proposed', () => {
      expect(step.if).toContain(
        'steps.draft_tuning.output.structured_output.change.query != blank'
      );
    });

    it('only runs when there is a proposed query to measure', () => {
      expect(step.if).toContain(
        'steps.draft_tuning.output.structured_output.proposed_query != blank'
      );
    });

    // The rule's own `type`, from the rules API. The candidate list carries the model's view of it.
    it('only runs on a rule whose type is genuinely query', () => {
      expect(step.if).toContain("steps.fetch_tuning_rule.output.type == 'query'");
    });

    it('only runs when a window was resolved', () => {
      expect(step.if).toContain('steps.set_backtest_window.output.timeframeEnd != blank');
    });

    it('guards with blank rather than the empty string, which fails open on nil', () => {
      expect(step.if).not.toContain("!= ''");
    });

    // Divergence from upstream's own caller, and deliberate: R2 is this epic's reason to exist, and an
    // uninstalled or unreachable preview workflow is exactly the class of failure that used to leave
    // an analyst with no card at all.
    it('continues on failure, so an unreachable preview workflow can never abort the run', () => {
      expect(step['on-failure']?.continue).toBe(true);
    });

    // ⚠️ C12: `resolveReasoningForRun` attaches the reasoning of the single COMPLETED step with the
    // greatest `finishedAt <= gate.startedAt`. A step between `reason_apply_tuning` and the gate would
    // become that predecessor, and its output carries no `reasoning`, so the tuning card would
    // silently lose its whole body.
    it('runs before the reasoning block, so the gate still resolves its reasoning', () => {
      const names = stepNames(parsed.steps);

      expect(names.indexOf(stepName)).toBeLessThan(names.indexOf('reason_apply_tuning'));
    });
  });

  // No override on the before side: the worker falls back to the rule's own query, which is the one
  // authoritative copy of it.
  it('measures the rule query as-is on the before side', () => {
    expect(getStep('preview_current_query').with?.inputs).not.toHaveProperty('query_override');
  });

  it("measures the model's rewrite on the after side", () => {
    expect(getStep('preview_proposed_query').with?.inputs?.query_override).toBe(
      '{{ steps.draft_tuning.output.structured_output.proposed_query }}'
    );
  });

  // Identical by construction rather than by care: the one difference is the one thing being measured.
  it('differs in nothing but the query being measured', () => {
    expect(inputsWithoutQueryOverride('preview_current_query')).toEqual(
      inputsWithoutQueryOverride('preview_proposed_query')
    );
  });

  it('carries the same guard on both sides, so a measured card never has one side only', () => {
    expect(getStep('preview_current_query').if).toBe(getStep('preview_proposed_query').if);
  });

  it('bumps the managed version, so the backtest reaches an installed stack', () => {
    expect(PND_WATCH_POST_INCIDENT_WORKFLOW.version).toBeGreaterThan(10);
  });
});

// A7: this is the one gate that authorizes a write to a production detection rule, so the row must
// stand on its own. `build_proposal_rows` projects ONLY `reasoning.summary` (sections are dropped by
// `extractReasoningSummary`), so all four required facts have to be in the summary.
describe('watch_post_incident.yaml self-contained tuning prompt (A7)', () => {
  const summary = getStep('reason_apply_tuning').with?.reasoning?.summary ?? '';
  const sectionTitles = (getStep('reason_apply_tuning').with?.reasoning?.sections ?? []).map(
    ({ title }) => title
  );

  it('names the rule in the row headline', () => {
    expect(getStep('await_apply_tuning').with?.message).toContain(
      '{{ steps.draft_tuning.output.structured_output.ruleName }}'
    );
  });

  // R6: `| json` rather than bare interpolation. A `ruleName` containing a quote or a paren broke the
  // old `"<name>" (id <id>)` shape the reader had to pattern-match, and JSON escaping removes the
  // class. The label that precedes it is asserted separately, in the anchored-format block below.
  it('names the rule in the summary', () => {
    expect(summary).toContain('{{ steps.draft_tuning.output.structured_output.ruleName | json }}');
  });

  it('carries the rule id in the summary, so the approver can confirm it', () => {
    expect(summary).toContain('{{ steps.draft_tuning.output.structured_output.ruleId | json }}');
  });

  it('carries the exact proposed change in the summary', () => {
    expect(summary).toContain('{{ steps.draft_tuning.output.structured_output.change | json }}');
  });

  // The workflow's own measurement, not the model's claim about one.
  it('carries the as-is side of the measured backtest in the summary', () => {
    expect(summary).toContain('{{ steps.preview_current_query.output.alert_count | json }}');
  });

  it('carries the as-proposed side of the measured backtest in the summary', () => {
    expect(summary).toContain('{{ steps.preview_proposed_query.output.alert_count | json }}');
  });

  // The rule as it really is, from the rules API — not as the model transcribed it. Without this the
  // approver reads a proposed query with nothing to compare it against.
  it('carries the rule query the change would replace', () => {
    expect(summary).toContain('{{ steps.fetch_tuning_rule.output.query | json }}');
  });

  // A silent absence reads as "no change expected", which is the opposite of the truth; a bare `0`
  // reads as "no alerts" when it means "no measurement".
  it('says plainly that an unmeasured side is not a zero', () => {
    expect(summary).toMatch(/does not mean zero alerts/i);
  });

  it("quotes the detection engineer's own closing statement", () => {
    expect(summary).toContain('{{ steps.draft_tuning.output.structured_output.proposal }}');
  });

  it('states that approval writes to a production rule', () => {
    expect(summary).toMatch(/approv/i);
  });

  it('states what happens on a decline', () => {
    expect(summary).toMatch(/declin/i);
  });

  it('carries the deciding evidence as sections too', () => {
    expect(sectionTitles).toEqual(['Rule', 'Proposed change', 'Backtest', 'Rationale']);
  });

  it('sits immediately before its gate, so the reasoning resolver attaches it', () => {
    const names = stepNames(parsed.steps);

    expect(names.indexOf('reason_apply_tuning')).toBe(names.indexOf('await_apply_tuning') - 1);
  });
});

// R6. `reasoning.summary` is the ONLY carrier of ruleId / ruleName / change that reaches the UI —
// `PndProposalRow` has no field for any of them and nothing in `pnd/server` reads
// `structured_output` — so the UI has to read them back out of this string. These pin the labels and
// the `| json` encoding that make that read deterministic instead of a pattern match over prose.
//
// ⚠️ The reader is `pnd/public/pages/conversations/helpers/parse_tuning_proposal`, whose `TUNING_*_LABEL`
// constants must equal the literals below byte for byte. It lives in `@kbn/pnd-common`'s solution
// group, which this platform package may not import (`@kbn/imports/no_group_crossing_imports`), so
// the coupling is pinned on both sides with literals rather than shared through a constant.
describe('watch_post_incident.yaml anchored tuning evidence (R6)', () => {
  const summary = getStep('reason_apply_tuning').with?.reasoning?.summary;

  /** A draft whose rule name breaks every assumption the pre-R6 `"<name>" (id <id>)` shape made. */
  const CONTEXT_WITH_HOSTILE_RULE_NAME = {
    event: CLAIM_EVENT,
    steps: {
      ...DERIVED_IDS_STEP,
      draft_tuning: {
        output: {
          structured_output: {
            change: { enabled: true },
            proposal: 'I propose enabling the rule.',
            rationale: 'It would have caught the observed behaviour.',
            ruleId: 'rule-1',
            ruleName: 'Suspicious "powershell" activity (encoded)',
          },
        },
      },
    },
  };

  it('labels the rule name', () => {
    expect(summary).toContain('Rule name:');
  });

  it('labels the rule id', () => {
    expect(summary).toContain('Rule id:');
  });

  // Changed again by this bead, deliberately: `query` joined the field list, so the label no longer
  // matches the one a v7 watch wrote. An absent anchor is how the reader detects a legacy row, so the
  // new spelling must not be "tidied" back toward the old one.
  it('labels the proposed change distinctly from every earlier wording, so a legacy row is detectable', () => {
    expect(summary).toContain(
      'Proposed change (enabled / investigation_fields / note / query only):'
    );
  });

  it('labels the as-is backtest count', () => {
    expect(summary).toContain('Backtest alerts as-is:');
  });

  it('labels the as-proposed backtest count', () => {
    expect(summary).toContain('Backtest alerts as-proposed:');
  });

  it('labels the rule query the change would replace', () => {
    expect(summary).toContain('Rule query as-is:');
  });

  it('renders the rule name as a JSON string, so the reader can parse rather than match it', () => {
    expect(render(summary, CONTEXT_WITH_DRAFT)).toContain('Rule name: "Suspicious PowerShell".');
  });

  it('renders the rule id as a JSON string', () => {
    expect(render(summary, CONTEXT_WITH_DRAFT)).toContain('Rule id: "rule-1".');
  });

  it('renders the change as JSON behind its label', () => {
    expect(render(summary, CONTEXT_WITH_DRAFT)).toContain(
      'Proposed change (enabled / investigation_fields / note / query only): {"enabled":true}.'
    );
  });

  it('renders the rule query as a JSON string, so a query containing quotes survives the round trip', () => {
    expect(render(summary, CONTEXT_WITH_MEASURED_BACKTEST)).toContain(
      'Rule query as-is: "process.name : \\"powershell.exe\\"".'
    );
  });

  // The rules API is the authority on the current query; `current_query` is the model's transcription
  // of it and only stands in when the fetch did not return. A model that transcribed it wrongly — or
  // proposed a diff against a query the rule no longer has — must not decide what the approver reads.
  it('prefers the fetched rule query over the model transcription', () => {
    expect(
      render(summary, {
        event: CLAIM_EVENT,
        steps: {
          ...CONTEXT_WITH_MEASURED_BACKTEST.steps,
          fetch_tuning_rule: { output: { query: 'the query the rule really has', type: 'query' } },
        },
      })
    ).toContain('Rule query as-is: "the query the rule really has".');
  });

  it('falls back to the model transcription when the rule fetch did not return', () => {
    expect(
      render(summary, {
        event: CLAIM_EVENT,
        steps: {
          ...CONTEXT_WITH_MEASURED_BACKTEST.steps,
          fetch_tuning_rule: { output: null },
        },
      })
    ).toContain('Rule query as-is: "process.name : \\"powershell.exe\\"".');
  });

  // The pre-R6 shape captured " activity" as the rule name here, because the regex matched the
  // model's inner quotes; JSON escaping is what removes the whole class of mis-parse.
  it('escapes a rule name containing quotes and parens rather than letting it break the shape', () => {
    expect(render(summary, CONTEXT_WITH_HOSTILE_RULE_NAME)).toContain(
      'Rule name: "Suspicious \\"powershell\\" activity (encoded)".'
    );
  });

  it('still carries the rule id when the rule name is hostile', () => {
    expect(render(summary, CONTEXT_WITH_HOSTILE_RULE_NAME)).toContain('Rule id: "rule-1".');
  });
});

// R5, restated by this bead. `preview` used to have no producer at all — `security.run_rule_preview`
// is unavailable to a `NO_TOOLS` agent, and `build_proposal_rows` still never populates
// `PndProposalRow.preview` — so the workflow measures the backtest itself and carries it in the one
// field that does reach the UI, this summary.
//
// The value that matters is the distinction between a measured zero and no measurement. Both used to
// render as an absence; a bare `0` reads as "this change silences the rule" when it may mean "the
// preview never ran". So a measured side renders as a bare JSON number and an unmeasured one as the
// JSON string `"inconclusive"`, and the reader tells them apart by type rather than by prose.
describe('watch_post_incident.yaml measured-or-inconclusive backtest (R5)', () => {
  const summary = getStep('reason_apply_tuning').with?.reasoning?.summary;
  const backtestSection = (getStep('reason_apply_tuning').with?.reasoning?.sections ?? []).find(
    ({ title }) => title === 'Backtest'
  )?.body;

  /** Both previews ran and neither succeeded: one reported an error, the other wrote the sentinel. */
  const CONTEXT_WITH_FAILED_PREVIEWS = {
    event: CLAIM_EVENT,
    steps: {
      ...CONTEXT_WITH_MEASURED_BACKTEST.steps,
      preview_current_query: {
        output: { error_text: 'index pattern not found', is_aborted: false, succeeded: false },
      },
      preview_proposed_query: { output: null },
    },
  };

  /** A preview that ran, reported success, and gave up part-way: its count is not a measurement. */
  const CONTEXT_WITH_ABORTED_PREVIEW = {
    event: CLAIM_EVENT,
    steps: {
      ...CONTEXT_WITH_MEASURED_BACKTEST.steps,
      preview_current_query: { output: { alert_count: 3, is_aborted: true, succeeded: true } },
    },
  };

  /** The JSON value behind a count label, read back exactly the way the UI reader has to read it. */
  const readCount = (rendered: string, label: string): unknown => {
    const start = rendered.indexOf(label) + label.length;

    return JSON.parse(rendered.slice(start, rendered.indexOf('.', start)));
  };

  it('renders a measured count as a bare number', () => {
    expect(
      readCount(render(summary, CONTEXT_WITH_MEASURED_BACKTEST), 'Backtest alerts as-is:')
    ).toBe(9);
  });

  // The whole reason the two cases are encoded differently.
  it('renders a measured zero as a number rather than as an absence', () => {
    expect(
      readCount(render(summary, CONTEXT_WITH_MEASURED_BACKTEST), 'Backtest alerts as-proposed:')
    ).toBe(0);
  });

  it('renders a failed preview as the inconclusive string', () => {
    expect(readCount(render(summary, CONTEXT_WITH_FAILED_PREVIEWS), 'Backtest alerts as-is:')).toBe(
      'inconclusive'
    );
  });

  // `continue: true` on a `workflow.execute` that never ran leaves the `null` FAILED sentinel, not
  // `undefined`, and `== blank` covers both.
  it('renders the null sentinel as inconclusive too', () => {
    expect(
      readCount(render(summary, CONTEXT_WITH_FAILED_PREVIEWS), 'Backtest alerts as-proposed:')
    ).toBe('inconclusive');
  });

  // `succeeded: true` with `is_aborted: true` is the trap: the step worked, the measurement did not.
  it('renders an aborted preview as inconclusive rather than as its partial count', () => {
    expect(readCount(render(summary, CONTEXT_WITH_ABORTED_PREVIEW), 'Backtest alerts as-is:')).toBe(
      'inconclusive'
    );
  });

  it('renders both sides inconclusive for a tuning that changes no query', () => {
    expect(readCount(render(summary, CONTEXT_WITH_DRAFT), 'Backtest alerts as-is:')).toBe(
      'inconclusive'
    );
  });

  it('explains why a non-query tuning has nothing to backtest', () => {
    expect(render(summary, CONTEXT_WITH_DRAFT)).toMatch(
      /only a query change alters which documents the rule matches/i
    );
  });

  it('renders both sides inconclusive when there was no draft at all', () => {
    expect(readCount(render(summary, CONTEXT_WITHOUT_DRAFT), 'Backtest alerts as-proposed:')).toBe(
      'inconclusive'
    );
  });

  it('names the shared window in the backtest section, so the pair is readable as a comparison', () => {
    expect(render(backtestSection, CONTEXT_WITH_MEASURED_BACKTEST)).toContain(
      'Both sides ran over one window ending 2026-02-03T04:05:06.000Z'
    );
  });

  it('says so when no window could be resolved', () => {
    expect(render(backtestSection, CONTEXT_WITHOUT_DRAFT)).toContain(
      'No backtest window was resolved'
    );
  });

  // The one place a preview's own `error_text` is allowed to appear: it is operator text of unknown
  // shape, so it stays out of every `| json` anchor in the summary.
  it('reports the failing preview error text in the section rather than in an anchor', () => {
    expect(render(backtestSection, CONTEXT_WITH_FAILED_PREVIEWS)).toContain(
      'As-is preview reported: index pattern not found'
    );
  });

  it('keeps the error text out of the anchored summary', () => {
    expect(render(summary, CONTEXT_WITH_FAILED_PREVIEWS)).not.toContain('index pattern not found');
  });

  // `!= blank`, never `!= ''`: a skipped preview leaves `error_text` nil and `nil != ''` is TRUE in
  // Liquid, which would print an errors line with nothing after it on exactly the runs that had no
  // preview to fail.
  it('prints no error line when there was no preview to fail', () => {
    expect(render(backtestSection, CONTEXT_WITHOUT_DRAFT)).not.toContain('preview reported');
  });
});

// R2, second half. `on-failure.continue` on `draft_tuning` only guarantees the gate is REACHED; on
// its own it parks a card whose every field renders empty, which reads as "a change with nothing in
// it" rather than "no draft". These render the two analyst-visible templates through the engine's
// own Liquid configuration, with and without the draft, so the degraded card is asserted as rendered
// text rather than as the presence of a template string.
describe('watch_post_incident.yaml degraded tuning card (R2)', () => {
  const summary = getStep('reason_apply_tuning').with?.reasoning?.summary;
  const gateMessage = getStep('await_apply_tuning').with?.message;

  it('tells the approver plainly that no tuning was drafted', () => {
    expect(render(summary, CONTEXT_WITHOUT_DRAFT)).toMatch(/no tuning was drafted/i);
  });

  it('says there is nothing to apply, so the empty fields are not read as an empty change', () => {
    expect(render(summary, CONTEXT_WITHOUT_DRAFT)).toMatch(/nothing to apply/i);
  });

  // `== blank` rather than `unless`: in Liquid an empty string is TRUTHY, so only `blank` covers
  // nil, false and '' alike — and the FAILED sentinel writes `null`, not `undefined`.
  it('tells the approver the same thing when the failed step wrote the null sentinel', () => {
    expect(render(summary, CONTEXT_WITH_NULL_DRAFT_OUTPUT)).toMatch(/no tuning was drafted/i);
  });

  it('drops the drafting-failure notice once the tuning is drafted', () => {
    expect(render(summary, CONTEXT_WITH_DRAFT)).not.toMatch(/no tuning was drafted/i);
  });

  it('still carries the rule id into the summary on the normal path', () => {
    expect(render(summary, CONTEXT_WITH_DRAFT)).toContain('rule-1');
  });

  it('still carries the measured backtest into the summary on the normal path', () => {
    expect(render(summary, CONTEXT_WITH_MEASURED_BACKTEST)).toContain(
      'Backtest alerts as-proposed: 0.'
    );
  });

  it('replaces the gate question when there is no draft to approve', () => {
    expect(render(gateMessage, CONTEXT_WITHOUT_DRAFT)).toMatch(/no tuning was drafted/i);
  });

  it('never asks the approver to apply a nameless rule', () => {
    expect(render(gateMessage, CONTEXT_WITHOUT_DRAFT)).not.toMatch(/apply a tuning to detection/i);
  });

  // `extractGatePrompt` falls back to `Step "<id>" is waiting for input` on an empty message, which
  // would hide the failure behind boilerplate.
  it('renders a non-empty prompt, so the row never falls back to the bare step id', () => {
    expect(render(gateMessage, CONTEXT_WITHOUT_DRAFT).trim()).not.toBe('');
  });

  it('asks the normal question when the tuning was drafted', () => {
    expect(render(gateMessage, CONTEXT_WITH_DRAFT)).toContain(
      'Apply a tuning to detection rule "Suspicious PowerShell" (rule-1)?'
    );
  });
});

// B6-yaml: the step sent only `{ rationale }` while `_apply` expects `body.id | rule_id`, so it
// 400'd by design. The consequential write belongs to the approving user's request context, from the
// UI, with an editable rule id — `draft_tuning`'s LLM-authored `ruleId` may not name a real rule.
describe('watch_post_incident.yaml removes the broken apply step (B6-yaml)', () => {
  it('declares no apply_tuning step', () => {
    expect(allSteps.map(({ name }) => name)).not.toContain('apply_tuning');
  });

  it('POSTs nothing to the tuning _apply route', () => {
    expect(
      PND_WATCH_POST_INCIDENT_WORKFLOW.yamlTemplate(PND_WORKFLOW_TEMPLATE_VALUES)
    ).not.toContain('/_apply');
  });

  it('still emits a terminal marker for the execution projection', () => {
    expect(getStep('tuning_applied').type).toBe('workflow.output');
  });
});

// A6: the tuning gate is terminal for its conversation, so the outcome has to be appended
// explicitly. No plain conversation-append endpoint exists in Agent Builder, so this is the
// documented fallback: a minimal ai.agent turn on the same conversation.
describe('watch_post_incident.yaml conversation audit trail (A6)', () => {
  describe.each(['record_dismissed_tuning', 'record_tuning_outcome'])('%s', (stepName) => {
    const step = getStep(stepName);

    it('is an ai.agent turn, because no non-LLM append endpoint exists', () => {
      expect(step.type).toBe('ai.agent');
    });

    it('appends to the tuning conversation', () => {
      expect(step.with?.conversation_id).toBe('{{ steps.derive_ids.output.tuningConversationId }}');
    });

    it('appends rather than creating, because draft_tuning already created it', () => {
      expect(step['create-conversation'] ?? false).toBe(false);
    });

    it('continues on failure so an audit append can never fail the run', () => {
      expect(step['on-failure']?.continue).toBe(true);
    });

    it('tells the agent to record the outcome rather than analyze it', () => {
      expect(step.with?.message).toContain('AUDIT RECORD');
    });

    it('forbids tool use on an audit-only turn', () => {
      expect(step.with?.message).toContain('do not use any tools');
    });

    it('names the responder', () => {
      expect(step.with?.message).toContain('{{ steps.await_apply_tuning.output.respondedBy }}');
    });

    it('carries the rationale', () => {
      expect(step.with?.message).toContain(
        '{{ steps.await_apply_tuning.output.response.rationale }}'
      );
    });
  });

  // `workflow.output` TERMINATES the run, so the record has to be declared before it.
  it('records the dismissal before ending the run', () => {
    expect(stepNames(getStep('stop_if_dismissed_tuning').steps)).toEqual([
      'record_dismissed_tuning',
      'dismissed_tuning',
    ]);
  });

  it('records the approval outcome before the terminal marker', () => {
    const names = stepNames(parsed.steps);

    expect(names.indexOf('record_tuning_outcome')).toBe(names.indexOf('tuning_applied') - 1);
  });
});

// D5 / ADR-012: the `[Thread]` conversation paired 1:1 with a HITL proposal is materialised EAGERLY
// by the watch, so a pending proposal always has a thread whether or not anyone opens it. The
// Detection Watch has exactly one gate, so it takes exactly one step — but the step still names its
// gate explicitly, because the thread id is `uuidv5(`${adId}:${gateId}`)` (D1) rather than a
// per-workflow constant.
describe('watch_post_incident.yaml eager thread materialisation (D5)', () => {
  const step = getStep('ensure_thread_apply_tuning');

  it('materialises a thread for every HITL gate', () => {
    expect(allSteps.filter(({ name }) => name.startsWith('ensure_thread_'))).toHaveLength(
      allSteps.filter(({ type }) => type === 'waitForInput').length
    );
  });

  it('is a kibana.request step', () => {
    expect(step.type).toBe('kibana.request');
  });

  it('POSTs the ensure', () => {
    expect(step.with?.method).toBe('POST');
  });

  // kibana.request sends `path` verbatim (buildKibanaRequest short-circuits on `kibana.request`
  // before applySpacePrefix), so the space has to be prefixed by hand.
  it('targets the internal _ensure route in the workflow space', () => {
    expect(step.with?.path).toBe('/s/{{ workflow.spaceId }}/internal/pnd/threads/_ensure');
  });

  it('sends elastic-api-version, because PND internal routes are versioned', () => {
    expect(step.with?.headers?.['elastic-api-version']).toBe('1');
  });

  // D5: `_ensure` takes `{ correlationId, gateId }` and nothing else, forever. The seed
  // message is built server-side; a `prompt` or `message` field would be a prompt-injection and
  // token-burn vector straight into an LLM turn.
  it('sends exactly the two-field contract', () => {
    expect(Object.keys(step.with?.body ?? {}).sort()).toEqual(['correlationId', 'gateId']);
  });

  it('keys the thread on the attack discovery recovered from the claim', () => {
    expect(step.with?.body?.correlationId).toBe(
      '{{ steps.set_correlation_id.output.correlationId }}'
    );
  });

  it('names the tuning gate, so the derived id is the one paired with this proposal', () => {
    expect(step.with?.body?.gateId).toBe('apply_tuning');
  });

  // Non-negotiable, and the same class of defect as R2 — the reason this epic exists: a thread
  // failure must never abort a watch.
  it('continues on failure, so a thread failure can never abort the watch', () => {
    expect(step['on-failure']?.continue).toBe(true);
  });

  // Safe to retry because `_ensure` is idempotent (D6: pre-read, in-flight map, post-failure
  // re-read), and a converse timeout is the expected transient failure rather than an exotic one.
  it('retries transient failures before degrading', () => {
    expect(step['on-failure']?.retry?.['max-attempts']).toBe(2);
  });

  // ⚠️ THE PLACEMENT THAT MATTERS. `resolveReasoningForRun` attaches the reasoning of the single
  // COMPLETED step with the greatest `finishedAt <= gate.startedAt`. A `kibana.request` step between
  // `reason_apply_tuning` and the gate would become that predecessor, and its output has no
  // `reasoning` — so the tuning card would silently lose its body, which is the whole of item 5.
  it('runs before the reasoning block, so the gate still resolves its reasoning', () => {
    const names = stepNames(parsed.steps);

    expect(names.indexOf('ensure_thread_apply_tuning')).toBe(
      names.indexOf('reason_apply_tuning') - 1
    );
  });

  // Before the `waitForInput`, so the thread exists the moment the proposal parks rather than only
  // once the analyst has answered — which is what "eager" means.
  it('runs before the gate parks', () => {
    const names = stepNames(parsed.steps);

    expect(names.indexOf('ensure_thread_apply_tuning')).toBeLessThan(
      names.indexOf('await_apply_tuning')
    );
  });

  // `await_apply_tuning` is `alwaysGate` and carries no `if` wrapper; its thread step must not
  // introduce one, or a raised autonomy level would gain a branch to skip.
  it('never sits inside an if step, matching the alwaysGate it precedes', () => {
    expect(findEnclosingIf('ensure_thread_apply_tuning')).toBeUndefined();
  });

  // `versionStrategy: 'auto'` only re-applies the YAML when the version increases, so an un-bumped
  // edit never reaches an installed stack. Greater-than rather than equal, so later beads can bump.
  it('bumps the managed version, so the step actually reaches an installed stack', () => {
    expect(PND_WATCH_POST_INCIDENT_WORKFLOW.version).toBeGreaterThan(4);
  });
});
