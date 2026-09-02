/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';

import { PND_WATCH_FLOOR_WORKFLOW, PND_WORKFLOW_TEMPLATE_VALUES } from '.';

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
  additionalProperties?: boolean;
}

interface ParsedStepWith {
  attachments?: ParsedAttachment[];
  autoAccepted?: { autonomyLevel?: string; gateId?: string; reason?: string };
  body?: Record<string, unknown>;
  conversation_id?: string;
  headers?: Record<string, string>;
  inputs?: Record<string, string>;
  message?: string;
  metadata?: Record<string, string>;
  method?: string;
  outcome?: string;
  path?: string;
  phase?: string;
  rationale?: string;
  reasoning?: { summary?: string; sections?: ParsedReasoningSection[] };
  schema?: ParsedJsonSchema;
  'workflow-id'?: string;
}

interface ParsedStep {
  name: string;
  type: string;
  'agent-id'?: string;
  condition?: string;
  'create-conversation'?: boolean;
  else?: ParsedStep[];
  'on-failure'?: ParsedOnFailure;
  'public-conversation'?: boolean;
  status?: string;
  steps?: ParsedStep[];
  timeout?: string;
  with?: ParsedStepWith;
}

interface ParsedWorkflow {
  consts?: Record<string, unknown>;
  name?: string;
  settings?: { timeout?: string };
  steps?: ParsedStep[];
}

// `yamlTemplate` rather than `yaml`: decision 7 moved every PND definition onto a template that
// ignores the values it is handed. See the comment at the top of `./index.ts`.
const parsed = parse(
  PND_WATCH_FLOOR_WORKFLOW.yamlTemplate(PND_WORKFLOW_TEMPLATE_VALUES)
) as ParsedWorkflow;

/** Every step in the tree, flattened through `steps` and `else` branches. */
const flatten = (steps: ParsedStep[] | undefined): ParsedStep[] =>
  (steps ?? []).flatMap((step) => [step, ...flatten(step.steps), ...flatten(step.else)]);

const allSteps = flatten(parsed.steps);

