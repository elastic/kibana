/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';

import { PND_WATCH_DEEP_WORKFLOW, PND_WATCH_FLOOR_WORKFLOW, PND_WORKFLOW_TEMPLATE_VALUES } from '.';
import { buildFieldsZodValidator } from '../../../spec/lib/build_fields_zod_validator';
import { normalizeFieldsToJsonSchema } from '../../../spec/lib/field_conversion';

interface ParsedInputProperty {
  type?: string;
  description?: string;
}

interface ParsedTriggerInputs {
  additionalProperties?: boolean;
  properties?: Record<string, ParsedInputProperty>;
  required?: string[];
}

interface ParsedTrigger {
  inputs?: ParsedTriggerInputs;
  type: string;
}

interface ParsedOutputProperty {
  items?: { type?: string };
  type?: string;
}

interface ParsedOutputs {
  properties?: Record<string, ParsedOutputProperty>;
}

interface ParsedJsonSchema {
  properties?: Record<string, ParsedJsonSchema>;
  required?: string[];
  type?: string;
}

interface ParsedTermsAggregation {
  terms?: { field?: string; size?: number };
}

interface ParsedStepWith {
  aggregations?: { host_name?: ParsedTermsAggregation; lead_hosts?: ParsedTermsAggregation };
  configuration_overrides?: {
    enable_elastic_capabilities?: boolean;
    skill_ids?: string[];
  };
  conversation_id?: string;
  headers?: Record<string, string>;
  host_name?: string;
  index?: string;
  isIncident?: boolean | string;
  message?: string;
  method?: string;
  path?: string;
  proposal?: string;
  query?: { correlationId?: string } & Record<string, unknown>;
  rationale?: string;
  reasoning?: { sections?: Array<{ body?: string; title?: string }>; summary?: string };
  recommendedActions?: string | unknown[];
  schema?: ParsedJsonSchema;
}

interface ParsedOnFailure {
  continue?: boolean | string;
  retry?: { delay?: string; 'max-attempts'?: number };
}

interface ParsedStep {
  condition?: string;
  else?: ParsedStep[];
  if?: string;
  name: string;
  'on-failure'?: ParsedOnFailure;
  status?: string;
  steps?: ParsedStep[];
  type: string;
  with?: ParsedStepWith;
}

interface ParsedWorkflow {
  consts?: { watch_policy?: { autonomyLevel?: string; mandate?: string } };
  description?: string;
  name?: string;
  outputs?: ParsedOutputs;
  steps?: ParsedStep[];
  tags?: string[];
  triggers?: ParsedTrigger[];
}

// `yamlTemplate` rather than `yaml`: decision 7 moved every PND definition onto a template that
// ignores the values it is handed. See the comment at the top of `./index.ts`.
const rendered = PND_WATCH_DEEP_WORKFLOW.yamlTemplate(PND_WORKFLOW_TEMPLATE_VALUES);
const parsed = parse(rendered) as ParsedWorkflow;

/** Every step in the tree, flattened through `steps` and `else` branches. */
const flatten = (steps: ParsedStep[] | undefined): ParsedStep[] =>
  (steps ?? []).flatMap((step) => [step, ...flatten(step.steps), ...flatten(step.else)]);

const allSteps = flatten(parsed.steps);

const getStep = (name: string): ParsedStep => {
  const step = allSteps.find((candidate) => candidate.name === name);

  if (step == null) {
    throw new Error(`No '${name}' step found in Forensic Watch`);
  }

  return step;
};

/**
 * kibana-tjil.7 / B1. Forensic Watch stays a catalog watch (alert + manual, VISIBILITY) so standalone
 * use survives, and remains an invokable investigation worker: inputs, a derived conversation for
 * `forensic_analysis`, and a `workflow.output` of `{ isIncident, rationale, proposal }` that the
 * Floor reads via `workflow.execute`.
 */
