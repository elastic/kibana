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

interface ParsedOutput {
  name?: string;
  type?: string;
}

interface ParsedJsonSchema {
  properties?: Record<string, ParsedJsonSchema>;
  required?: string[];
  type?: string;
}

interface ParsedStepWith {
  conversation_id?: string;
  headers?: Record<string, string>;
  isIncident?: string;
  method?: string;
  path?: string;
  proposal?: string;
  query?: { correlationId?: string };
  rationale?: string;
  reasoning?: { summary?: string };
  schema?: ParsedJsonSchema;
}

interface ParsedOnFailure {
  continue?: boolean | string;
  retry?: { delay?: string; 'max-attempts'?: number };
}

interface ParsedStep {
  else?: ParsedStep[];
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
  outputs?: ParsedOutput[];
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
    throw new Error(`No '${name}' step found in Deep Watch`);
  }

  return step;
};

/**
 * kibana-tjil.7 / B1. Deep Watch stays a catalog watch (alert + manual, VISIBILITY) so standalone
 * use survives, and becomes an invokable investigation worker: inputs, a derived conversation for
 * `triage_alerts`, and a `workflow.output` of `{ isIncident, rationale, proposal }` that `.8` reads
 * via `workflow.execute`.
 */
describe('watch_deep.yaml (catalog identity)', () => {
  it('keeps the Deep Watch name, so the tier the catalog renders is unchanged', () => {
    expect(parsed.name).toBe('Deep Watch');
  });

  it('keeps the tier tags, which are what `list_watches` maps a definition to a tier by', () => {
    expect(parsed.tags).toEqual(['watch', 'watch-deep']);
  });

  it('keeps the Deep tier mandate', () => {
    expect(parsed.consts?.watch_policy?.mandate).toBe('Deep investigation & hunts');
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
      'triage_alerts',
      'record_reasoning',
      'emit_result',
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
    expect(parsed.outputs).toEqual([
      { name: 'isIncident', type: 'boolean' },
      { name: 'rationale', type: 'string' },
      { name: 'proposal', type: 'string' },
    ]);
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

    it('continues on failure, so a standalone alert without an attack-discovery id still triages', () => {
      expect(step()['on-failure']?.continue).toBe(true);
    });
  });

  describe('triage_alerts', () => {
    const step = () => getStep('triage_alerts');

    it('is an ai.agent step', () => {
      expect(step().type).toBe('ai.agent');
    });

    it('writes into the derived investigation conversation rather than a random one', () => {
      expect(step().with?.conversation_id).toBe(
        '{{ steps.derive_ids.output.investigationConversationId }}'
      );
    });

    it('asks the model for the worker contract .8 reads', () => {
      expect(Object.keys(step().with?.schema?.properties ?? {}).sort()).toEqual([
        'isIncident',
        'proposal',
        'rationale',
      ]);
      expect(step().with?.schema?.required?.slice().sort()).toEqual([
        'isIncident',
        'proposal',
        'rationale',
      ]);
    });

    it('does not name an agent-id, so projectWorkers still skips this unowned step', () => {
      expect((step() as { 'agent-id'?: string })['agent-id']).toBeUndefined();
    });
  });

  describe('record_reasoning', () => {
    it('records the verdict as reasoning through a data.set step', () => {
      expect(getStep('record_reasoning').type).toBe('data.set');
    });

    it('quotes the model rationale as the reasoning summary', () => {
      expect(getStep('record_reasoning').with?.reasoning?.summary).toContain(
        'steps.triage_alerts.output.structured_output.rationale'
      );
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
        '${{ steps.triage_alerts.output.structured_output.isIncident }}'
      );
    });

    it('returns the model rationale', () => {
      expect(step().with?.rationale).toBe(
        '{{ steps.triage_alerts.output.structured_output.rationale }}'
      );
    });

    it('returns the model proposal', () => {
      expect(step().with?.proposal).toBe(
        '{{ steps.triage_alerts.output.structured_output.proposal }}'
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