const getStep = (name: string): ParsedStep => {
  const step = allSteps.find((s) => s.name === name);
  if (!step) {
    throw new Error(`No '${name}' step found in the Watch Floor workflow`);
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

describe('watch_floor.yaml graceful degradation', () => {
  // A transient failure (403/500/timeout) of the derive read must NOT abort the whole
  // run. Without `on-failure.continue`, the engine fails the execution before the first
  // HITL gate is ever reached, so the investigation vanishes as a failed run instead of
  // surfacing in the queue for manual review (kibana-idjb.20, proved by I1 on slot 4).
  describe('derive_ids (kibana.request read step)', () => {
    const step = getStep('derive_ids');

    it('is a kibana.request step', () => {
      expect(step.type).toBe('kibana.request');
    });

    it('retries transient failures before degrading', () => {
      expect(step['on-failure']?.retry?.['max-attempts']).toBe(3);
    });

    it('continues on exhausted failure so the run degrades to an open gate rather than aborting', () => {
      expect(step['on-failure']?.continue).toBe(true);
    });
  });
});

// kibana-tjil.1: every HITL gate always parks. Autonomy is enforced server-side at
// approval time, so this YAML must never read the dial or skip a waitForInput.
describe('watch_floor.yaml always-park gates (kibana-tjil.1)', () => {
  it('declares no read_autonomy step', () => {
    expect(allSteps.map(({ name }) => name)).not.toContain('read_autonomy');
  });

  it('declares no autonomy-branch if wrapper', () => {
    expect(allSteps.map(({ name }) => name)).not.toContain('gate_open_investigation');
    expect(allSteps.map(({ name }) => name)).not.toContain('gate_promote_incident');
  });

  describe.each(['await_open_investigation', 'await_incident_contained'])(
    '%s has no if ancestor',
    (stepName) => {
      it('is a waitForInput', () => {
        expect(getStep(stepName).type).toBe('waitForInput');
      });

      it('is declared at the workflow top level', () => {
        expect(stepNames(parsed.steps)).toContain(stepName);
      });

      it('is not wrapped in an if step', () => {
        expect(findEnclosingIf(stepName)).toBeUndefined();
      });
    }
  );

  // The promote gate still sits inside `assess_investigation` (the isIncident verdict), which
  // is a real branch — not an autonomy skip. The autonomy wrapper around it is what is gone.
  describe('await_promote_incident', () => {
    it('is a waitForInput', () => {
      expect(getStep('await_promote_incident').type).toBe('waitForInput');
    });

    it('is nested only under the investigation verdict, not an autonomy if', () => {
      expect(findEnclosingIf('await_promote_incident')?.name).toBe('assess_investigation');
    });
  });
});

// ⛔ ADR-005 / S8 / D15: `await_incident_contained` is `alwaysGate`. It has no `if` wrapper by design,
// so no autonomy level can auto-accept it, and it must never gain one. Three independent barriers
// enforce this; this is the structural one. The other two are the `alwaysGate` flag itself
// (`gate_registry/index.test.ts`) and `_auto_respond`'s unconditional refusal
// (`partition_auto_respondable_gates/index.test.ts`, `pnd_security_regression.test.ts`).
//
// ⚠️ Since bead kibana-phf4.33 these three are the *only* record of the invariant: the Watch settings
// page's Approval gates table, which showed a customer that containment always gates, was deleted per
// the 2026-08-10 design. Nothing tells a reader outside the code any more, so do not thin them out.
describe('watch_floor.yaml alwaysGate structural invariant', () => {
  it('declares await_incident_contained at the top level', () => {
    expect(stepNames(parsed.steps)).toContain('await_incident_contained');
  });

  it('never wraps await_incident_contained in an if step', () => {
    expect(findEnclosingIf('await_incident_contained')).toBeUndefined();
  });

  it('never wraps its reasoning block in an if step either', () => {
    expect(findEnclosingIf('reason_incident_contained')).toBeUndefined();
  });
});

// Workstream E: `structured_output.isIncident` was declared and never read — the verdict was
// hardcoded in `consts.stub`. The demo override is OR'd in front of it, and comes from config via
// `_derive` rather than a workflow const so flipping it needs no version bump or re-install.
describe('watch_floor.yaml real investigation verdict (E)', () => {
  it('no longer carries the hardcoded assessment stub', () => {
    expect(parsed.consts).not.toHaveProperty('stub');
  });

  it('reads the real isIncident verdict, OR-ed with the demo switch', () => {
    expect(getStep('assess_investigation').condition).toBe(
      'steps.derive_ids.output.demoForceIncident : true or steps.investigate.output.isIncident : true'
    );
  });

  // E3, a latent-bug fix rather than demo behavior: without a terminal else-branch a "not an
  // incident" verdict falls through to the top-level containment gate, which reads
  // `steps.open_incident.output.structured_output.summary`, renders empty, and opens a containment
  // gate for a non-incident. `workflow.output` terminates the run instead.
  describe('terminal not_an_incident branch (E3)', () => {
    const assess = getStep('assess_investigation');
    const notAnIncident = getStep('not_an_incident');

    it('is the emit then the terminal marker, in that order', () => {
      expect(stepNames(assess.else)).toEqual(['emit_coverage_gap', 'not_an_incident']);
    });

    it('terminates the run rather than falling through to the containment gate', () => {
      expect(notAnIncident.type).toBe('workflow.output');
    });

    it('ends the run as completed, not failed — "not an incident" is a valid outcome', () => {
      expect(notAnIncident.status).toBe('completed');
    });

    it('names the outcome so the runs table can distinguish it from a dismissal', () => {
      expect(notAnIncident.with?.outcome).toBe('not_an_incident');
    });

    it('attributes the outcome to the investigation phase', () => {
      expect(notAnIncident.with?.phase).toBe('investigation');
    });

    it("carries the investigation's own rationale", () => {
      expect(notAnIncident.with?.rationale).toBe('{{ steps.investigate.output.rationale }}');
    });
  });

  describe('emit_coverage_gap (kibana-tjil.20)', () => {
    const step = getStep('emit_coverage_gap');

    it('is a kibana.request step', () => {
      expect(step.type).toBe('kibana.request');
    });

    it('POSTs the claim', () => {
      expect(step.with?.method).toBe('POST');
    });

    it('targets the internal emit route in the workflow space', () => {
      expect(step.with?.path).toBe(
        '/s/{{ workflow.spaceId }}/internal/pnd/signals/_detection_change'
      );
    });

    it('sends elastic-api-version, because PND internal routes are versioned', () => {
      expect(step.with?.headers?.['elastic-api-version']).toBe('1');
    });

    it('sends kbn-xsrf', () => {
      expect(step.with?.headers?.['kbn-xsrf']).toBe('true');
    });

    it('maps the producer alert id onto correlationId at the boundary', () => {
      expect(step.with?.body?.correlationId).toBe('{{ event.attackDiscoveryAlertId }}');
    });

    it("carries the investigation worker's rationale as the gap description", () => {
      expect(step.with?.body?.gapDescription).toBe('{{ steps.investigate.output.rationale }}');
    });

    it('names this Floor run as the source', () => {
      expect(step.with?.body?.sourceRunId).toBe('{{ execution.id }}');
    });

    it('continues on failure, because a signalling problem must not fail a valid verdict', () => {
      expect(step['on-failure']?.continue).toBe(true);
    });

    it('retries a transient emit failure first', () => {
      expect(step['on-failure']?.retry?.['max-attempts']).toBe(2);
    });

    it('sits on the else branch, so a positive incident verdict never emits here', () => {
      expect(findEnclosingIf('emit_coverage_gap')?.name).toBe('assess_investigation');
    });
  });
});

// A3: `_rename` is registered with plain `router.post` (`access: 'internal'`, UNVERSIONED), unlike
// PND's own `router.versioned` routes — so it must NOT carry `elastic-api-version`. The engine
// already injects `x-elastic-internal-origin`, which is what the route needs.
describe('watch_floor.yaml deterministic conversation titles (A3)', () => {
  describe('rename_incident', () => {
    const step = getStep('rename_incident');

    it('is a kibana.request step', () => {
      expect(step.type).toBe('kibana.request');
    });

    it('POSTs the rename', () => {
      expect(step.with?.method).toBe('POST');
    });

    it('targets the unversioned internal _rename route in the workflow space', () => {
      expect(step.with?.path).toBe(
        '/s/{{ workflow.spaceId }}/internal/agent_builder/conversations/{{ steps.derive_ids.output.incidentConversationId }}/_rename'
      );
    });

    it('omits elastic-api-version, because _rename is not a versioned route', () => {
      expect(step.with?.headers).not.toHaveProperty('elastic-api-version');
    });

    it('sends kbn-xsrf', () => {
      expect(step.with?.headers?.['kbn-xsrf']).toBe('true');
    });

    it('prefixes the Agent Builder title with [Incident]', () => {
      expect(step.with?.body?.title).toBe(
        "[Incident] {{ steps.derive_ids.output.attackDiscoveryTitle | default: 'Attack Discovery' }}"
      );
    });

    // Cosmetic only: owner access on `_rename` is a structural read of the code, not an observed
    // runtime fact, so a wrong reading must never fail the run.
    it('continues on failure, because a title is cosmetic', () => {
      expect(step['on-failure']?.continue).toBe(true);
    });

    it('retries a transient rename failure first', () => {
      expect(step['on-failure']?.retry?.['max-attempts']).toBe(2);
    });
  });

  // kibana-tjil.9 / B3. Title is set on create_investigation_container; a later
  // `_rename` would re-introduce the owner-access assumption the create route retired.
  it('does not rename the investigation after minting', () => {
    expect(allSteps.filter(({ name }) => name === 'rename_investigation')).toEqual([]);
  });

  it('renames the incident immediately after opening it', () => {
    const names = stepNames(getStep('assess_investigation').steps);

    expect(names.indexOf('rename_incident')).toBe(names.indexOf('open_incident') + 1);
  });

  // Without the bump the tagged titles keep arriving from the YAML already installed on the stack,
  // and read as a UI bug rather than as a stale install (kibana-phf4.16).
  it('bumps the managed version past the tagged-title era', () => {
    expect(PND_WATCH_FLOOR_WORKFLOW.version).toBeGreaterThan(10);
  });
});

describe('watch_floor.yaml agent conversations (A2 / A4)', () => {
  describe.each([['open_incident', 'incidentAgentId', 'incident']])(
    '%s',
    (stepName, agentIdField, conversationKind) => {
      const step = getStep(stepName);

      // ADR-011: the agent id comes over the wire from `_derive`, never hardcoded, so agent existence
      // and agent-id availability succeed or degrade TOGETHER. A degraded `derive_ids` renders it
      // empty and the step falls back to the default agent instead of hard-failing on an agent that
      // was never ensured.
      it('takes its agent id from _derive rather than hardcoding one', () => {
        expect(step['agent-id']).toBe(`{{ steps.derive_ids.output.${agentIdField} }}`);
      });

      it('stamps the phase on the agent execution so all three phases correlate', () => {
        expect(step.with?.metadata?.pnd_conversation_kind).toBe(conversationKind);
      });

      it('stamps the attack discovery id on the agent execution', () => {
        expect(step.with?.metadata?.pnd_attack_discovery_alert_id).toBe(
          '{{ event.attackDiscoveryAlertId }}'
        );
      });

      it('attaches the attack discovery as a security.alert', () => {
        expect(step.with?.attachments?.[0]?.type).toBe('security.alert');
      });

      // A stable id makes re-triggering idempotent — Agent Builder merges by id rather than
      // creating a duplicate chip.
      it('gives the attachment a stable per-discovery id', () => {
        expect(step.with?.attachments?.[0]?.id).toBe('pnd-ad-{{ event.attackDiscoveryAlertId }}');
      });

      it('carries the rendered markdown as the attachment value', () => {
        expect(step.with?.attachments?.[0]?.data?.alert).toBe(
          '{{ steps.derive_ids.output.attackDiscoveryMarkdown }}'
        );
      });

      // `attachmentLabel` inside `data` is the only way to label the chip — the ai.agent attachment
      // schema has no `description`.
      it('labels the chip with the attack discovery title', () => {
        expect(step.with?.attachments?.[0]?.data?.attachmentLabel).toBe(
          'Attack discovery: {{ steps.derive_ids.output.attackDiscoveryTitle }}'
        );
      });

      // Attachment content is NOT inlined into the prompt (the agent sees XML metadata and must call
      // `attachment_read`), so attaching alone would starve the first LLM turn.
      it('keeps the markdown in the message too, so the first turn is not starved', () => {
        expect(step.with?.message).toContain(
          '{{ steps.derive_ids.output.attackDiscoveryMarkdown }}'
        );
      });

      it('opens the conversation at the caller-derived UUIDv5', () => {
        expect(step.with?.conversation_id).toMatch(
          /^\{\{ steps\.derive_ids\.output\.\w+ConversationId \}\}$/
        );
      });

      // public-conversation so any analyst working the queue can read it, not just the workflow
      // identity that created it.
      it('creates the conversation as public', () => {
        expect(step['public-conversation']).toBe(true);
      });

      // With the `alert-analysis` skill behind it this is multi-step tool work, not a single
      // zero-tool-call turn. 10m was the pre-epic value; significant_events uses 1800s for the
      // equivalent agent.
      it('allows time for multi-step tool use', () => {
        expect(step.timeout).toBe('1800s');
      });
    }
  );
});

// A6: the conversation is the durable audit surface, and it was silent about the loop — the gate was
// asked and answered entirely outside the thread.
describe('watch_floor.yaml conversation audit trail (A6)', () => {
  // (i) Before the ask, the agent states what it will propose. Free — a prompt change — and it
  // becomes the source of the gate card's summary, so card and conversation cannot drift.
  describe.each(['open_incident'])('%s', (stepName) => {
    const step = getStep(stepName);

    it('asks the agent to state what it will propose for approval', () => {
      expect(step.with?.message).toContain('what you will propose for human approval');
    });

    it('asks the agent to state what approval authorizes', () => {
      expect(step.with?.message).toContain('approval authorizes');
    });

    it('asks the agent to state what happens if it is declined', () => {
      expect(step.with?.message).toContain('declined');
    });

    it('returns that statement in structured output so the gate card can quote it verbatim', () => {
      expect(step.with?.schema?.properties).toHaveProperty('proposal');
    });

    it('requires the proposal statement', () => {
      expect(step.with?.schema?.required).toContain('proposal');
    });
  });

  // (ii) After the ask, where a following ai.agent step exists, the decision is passed into it and
  // lands in the thread naturally.
  describe('open_incident carries the escalation decision into the thread', () => {
    const message = getStep('open_incident').with?.message ?? '';

    it('names the responder', () => {
      expect(message).toContain('{{ steps.await_promote_incident.output.respondedBy }}');
    });

    it('names the decision', () => {
      expect(message).toContain('{{ steps.await_promote_incident.output.response.decision }}');
    });

    it('carries the rationale', () => {
      expect(message).toContain('{{ steps.await_promote_incident.output.response.rationale }}');
    });

    // At a raised autonomy level the gate is auto-accepted, so all three render empty. The prompt
    // has to say so, or the model reads the blanks as a missing human.
    it('explains that empty values mean the gate was auto-accepted', () => {
      expect(message).toContain('auto-accepted');
    });
  });

  /**
   * Forensic reconstruction reaches the analyst here. The Deep Watch worker returns
   * `patientZero` and `attackTimeline` alongside its verdict, and the incident
   * conversation is where an analyst actually reads them — an artifact that is
   * structurally present but never surfaced is not worth producing.
   *
   * Both fields render empty whenever reconstruction was skipped (a false verdict)
   * or failed under its `continue: true`, so the prompt has to say what empty means
   * or the model invents a sequence to fill the gap.
   */
  describe('open_incident threads the forensic reconstruction into the incident', () => {
    const message = getStep('open_incident').with?.message ?? '';
    it('carries patient zero from the investigation worker', () => {
      expect(message).toContain('{{ steps.investigate.output.patientZero }}');
    });
    it('carries the attack timeline from the investigation worker', () => {
      expect(message).toContain('{{ steps.investigate.output.attackTimeline }}');
    });
    it('tells the model what an empty reconstruction means, so it does not infer one', () => {
      expect(message).toContain('empty when reconstruction did not run');
    });
  });

  // No plain conversation-append endpoint exists in Agent Builder (the internal conversation routes
  // are `_rename` and `_mark_read`; `sml/_attach` attaches memory entries to an existing round), so
  // the terminal and dismissal records use the documented fallback: a minimal ai.agent turn on the
  // same conversation with `create-conversation: false`.
  describe.each([
    ['record_dismissed_investigation', 'investigationConversationId', true],
    ['record_dismissed_incident', 'investigationConversationId', false],
    ['record_containment_outcome', 'incidentConversationId', false],
  ])('%s', (stepName, conversationIdField, createsConversation) => {
    const step = getStep(stepName);

    it('is an ai.agent turn, because no non-LLM append endpoint exists', () => {
      expect(step.type).toBe('ai.agent');
    });

    it('writes into the conversation the decision belongs to', () => {
      expect(step.with?.conversation_id).toBe(
        `{{ steps.derive_ids.output.${conversationIdField} }}`
      );
    });

    it(
      createsConversation
        ? 'creates the conversation if minting degraded, because the container is normally already there'
        : 'appends to the existing conversation rather than creating one',
      () => {
        expect(step['create-conversation'] ?? false).toBe(createsConversation);
      }
    );

    // The audit append must never fail the run: the workflow output already records the decision,
    // and the conversation is the ADDITIONAL surface.
    it('continues on failure so an audit append can never fail the run', () => {
      expect(step['on-failure']?.continue).toBe(true);
    });

    it('tells the agent to record the outcome rather than analyze it', () => {
      expect(step.with?.message).toContain('AUDIT RECORD');
    });

    it('forbids tool use on an audit-only turn', () => {
      expect(step.with?.message).toContain('do not use any tools');
    });
  });

  // A dismissal is the human overriding the machine — the single most important thing to preserve.
  // `workflow.output` TERMINATES the run, so the record has to be declared before it.
  describe('dismissal paths record before terminating', () => {
    it('records the investigation dismissal before ending the run', () => {
      expect(stepNames(getStep('stop_if_dismissed_investigation').steps)).toEqual([
        'record_dismissed_investigation',
        'dismissed_investigation',
      ]);
    });

    it('records the escalation dismissal before ending the run', () => {
      expect(stepNames(getStep('stop_if_dismissed_incident').steps)).toEqual([
        'record_dismissed_incident',
        'dismissed_incident',
      ]);
    });
  });

  it('records the containment outcome before the terminal marker', () => {
    const names = stepNames(parsed.steps);

    expect(names.indexOf('record_containment_outcome')).toBe(names.indexOf('incident_closed') - 1);
  });

  it('records the containment responder, so the thread names who closed the incident', () => {
    expect(getStep('record_containment_outcome').with?.message).toContain(
      '{{ steps.await_incident_contained.output.respondedBy }}'
    );
  });
});

// A7: B1 renders `message` as the row headline and `reasoning.summary` as its body, so an approver
// must be able to decide from the row alone. The gate messages were generic ("Open an investigation
// for this attack discovery?"), which made four near-identical rows.
describe('watch_floor.yaml self-contained gate prompts (A7)', () => {
  describe.each(['await_open_investigation', 'await_promote_incident', 'await_incident_contained'])(
    '%s',
    (stepName) => {
      const step = getStep(stepName);

      it('names the specific attack in the row headline', () => {
        expect(step.with?.message).toContain('{{ steps.derive_ids.output.attackDiscoveryTitle }}');
      });

      // 30d, not the 72h default. Expiry FAILS the step, which is fail-closed.
      it('waits 30 days before failing closed', () => {
        expect(step.timeout).toBe('30d');
      });
    }
  );

  // The engine's default `settings.timeout` is 6h from **run** start. Idle HITL resume takes
  // min(step timeout, workflow timeout), so omitting this expires a recently parked gate as
  // soon as the Floor run itself is 6h old — even though the step still says 30d.
  it('sets the workflow timeout to 30d so the run clock cannot undercut the HITL wait', () => {
    expect(parsed.settings?.timeout).toBe('30d');
  });

  it('bumps the managed version, so the workflow timeout reaches an installed stack', () => {
    expect(PND_WATCH_FLOOR_WORKFLOW.version).toBeGreaterThan(19);
  });

  describe.each([
    ['reason_open_investigation', 'await_open_investigation'],
    ['reason_promote_incident', 'await_promote_incident'],
    ['reason_incident_contained', 'await_incident_contained'],
  ])('%s', (reasonStepName, gateStepName) => {
    const step = getStep(reasonStepName);

    it('is a data.set step, whose `with` becomes the output the projection reads', () => {
      expect(step.type).toBe('data.set');
    });

    // resolvePredecessorReasoning attaches the block with the greatest finishedAt <= wait.startedAt,
    // so the reasoning must sit immediately before its gate INSIDE the same branch.
    it('sits immediately before its gate', () => {
      const siblings = stepNames(findEnclosingIf(gateStepName)?.steps ?? parsed.steps);

      expect(siblings.indexOf(reasonStepName)).toBe(siblings.indexOf(gateStepName) - 1);
    });

    // `build_proposal_rows` projects ONLY `reasoning.summary` into the row (sections are dropped by
    // `extractReasoningSummary` — security finding D3), so the summary has to carry the decision.
    it('states what approval authorizes in the summary', () => {
      expect(step.with?.reasoning?.summary).toMatch(/approv/i);
    });

    it('states what happens on a decline in the summary', () => {
      expect(step.with?.reasoning?.summary).toMatch(/declin/i);
    });

    it('carries the deciding evidence in sections', () => {
      expect(step.with?.reasoning?.sections?.length).toBeGreaterThan(0);
    });
  });

  // The card previously asserted "The investigation assessed this as a real incident" while quoting
  // a rationale that could have concluded the opposite — and in demo mode the branch is forced, so a
  // fixed verdict claim would be flatly wrong. Sourcing the summary from the agent's own closing
  // statement is what keeps card and conversation from drifting.
  it('quotes the investigation agent verbatim in the escalation card', () => {
    expect(getStep('reason_promote_incident').with?.reasoning?.summary).toContain(
      '{{ steps.investigate.output.proposal }}'
    );
  });

  it('quotes the incident agent verbatim in the containment card', () => {
    expect(getStep('reason_incident_contained').with?.reasoning?.summary).toContain(
      '{{ steps.open_incident.output.structured_output.proposal }}'
    );
  });

  it('asserts no verdict of its own in the escalation card', () => {
    expect(getStep('reason_promote_incident').with?.reasoning?.summary).not.toContain(
      'assessed this as a real incident'
    );
  });
});

// D5 / ADR-012: the `[Thread]` conversation paired 1:1 with a HITL proposal is materialised EAGERLY
// by the watch, so a pending proposal always has a thread whether or not anyone opens it.
//
// One step per gate, not one per file: the thread id is `uuidv5(`${adId}:${gateId}`)` (D1), so the
// `gateId` a step sends is what decides which proposal the thread belongs to. A single step could
// only ever ensure the first gate's thread, leaving `promote_incident` and `incident_contained`
// proposals threadless — which is exactly the epic acceptance criterion "every HITL proposal has
// exactly one thread".
describe('watch_floor.yaml eager thread materialisation (D5)', () => {
  const ensureThreadSteps = allSteps.filter(({ name }) => name.startsWith('ensure_thread_'));

  it('materialises a thread for every HITL gate, not just the first', () => {
    expect(ensureThreadSteps).toHaveLength(
      allSteps.filter(({ type }) => type === 'waitForInput').length
    );
  });

  it('sends a distinct gate id from each, so no two proposals can share one thread', () => {
    const gateIds = ensureThreadSteps.map((step) => step.with?.body?.gateId);

    expect(new Set(gateIds).size).toBe(gateIds.length);
  });

  // `versionStrategy: 'auto'` only re-applies the YAML when the version increases, so an un-bumped
  // edit never reaches an installed stack. Greater-than rather than equal, so later beads can bump.
  // 9 rather than 8 since kibana-phf4.5: the lane arrived here from `watch_deep.yaml` at version 10,
  // and a Floor still on its stub-era 4 would leave the two-step triage YAML installed.
  it('bumps the managed version, so the steps actually reach an installed stack', () => {
    expect(PND_WATCH_FLOOR_WORKFLOW.version).toBeGreaterThan(9);
  });

  describe.each([
    [
      'ensure_thread_open_investigation',
      'open_investigation',
      'reason_open_investigation',
      'await_open_investigation',
    ],
    [
      'ensure_thread_promote_incident',
      'promote_incident',
      'reason_promote_incident',
      'await_promote_incident',
    ],
    [
      'ensure_thread_incident_contained',
      'incident_contained',
      'reason_incident_contained',
      'await_incident_contained',
    ],
  ])('%s', (stepName, gateId, reasonStepName, gateStepName) => {
    const step = getStep(stepName);

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

    it('keys the thread on the attack discovery the trigger carried', () => {
      expect(step.with?.body?.correlationId).toBe('{{ event.attackDiscoveryAlertId }}');
    });

    it('names its own gate, so the derived id is the one paired with this proposal', () => {
      expect(step.with?.body?.gateId).toBe(gateId);
    });

    // Non-negotiable, and the same class of defect as R2: a thread failure must never abort a watch.
    it('continues on failure, so a thread failure can never abort the watch', () => {
      expect(step['on-failure']?.continue).toBe(true);
    });

    // Safe to retry because `_ensure` is idempotent (D6: pre-read, in-flight map, post-failure
    // re-read), and a converse timeout is the expected transient failure rather than an exotic one.
    it('retries transient failures before degrading', () => {
      expect(step['on-failure']?.retry?.['max-attempts']).toBe(2);
    });

    // ⚠️ THE PLACEMENT THAT MATTERS. `resolveReasoningForRun` attaches the reasoning of the single
    // COMPLETED step with the greatest `finishedAt <= gate.startedAt`. A `kibana.request` step
    // between the `data.set` block and the gate would become that predecessor, and its output has no
    // `reasoning` — so every proposal card would silently lose its body. The step therefore runs
    // BEFORE the reasoning block, never between it and the gate.
    it('runs before the reasoning block, so the gate still resolves its reasoning', () => {
      const siblings = stepNames(findEnclosingIf(gateStepName)?.steps ?? parsed.steps);

      expect(siblings.indexOf(stepName)).toBe(siblings.indexOf(reasonStepName) - 1);
    });

    // Before the `waitForInput`, so the thread exists the moment the proposal parks rather than only
    // once the analyst has answered — which is what "eager" means.
    it('runs before the gate parks', () => {
      const siblings = stepNames(findEnclosingIf(gateStepName)?.steps ?? parsed.steps);

      expect(siblings.indexOf(stepName)).toBeLessThan(siblings.indexOf(gateStepName));
    });

    // Same container as its gate, so the thread and the proposal stay paired. After kibana-tjil.1
    // that container is the workflow root for open_investigation / incident_contained, and the
    // investigation verdict for promote_incident — never an autonomy skip.
    it('shares its gate container', () => {
      expect(findEnclosingIf(stepName)).toBe(findEnclosingIf(gateStepName));
    });
  });
});

// kibana-tjil.6 / A5. The Floor arms a per-run auto-approver via workflow.executeAsync so the
// child inherits the watch's request. Only the two auto-approvable gates are armed — containment
// is alwaysGate and must never grow an arm. Placement matches ensure_thread_*: before the
// reasoning block, never between reason_* and await_*.
describe('watch_floor.yaml auto-approver arming (kibana-tjil.6)', () => {
  const armSteps = allSteps.filter(({ name }) => name.startsWith('arm_auto_approver_'));

  it('arms exactly the two Floor gates that may auto-approve', () => {
    expect(armSteps.map(({ name }) => name)).toEqual([
      'arm_auto_approver_open_investigation',
      'arm_auto_approver_promote_incident',
    ]);
  });

  it('never arms the alwaysGate containment step', () => {
    expect(allSteps.map(({ name }) => name)).not.toContain('arm_auto_approver_incident_contained');
  });

  // YAML edits are invisible to the definition hash. Greater-than rather than equal, so later
  // beads can bump. 12 is the always-park version; this bead's arm steps need 13.
  it('bumps the managed version, so the arm steps reach an installed stack', () => {
    expect(PND_WATCH_FLOOR_WORKFLOW.version).toBeGreaterThan(12);
  });

  describe.each([
    [
      'arm_auto_approver_open_investigation',
      'ensure_thread_open_investigation',
      'reason_open_investigation',
      'await_open_investigation',
    ],
    [
      'arm_auto_approver_promote_incident',
      'ensure_thread_promote_incident',
      'reason_promote_incident',
      'await_promote_incident',
    ],
  ])('%s', (stepName, ensureStepName, reasonStepName, gateStepName) => {
    const step = getStep(stepName);

    it('is a workflow.executeAsync step, so the child inherits the watch request', () => {
      expect(step.type).toBe('workflow.executeAsync');
    });

    it('arms the auto-approver worker', () => {
      expect(step.with?.['workflow-id']).toBe('system-security-watch-auto-approver');
    });

    it('passes the Floor watch id, so _auto_respond scopes to this watch', () => {
      expect(step.with?.inputs?.watch_id).toBe('system-security-watch-floor');
    });

    it('passes the workflow space, so the child POSTs in the same space', () => {
      expect(step.with?.inputs?.space_id).toBe('{{ workflow.spaceId }}');
    });

    it('sends exactly the two inputs the auto-approver declares', () => {
      expect(Object.keys(step.with?.inputs ?? {}).sort()).toEqual(['space_id', 'watch_id']);
    });

    it('continues on failure, so a missed arm cannot abort the watch', () => {
      expect(step['on-failure']?.continue).toBe(true);
    });

    it('never retries, so a failed arm does not spawn a second child', () => {
      expect(step['on-failure']?.retry).toBeUndefined();
    });

    it('sits immediately before ensure_thread, where the thread step itself sits', () => {
      const siblings = stepNames(findEnclosingIf(gateStepName)?.steps ?? parsed.steps);

      expect(siblings.indexOf(stepName)).toBe(siblings.indexOf(ensureStepName) - 1);
    });

    it('runs before the reasoning block, so it cannot steal the gate predecessor', () => {
      const siblings = stepNames(findEnclosingIf(gateStepName)?.steps ?? parsed.steps);

      expect(siblings.indexOf(stepName)).toBeLessThan(siblings.indexOf(reasonStepName));
    });

    it('does not sit between the reasoning block and its gate', () => {
      const siblings = stepNames(findEnclosingIf(gateStepName)?.steps ?? parsed.steps);

      expect(siblings.indexOf(stepName)).not.toBe(siblings.indexOf(reasonStepName) + 1);
      expect(siblings.indexOf(stepName)).not.toBe(siblings.indexOf(gateStepName) - 1);
    });

    it('shares its gate container', () => {
      expect(findEnclosingIf(stepName)).toBe(findEnclosingIf(gateStepName));
    });
  });
});

// kibana-tjil.8 / B2 + C4. The Floor stops doing the investigation itself: it mints the
// container before the first gate (so a thread never exists without a parent), invokes
// Deep Watch as a sync worker, and assesses the worker's isIncident.
describe('watch_floor.yaml investigation split (kibana-tjil.8)', () => {
  const topLevel = stepNames(parsed.steps);

  it('no longer performs the TP/FP determination as an inline ai.agent step', () => {
    expect(allSteps.filter(({ name }) => name === 'open_investigation')).toEqual([]);
  });

  describe('create_investigation_container', () => {
    const step = getStep('create_investigation_container');

    it('is a kibana.request, so minting costs no LLM turn', () => {
      expect(step.type).toBe('kibana.request');
    });

    it('POSTs the public conversation create route', () => {
      expect(step.with?.method).toBe('POST');
      expect(step.with?.path).toBe('/s/{{ workflow.spaceId }}/api/agent_builder/conversations');
    });

    it('sends elastic-api-version for the public versioned route', () => {
      expect(step.with?.headers?.['elastic-api-version']).toBe('2023-10-31');
    });

    it('sends kbn-xsrf', () => {
      expect(step.with?.headers?.['kbn-xsrf']).toBe('true');
    });

    it('mints the derived investigation conversation id', () => {
      expect(step.with?.body?.conversation_id).toBe(
        '{{ steps.derive_ids.output.investigationConversationId }}'
      );
    });

    it('sets the title at creation with an [Investigation] prefix for Agent Builder', () => {
      expect(step.with?.body?.title).toBe(
        "[Investigation] {{ steps.derive_ids.output.attackDiscoveryTitle | default: 'Attack Discovery' }}"
      );
    });

    it('associates the conversation with the investigation agent from _derive', () => {
      expect(step.with?.body?.agent_id).toBe('{{ steps.derive_ids.output.investigationAgentId }}');
    });

    it('creates the conversation as public so the queue is readable', () => {
      expect(step.with?.body?.access_control).toEqual({ access_mode: 'public' });
    });

    it('sends no message, so minting cannot start an LLM turn', () => {
      expect(step.with?.body).not.toHaveProperty('message');
      expect(step.with?.message).toBeUndefined();
    });

    it('continues on failure, so a mint miss cannot abort the watch', () => {
      expect(step['on-failure']?.continue).toBe(true);
    });

    it('retries a transient create failure first', () => {
      expect(step['on-failure']?.retry?.['max-attempts']).toBe(2);
    });

    it('runs after derive_ids, which is where the conversation id comes from', () => {
      expect(topLevel.indexOf('create_investigation_container')).toBe(
        topLevel.indexOf('derive_ids') + 1
      );
    });

    it('runs before the first gate parks', () => {
      expect(topLevel.indexOf('create_investigation_container')).toBeLessThan(
        topLevel.indexOf('await_open_investigation')
      );
    });

    it('runs before the thread is ensured, so a thread never exists without a parent', () => {
      expect(topLevel.indexOf('create_investigation_container')).toBeLessThan(
        topLevel.indexOf('ensure_thread_open_investigation')
      );
    });

    it('does not sit between the reasoning block and its gate', () => {
      expect(topLevel.indexOf('create_investigation_container')).not.toBe(
        topLevel.indexOf('reason_open_investigation') + 1
      );
      expect(topLevel.indexOf('create_investigation_container')).not.toBe(
        topLevel.indexOf('await_open_investigation') - 1
      );
    });
  });

  describe('investigate', () => {
    const step = getStep('investigate');

    it('is a workflow.execute, so the Floor waits for the worker', () => {
      expect(step.type).toBe('workflow.execute');
    });

    it('invokes the per-space Deep document, not the catalog definition id', () => {
      expect(step.with?.['workflow-id']).toBe('system-security-watch-deep-{{ workflow.spaceId }}');
    });

    it('bumps the managed version, so the per-space Deep id reaches an installed stack', () => {
      expect(PND_WATCH_FLOOR_WORKFLOW.version).toBeGreaterThan(19);
    });

    it('passes both inputs Deep declares', () => {
      expect(Object.keys(step.with?.inputs ?? {}).sort()).toEqual([
        'attack_discovery_alert_id',
        'space_id',
      ]);
    });

    it('keys the worker on the attack discovery the trigger carried', () => {
      expect(step.with?.inputs?.attack_discovery_alert_id).toBe(
        '{{ event.attackDiscoveryAlertId }}'
      );
    });

    it('runs the worker in the same space as the Floor', () => {
      expect(step.with?.inputs?.space_id).toBe('{{ workflow.spaceId }}');
    });

    it('runs after the investigation gate is answered, not before it parks', () => {
      expect(topLevel.indexOf('investigate')).toBeGreaterThan(
        topLevel.indexOf('await_open_investigation')
      );
    });

    it('does not sit between any reason_* and its await_*', () => {
      expect(topLevel.indexOf('investigate')).not.toBe(
        topLevel.indexOf('reason_open_investigation') + 1
      );
      expect(topLevel.indexOf('investigate')).not.toBe(
        topLevel.indexOf('await_open_investigation') - 1
      );
    });

    it('does not continue on failure, so a failed worker cannot look like a false positive', () => {
      expect(step['on-failure']?.continue).toBeFalsy();
    });

    it('is followed immediately by assess, with no rename in between', () => {
      expect(topLevel.indexOf('assess_investigation')).toBe(topLevel.indexOf('investigate') + 1);
    });
  });

  it('still places reason_open_investigation immediately before its gate', () => {
    expect(topLevel.indexOf('reason_open_investigation')).toBe(
      topLevel.indexOf('await_open_investigation') - 1
    );
  });

  it('still places reason_promote_incident immediately before its gate', () => {
    const siblings = stepNames(getStep('assess_investigation').steps);

    expect(siblings.indexOf('reason_promote_incident')).toBe(
      siblings.indexOf('await_promote_incident') - 1
    );
  });

  it('still places reason_incident_contained immediately before its gate', () => {
    expect(topLevel.indexOf('reason_incident_contained')).toBe(
      topLevel.indexOf('await_incident_contained') - 1
    );
  });

  it('bumps the managed version, so the split reaches an installed stack', () => {
    expect(PND_WATCH_FLOOR_WORKFLOW.version).toBeGreaterThan(13);
  });
});