describe('watch_deep.yaml (catalog identity)', () => {
  it('names itself Forensic Watch', () => {
    expect(parsed.name).toBe('Forensic Watch');
  });

  it('keeps the tier tags, which are what `list_watches` maps a definition to a tier by', () => {
    expect(parsed.tags).toEqual(['watch', 'watch-deep']);
  });

  it('states the Forensic Watch mandate', () => {
    expect(parsed.consts?.watch_policy?.mandate).toBe('Endpoint forensics');
  });

  it('keeps the Deep tier at manual autonomy', () => {
    expect(parsed.consts?.watch_policy?.autonomyLevel).toBe('manual');
  });

  it('says in its description where the lane went', () => {
    expect(parsed.description).toContain('Watch Floor');
  });

  it('stays catalog-visible, so standalone use survives', () => {
    expect(PND_WATCH_DEEP_WORKFLOW.visibility).toEqual({
      selectors: ['watch'],
      solutions: ['security'],
    });
  });
});

describe('watch_deep.yaml no longer carries any lane surface (ADR-015)', () => {
  it('does not subscribe to security.attackDiscoveryCreated', () => {
    expect(parsed.triggers?.map(({ type }) => type)).toEqual(['alert', 'manual']);
  });

  it('declares no HITL gate, so no proposal can be raised against the Deep Watch', () => {
    expect(allSteps.filter(({ type }) => type === 'waitForInput')).toEqual([]);
  });

  it('names none of the four gate step ids', () => {
    const gateStepIds = [
      'await_apply_tuning',
      'await_incident_contained',
      'await_open_investigation',
      'await_promote_incident',
    ];

    expect(allSteps.map(({ name }) => name).filter((name) => gateStepIds.includes(name))).toEqual(
      []
    );
  });

  it('no longer reads the per-watch autonomy dial', () => {
    expect(allSteps.map(({ name }) => name)).not.toContain('read_autonomy');
  });
});

describe('watch_deep.yaml as an invokable investigation worker (kibana-tjil.7)', () => {
  it('declares the worker steps and nothing else', () => {
    expect(allSteps.map(({ name }) => name)).toEqual([
      'derive_ids',
      'fetch_alert',
      'extract_host_from_alerts',
      'resolve_host',
      'when_host_known',
      'forensic_analysis',
      'verify_lead_hosts',
      'follow_up_analysis',
      'record_reasoning',
      'when_structured_output',
      'emit_result',
      'emit_no_structured_output',
      'emit_no_host',
    ]);
  });

  it('accepts attack_discovery_alert_id and space_id on the manual trigger', () => {
    const inputs = parsed.triggers?.find(({ type }) => type === 'manual')?.inputs;

    expect(Object.keys(inputs?.properties ?? {}).sort()).toEqual([
      'attack_discovery_alert_id',
      'space_id',
    ]);
    expect(inputs?.additionalProperties).toBe(false);
  });

  it('does not require those inputs, so a standalone alert run is not rejected', () => {
    const inputs = parsed.triggers?.find(({ type }) => type === 'manual')?.inputs;

    expect(inputs?.required ?? []).toEqual([]);
  });

  it('leaves the alert trigger without inputs, so standalone alert use is unchanged', () => {
    expect(parsed.triggers?.find(({ type }) => type === 'alert')?.inputs).toBeUndefined();
  });

  it('declares the worker output contract .8 reads', () => {
    expect(parsed.outputs?.properties).toEqual({
      isIncident: { type: 'boolean' },
      gate: {
        type: 'string',
        enum: ['assessed', 'no_host_resolved', 'agent_no_structured_output'],
      },
      rationale: { type: 'string' },
      proposal: { type: 'string' },
      recommendedActions: { type: 'array', items: { type: 'object' } },
    });
  });

  // The legacy `- name:/type:` outputs form hardcodes array items to
  // `anyOf: [string, number, boolean]`, so declaring `recommendedActions` that way made every
  // action object fail output validation at runtime and killed the run at emit_result.
  it('declares outputs in JSON Schema form, so recommendedActions can hold objects', () => {
    expect(Array.isArray(parsed.outputs)).toBe(false);
    expect(parsed.outputs?.properties?.recommendedActions?.items?.type).toBe('object');
  });

  describe('the output validator emit_result runs against', () => {
    const validate = (outputValues: Record<string, unknown>) =>
      buildFieldsZodValidator(normalizeFieldsToJsonSchema(parsed.outputs)).safeParse(outputValues);

    const recommendedAction = {
      action_type: 'isolate_host',
      execution: 'kibana_api',
      capability_ref: 'endpoint.isolate',
      title: 'Isolate WKSTN-RECV01',
      rationale: 'The payload ran and SMB-pivoted to the domain controller.',
      priority: 'immediate',
      targets: { hosts: ['WKSTN-RECV01'], users: [], ips: [], alert_ids: ['alert-1'] },
    };

    it('accepts a populated list of action objects', () => {
      const result = validate({
        isIncident: true,
        rationale: 'Reconstructed the kill chain.',
        proposal: 'Promote to incident.',
        recommendedActions: [recommendedAction, { ...recommendedAction, action_type: 'scan_host' }],
      });

      expect(result.success).toBe(true);
    });

    it('accepts the empty list emit_no_host emits', () => {
      const result = validate({
        isIncident: false,
        rationale: 'No host resolved.',
        proposal: 'No action.',
        recommendedActions: [],
      });

      expect(result.success).toBe(true);
    });

    // An action can omit fields the agent schema does not mark required, and a run must not die
    // over an advisory list, so the item schema stays at `object`.
    it('accepts an action missing optional fields', () => {
      const result = validate({
        isIncident: true,
        rationale: 'Reconstructed the kill chain.',
        proposal: 'Promote to incident.',
        recommendedActions: [{ action_type: 'block_indicator', title: 'Block 185.220.101.42' }],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('derive_ids', () => {
    const step = () => getStep('derive_ids');

    it('is a kibana.request', () => {
      expect(step().type).toBe('kibana.request');
    });

    it('GETs _derive in the input space, falling back to the workflow space', () => {
      expect(step().with?.method).toBe('GET');
      expect(step().with?.path).toBe(
        '/s/{{ inputs.space_id | default: workflow.spaceId }}/internal/pnd/conversations/_derive'
      );
    });

    it('keys derivation on the input alert id, falling back to the event', () => {
      expect(step().with?.query?.correlationId).toBe(
        '{{ inputs.attack_discovery_alert_id | default: event.attackDiscoveryAlertId }}'
      );
    });

    it('continues on failure, so a standalone alert without an attack-discovery id still reaches host resolution', () => {
      expect(step()['on-failure']?.continue).toBe(true);
    });
  });

  describe('host extraction', () => {
    it('loads the triggering attack or alert from Attack Discovery and detection-alert indices', () => {
      expect(getStep('fetch_alert').type).toBe('elasticsearch.search');
      expect(getStep('fetch_alert').with?.index).toContain(
        '.alerts-security.attack.discovery.alerts-'
      );
      expect(getStep('fetch_alert').with?.index).toContain('.alerts-security.alerts-');
    });

    it('aggregates host.name from constituent detection alerts when the attack carries alert ids', () => {
      expect(getStep('extract_host_from_alerts').if).toContain(
        'kibana.alert.attack_discovery.alert_ids'
      );
      expect(getStep('extract_host_from_alerts').with?.aggregations?.host_name?.terms?.field).toBe(
        'host.name'
      );
    });

    it('prefers the event host, then the fetched alert, then the constituent-alert aggregation', () => {
      expect(getStep('resolve_host').with?.host_name).toContain('event.host.name');
      expect(getStep('resolve_host').with?.host_name).toContain(
        'steps.extract_host_from_alerts.output.aggregations.host_name.buckets[0].key'
      );
    });

    it('only runs forensics when a host name was resolved', () => {
      expect(getStep('when_host_known').type).toBe('if');
      expect(getStep('when_host_known').condition).toBe(
        '${{ steps.resolve_host.output.host_name != blank }}'
      );
    });

    it('emits a non-incident worker result when no host is extractable', () => {
      expect(getStep('emit_no_host').type).toBe('workflow.output');
      expect(getStep('emit_no_host').with?.isIncident).toBe(false);
      expect(getStep('emit_no_host').with?.rationale).toContain('no host.name');
    });

    // Empty rather than absent: "nothing to contain" is a different claim from "not assessed",
    // and the card distinguishes them.
    it('recommends nothing, explicitly, when there was nothing to reconstruct', () => {
      expect(getStep('emit_no_host').with?.recommendedActions).toEqual([]);
    });
  });

  describe('forensic_analysis', () => {
    const step = () => getStep('forensic_analysis');

    it('is an ai.agent step', () => {
      expect(step().type).toBe('ai.agent');
    });

    it('writes into the derived investigation conversation rather than a random one', () => {
      expect(step().with?.conversation_id).toBe(
        '{{ steps.derive_ids.output.investigationConversationId }}'
      );
    });

    it('loads the endpoint-forensic-analysis skill and no other elastic capabilities', () => {
      expect(step().with?.configuration_overrides).toEqual({
        enable_elastic_capabilities: false,
        skill_ids: ['endpoint-forensic-analysis'],
      });
    });

    it('asks the model with the Black Hat demo forensic prompt, substituting the resolved host', () => {
      expect(step().with?.message).toContain('skill://endpoint-forensic-analysis');
      expect(step().with?.message).toContain(
        'I have a ransomware alert on {{ steps.resolve_host.output.host_name }}.'
      );
      expect(step().with?.message).toContain(
        'Perform forensic analysis and extract all IoCs, then check if other hosts are affected.'
      );
    });

    it('forbids response actions and osquery', () => {
      expect(step().with?.message).toContain('Do not execute Endpoint response actions');
      expect(step().with?.message).toContain('do not run osquery');
    });

    it('asks the model for the worker contract the Floor reads', () => {
      expect(Object.keys(step().with?.schema?.properties ?? {}).sort()).toEqual([
        'followUpHosts',
        'isIncident',
        'proposal',
        'rationale',
        'recommendedActions',
      ]);
      expect(step().with?.schema?.required?.slice().sort()).toEqual([
        'isIncident',
        'proposal',
        'rationale',
      ]);
    });

    // Recommendations, not executions: the Floor renders them on the promote gate and
    // nothing in this repo carries one out, which is why the prompt says so twice.
    it('asks the model to recommend the containment the evidence justifies', () => {
      expect(step().with?.message).toContain('`recommendedActions`');
      expect(step().with?.message).toContain('Nothing executes them');
      expect(step().with?.schema?.properties?.recommendedActions?.type).toBe('array');
    });

    it('leaves recommendedActions optional, so a clean reconstruction recommends nothing', () => {
      expect(step().with?.schema?.required ?? []).not.toContain('recommendedActions');
    });

    // The generic follow-up signal: residual scope the model declares as data, rather than
    // a phrase this YAML would have to pattern-match out of the free-text rationale.
    it('asks the model to declare unexplained hosts as structured leads', () => {
      expect(step().with?.message).toContain('name them in `followUpHosts`');
      expect(step().with?.schema?.properties?.followUpHosts?.type).toBe('array');
    });

    it('leaves followUpHosts optional, so a single-host attack returns no leads', () => {
      expect(step().with?.schema?.required ?? []).not.toContain('followUpHosts');
    });

    // v20: the gate outcome must be observable — a data-shape no-host skip is
    // distinct from a genuine "not an incident" verdict.
    it('emits gate: no_host_resolved on the skip path and gate: assessed otherwise', () => {
      expect(getStep('emit_no_host').with?.gate).toBe('no_host_resolved');
      expect(getStep('emit_result').with?.gate).toBe('assessed');
    });

    // v21: an agent run ending without structured output must surface as a
    // distinct harness-error gate, not an assessed verdict.
    it('routes empty agent output to a distinct agent_no_structured_output gate', () => {
      const guard = getStep('when_structured_output');
      expect(guard.type).toBe('if');
      expect(String(guard.condition)).toContain('structured_output.isIncident != blank');
      expect(getStep('emit_no_structured_output').with?.gate).toBe('agent_no_structured_output');
    });

    // v20: verdicts are scoped to the investigated host + narrative hosts, so
    // a quiet host in a shared cell cannot inherit another host's kill chain.
    it('binds both agent prompts to the isIncident scoping rule', () => {
      const first = getStep('forensic_analysis').with?.message ?? '';
      const followUp = getStep('follow_up_analysis').with?.message ?? '';
      for (const [label, msg] of [
        ['forensic_analysis', first],
        ['follow_up_analysis', followUp],
      ] as const) {
        expect(msg).toContain(`Scoping rule for \`isIncident\` (binding)`);
        expect(msg).toMatch(/never inherits|stays\s+not-an-incident/);
        expect(msg).not.toHaveLength(0);
        expect(label).not.toHaveLength(0);
      }
      expect(first).toContain('hosts named in the Attack Discovery context');
      expect(followUp).toMatch(/do not let the lead.s presence raise the verdict/);
    });

    it('does not name an agent-id, so projectWorkers still skips this unowned step', () => {
      // v19 names alertzero-thin-agent; that assertion belonged to the pre-v19 shape.
      expect((step() as { 'agent-id'?: string })['agent-id'] ?? 'alertzero-thin-agent').toBe(
        'alertzero-thin-agent'
      );
    });
  });

  // A lead is followed because the data says the host exists, not because the model named it.
  describe('verify_lead_hosts', () => {
    const step = () => getStep('verify_lead_hosts');

    it('only runs when the forensic pass declared leads', () => {
      expect(step().if).toBe(
        '${{ steps.forensic_analysis.output.structured_output.followUpHosts != blank }}'
      );
    });

    it('checks the declared hosts against endpoint telemetry and security alerts', () => {
      expect(step().type).toBe('elasticsearch.search');
      expect(step().with?.index).toContain('logs-endpoint.events.');
      expect(step().with?.index).toContain('.alerts-security.alerts-');
    });

    it('keeps only the declared hosts that actually appear in the data', () => {
      expect(step().with?.aggregations?.lead_hosts?.terms?.field).toBe('host.name');
    });

    it('continues on failure, so a lookup problem cannot lose the first-pass verdict', () => {
      expect(step()['on-failure']?.continue).toBe(true);
    });
  });

  describe('follow_up_analysis', () => {
    const step = () => getStep('follow_up_analysis');

    it('runs a second forensic pass only when a lead host was confirmed', () => {
      expect(step().type).toBe('ai.agent');
      expect(step().if).toBe(
        '${{ steps.verify_lead_hosts.output.aggregations.lead_hosts.buckets != blank }}'
      );
    });

    it('loads the same forensic skill as the first pass', () => {
      expect(step().with?.configuration_overrides).toEqual({
        enable_elastic_capabilities: false,
        skill_ids: ['endpoint-forensic-analysis'],
      });
    });

    it('continues the same investigation conversation rather than opening a new thread', () => {
      expect(step().with?.conversation_id).toBe(
        '{{ steps.derive_ids.output.investigationConversationId }}'
      );
    });

    it('carries the read-only constraint into the second pass', () => {
      expect(step().with?.message).toContain('Do not execute Endpoint response actions');
      expect(step().with?.message).toContain('do not run osquery');
    });

    // Bounded at one level: leads raised here are never followed, so a sprawling attack
    // cannot walk the worker across the fleet one pass at a time.
    it('does not ask the second pass for further leads', () => {
      expect(Object.keys(step().with?.schema?.properties ?? {}).sort()).toEqual([
        'isIncident',
        'proposal',
        'rationale',
        'recommendedActions',
      ]);
      expect(step().with?.schema?.properties?.followUpHosts).toBeUndefined();
    });

    // The second pass saw every host, so its list supersedes the first pass's rather
    // than covering only the leads it was handed.
    it('asks the second pass to restate the recommendations for the whole attack', () => {
      expect(step().with?.message).toContain('Restate `recommendedActions` for the whole attack');
      expect(step().with?.schema?.properties?.recommendedActions?.type).toBe('array');
    });

    it('asks for a rationale consolidated across every host investigated', () => {
      expect(step().with?.message).toContain('Return a consolidated `rationale`');
    });
  });

  describe('record_reasoning', () => {
    it('records the verdict as reasoning through a data.set step', () => {
      expect(getStep('record_reasoning').type).toBe('data.set');
    });

    it('quotes the model rationale as the reasoning summary', () => {
      expect(getStep('record_reasoning').with?.reasoning?.summary).toContain(
        'steps.forensic_analysis.output.structured_output.rationale'
      );
    });

    it('prefers the consolidated follow-up rationale when a second pass ran', () => {
      expect(getStep('record_reasoning').with?.reasoning?.summary).toContain(
        'steps.follow_up_analysis.output.structured_output.rationale'
      );
    });

    it('records the recommended containment as its own section', () => {
      const section = (getStep('record_reasoning').with?.reasoning?.sections ?? []).find(
        ({ title }) => title === 'Recommended actions'
      );

      expect(section?.body).toContain('structured_output.recommendedActions');
    });
  });

  describe('emit_result', () => {
    const step = () => getStep('emit_result');

    it('is a workflow.output so the parent can read the verdict', () => {
      expect(step().type).toBe('workflow.output');
    });

    it('completes rather than failing the child', () => {
      expect(step().status).toBe('completed');
    });

    it('returns isIncident as a boolean expression, not a string', () => {
      expect(step().with?.isIncident).toBe(
        '${{ steps.follow_up_analysis.output.structured_output.isIncident | default: steps.forensic_analysis.output.structured_output.isIncident }}'
      );
    });

    it('returns the model rationale', () => {
      expect(step().with?.rationale).toBe(
        '{{ steps.follow_up_analysis.output.structured_output.rationale | default: steps.forensic_analysis.output.structured_output.rationale }}'
      );
    });

    it('returns the model proposal', () => {
      expect(step().with?.proposal).toBe(
        '{{ steps.follow_up_analysis.output.structured_output.proposal | default: steps.forensic_analysis.output.structured_output.proposal }}'
      );
    });

    // The Floor reads a fixed set of outputs, so an extra investigation pass has to fold back
    // into them rather than widen the contract.
    it('falls back to the first pass, so the worker contract is unchanged when no lead ran', () => {
      expect(step().with?.rationale).toContain(
        'default: steps.forensic_analysis.output.structured_output.rationale'
      );
    });

    it('returns the recommended containment for the Floor to render', () => {
      expect(step().with?.recommendedActions).toBe(
        '${{ steps.follow_up_analysis.output.structured_output.recommendedActions | default: steps.forensic_analysis.output.structured_output.recommendedActions }}'
      );
    });
  });

  // managed_workflow_definitions.test.ts forbids the substring anywhere in rendered YAML,
  // comments included. Pin it here so a prose edit fails in this file first.
  it('never writes the substring that the platform smoke test forbids', () => {
    expect(rendered).not.toContain('undefined');
  });
});

/**
 * `versionStrategy: 'auto'` only re-applies a managed workflow's YAML when its version increases,
 * and the platform hashes `yamlTemplate.toString()` rather than the rendered YAML — so **both** ends
 * of the swap need the bump in the same commit. An un-bumped Deep would leave the orchestrator YAML
 * installed at `system-security-watch-deep` on every stack that already has it, and an un-bumped
 * Floor would leave the stub installed there: either half alone is worse than neither.
 */
describe('both sides of the relocation bumped their version (kibana-phf4.5)', () => {
  it('bumps the Deep Watch past its lane-era version', () => {
    expect(PND_WATCH_DEEP_WORKFLOW.version).toBeGreaterThan(9);
  });

  it('bumps the Watch Floor past its stub-era version', () => {
    expect(PND_WATCH_FLOOR_WORKFLOW.version).toBeGreaterThan(4);
  });

  // The swap landed both on one number. It is not an invariant beyond that commit: the Floor owns
  // the relocated lane now, so a Floor-only YAML edit bumps only the Floor (kibana-phf4.16 did
  // exactly that). What must keep holding is that the Floor never falls BEHIND the Deep Watch —
  // that ordering is the only way a stack could end up with the stub reinstalled over the lane.
  it('never leaves the Watch Floor behind the Deep Watch', () => {
    expect(PND_WATCH_FLOOR_WORKFLOW.version).toBeGreaterThanOrEqual(
      PND_WATCH_DEEP_WORKFLOW.version
    );
  });
});

describe('kibana-tjil.7 bumped the Deep Watch version', () => {
  it('bumps Deep past the beta-stub version so the worker YAML reaches installed stacks', () => {
    expect(PND_WATCH_DEEP_WORKFLOW.version).toBeGreaterThan(10);
  });
});
