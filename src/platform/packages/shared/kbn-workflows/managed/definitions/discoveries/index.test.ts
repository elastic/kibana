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
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW,
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW,
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW,
  ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW,
  ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
} from '.';
import { getManagedWorkflowDefinition, managedWorkflowDefinitions } from '../..';
import type { ManagedWorkflowDefinition } from '../../types';

interface ParsedStep {
  name: string;
  type: string;
  'create-conversation'?: boolean;
  'connector-id'?: string;
  'on-failure'?: unknown;
  status?: string;
  with?: Record<string, unknown>;
}

interface ParsedWorkflow {
  inputs?: { properties?: Record<string, unknown> };
  name?: string;
  steps?: ParsedStep[];
}

const parsed = parse(ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW.yaml) as ParsedWorkflow;

const getStep = (type: string): ParsedStep => {
  const step = parsed.steps?.find((s) => s.type === type);
  if (!step) {
    throw new Error(`No '${type}' step found in skill alert retrieval workflow`);
  }
  return step;
};

describe('ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW', () => {
  it('uses the expected workflow id', () => {
    expect(ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW.id).toBe(
      ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID
    );
  });

  it('is registered with the discoveries pluginId', () => {
    expect(ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW.pluginId).toBe('discoveries');
  });

  it('bumps the version to 11 for the remove_alert_ids (exception-set) gate contract', () => {
    expect(ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW.version).toBe(11);
  });

  it('titles the workflow "Security - Attack discovery - Skill"', () => {
    expect(parsed.name).toBe('Security - Attack discovery - Skill');
  });

  it('is discoverable from the managed registry by id', () => {
    expect(getManagedWorkflowDefinition(ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID)).toBe(
      ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW
    );
  });

  describe('inputs', () => {
    it('exposes the candidate_alerts, skill_enabled, connector_id, and retrieval inputs', () => {
      expect(Object.keys(parsed.inputs?.properties ?? {}).sort()).toEqual([
        'alerts_index_pattern',
        'candidate_alerts',
        'connector_id',
        'end',
        'size',
        'skill_enabled',
        'start',
      ]);
    });

    it('declares candidate_alerts as an array input the gate ground-truths', () => {
      const candidateAlerts = (parsed.inputs?.properties ?? {}).candidate_alerts as {
        type?: string;
      };
      expect(candidateAlerts.type).toBe('array');
    });

    it('declares skill_enabled as a boolean toggle for additional retrieval', () => {
      const skillEnabled = (parsed.inputs?.properties ?? {}).skill_enabled as { type?: string };
      expect(skillEnabled.type).toBe('boolean');
    });
  });

  describe('gate (ai.agent) step', () => {
    const step = getStep('ai.agent');

    it('persists the conversation via create-conversation', () => {
      expect(step['create-conversation']).toBe(true);
    });

    it('routes model calls through the connector_id input (Constraint A)', () => {
      expect(step['connector-id']).toBe('${{ inputs.connector_id }}');
    });

    it('does not retry on failure (avoids restarting the stateful agent from scratch)', () => {
      expect(step['on-failure']).toBeUndefined();
    });

    it('mentions the attack-discovery-generator skill', () => {
      expect(step.with?.message).toContain('skill://attack-discovery-generator');
    });

    it('requests the Mode C ground-truth gate behavior', () => {
      expect(step.with?.message).toContain('Mode C (ground-truth gate)');
    });

    it('renders the candidate_alerts into the gate message', () => {
      expect(step.with?.message).toContain('{% for alert in inputs.candidate_alerts %}');
    });

    it('does NOT require remove_alert_ids (recall-safe: omitted/empty keeps every candidate)', () => {
      const schema = step.with?.schema as { required?: string[] };
      expect(schema.required ?? []).not.toContain('remove_alert_ids');
    });

    it('declares a remove_alert_ids property in the decision structured-output schema', () => {
      const schema = step.with?.schema as { properties?: Record<string, unknown> };
      expect(schema.properties).toHaveProperty('remove_alert_ids');
    });

    it('does NOT declare the legacy keep_alert_ids property', () => {
      const schema = step.with?.schema as { properties?: Record<string, unknown> };
      expect(schema.properties).not.toHaveProperty('keep_alert_ids');
    });

    it('declares an added_alert_ids property in the decision structured-output schema', () => {
      const schema = step.with?.schema as { properties?: Record<string, unknown> };
      expect(schema.properties).toHaveProperty('added_alert_ids');
    });

    it('declares added_alert_ids as an array of string ids', () => {
      const schema = step.with?.schema as {
        properties?: Record<string, { items?: { type?: string }; type?: string }>;
      };
      expect(schema.properties?.added_alert_ids?.type).toBe('array');
      expect(schema.properties?.added_alert_ids?.items?.type).toBe('string');
    });

    it('does NOT declare the legacy added_alerts (full-string) property', () => {
      const schema = step.with?.schema as { properties?: Record<string, unknown> };
      expect(schema.properties).not.toHaveProperty('added_alerts');
    });

    it('declares an additional_context property in the decision structured-output schema', () => {
      const schema = step.with?.schema as { properties?: Record<string, unknown> };
      expect(schema.properties).toHaveProperty('additional_context');
    });

    it('instructs the gate to return ids only (Constraint B — never echo candidate bytes)', () => {
      expect(step.with?.message).toContain('ids ONLY');
    });

    it('instructs the gate to default to keeping every candidate', () => {
      expect(step.with?.message).toContain('DEFAULT to keeping every candidate');
    });

    it('instructs the gate to emit only the ids it removes (remove_alert_ids)', () => {
      expect(step.with?.message).toContain('remove_alert_ids');
    });

    it('tells the gate that omitting an id keeps it (recall-safe default)', () => {
      expect(step.with?.message).toContain('Omitting an _id keeps it');
    });

    it('mandates net-new skill retrieval when skill_enabled is true', () => {
      expect(step.with?.message).toContain('you MUST also retrieve net-new alerts');
    });

    it('treats empty added_alert_ids as a failure when the skill is the only retrieval source', () => {
      expect(step.with?.message).toContain('the ONLY source of alerts for the run');
    });

    it('instructs the gate to return the backing _id of each net-new alert in added_alert_ids', () => {
      expect(step.with?.message).toContain('added_alert_ids');
    });

    it('records added_alert_ids immediately, before any corroboration', () => {
      expect(step.with?.message).toContain('BEFORE you run any corroboration');
    });

    it('forbids corroboration from removing or shrinking added_alert_ids', () => {
      expect(step.with?.message).toContain('MUST NOT remove or shrink');
    });

    it('forbids dropping a self-retrieved alert on inconclusive corroboration (recall-first)', () => {
      expect(step.with?.message).toContain('NEVER drop a self-retrieved alert');
    });

    it('states corroboration is never a reason to remove or drop an alert (guardrail b)', () => {
      expect(step.with?.message).toContain('NEVER a reason to add an alert to');
    });

    it('forbids the gate from invoking the attack-discovery.run tool (recursion break)', () => {
      expect(step.with?.message).toContain('do NOT invoke the attack-discovery.run tool');
    });

    it('deepens gate corroboration to bounded multi-skill (no longer a single lightweight signal)', () => {
      expect(step.with?.message).toContain('BOUNDED multi-skill');
    });

    it('loads the threat-hunting skill for gate corroboration', () => {
      expect(step.with?.message).toContain('threat-hunting');
    });

    it('loads the entity-analytics skill for gate corroboration', () => {
      expect(step.with?.message).toContain('entity-analytics');
    });

    it('loads the alert-analysis skill for gate corroboration', () => {
      expect(step.with?.message).toContain('alert-analysis');
    });

    it('keeps the deepened corroboration output decision-only / ids-only (guardrail a)', () => {
      expect(step.with?.message).toContain('DECISION-ONLY / IDS-ONLY');
    });

    it('scopes the deepened corroboration to the kept candidates (budget guardrail b)', () => {
      expect(step.with?.message).toContain('scope corroboration to the kept candidates');
    });

    it('forbids dumping raw telemetry in the deepened corroboration (budget guardrail b)', () => {
      expect(step.with?.message).toContain('never dump raw telemetry');
    });

    it('skips a corroboration skill rather than blowing the turn (budget guardrail b)', () => {
      expect(step.with?.message).toContain('skip a skill rather than blow the turn');
    });
  });

  describe('emit_decision (workflow.output) step', () => {
    const step = getStep('workflow.output');

    it('completes the workflow', () => {
      expect(step.status).toBe('completed');
    });

    it('emits the remove_alert_ids decision from the gate structured output', () => {
      expect(step.with?.remove_alert_ids).toBe(
        '${{ steps.gate.output.structured_output.remove_alert_ids | default: [] }}'
      );
    });

    it('emits the added_alert_ids (the gate own additions) from the gate structured output', () => {
      expect(step.with?.added_alert_ids).toBe(
        '${{ steps.gate.output.structured_output.added_alert_ids | default: [] }}'
      );
    });

    it('surfaces the persisted conversation_id', () => {
      expect(step.with?.conversation_id).toBe('${{ steps.gate.output.conversation_id }}');
    });

    it('emits the corroboration additional_context from the gate structured output', () => {
      expect(step.with?.additional_context).toBe(
        "${{ steps.gate.output.structured_output.additional_context | default: '' }}"
      );
    });
  });
});

const parsedReport = parse(ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW.yaml) as ParsedWorkflow;

const getReportStep = (type: string): ParsedStep => {
  const step = parsedReport.steps?.find((s) => s.type === type);
  if (!step) {
    throw new Error(`No '${type}' step found in skill report workflow`);
  }
  return step;
};

describe('ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW', () => {
  it('uses the expected workflow id', () => {
    expect(ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW.id).toBe(
      ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID
    );
  });

  it('is registered with the discoveries pluginId', () => {
    expect(ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW.pluginId).toBe('discoveries');
  });

  it('is discoverable from the managed registry by id', () => {
    expect(getManagedWorkflowDefinition(ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID)).toBe(
      ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW
    );
  });

  describe('inputs', () => {
    it('exposes connector_id, conversation_id, and execution_uuid inputs', () => {
      expect(Object.keys(parsedReport.inputs?.properties ?? {}).sort()).toEqual([
        'connector_id',
        'conversation_id',
        'execution_uuid',
      ]);
    });
  });

  describe('render_report (ai.agent) step', () => {
    const step = getReportStep('ai.agent');

    it('continues the existing conversation via the conversation_id input', () => {
      expect(step.with?.conversation_id).toBe('${{ inputs.conversation_id }}');
    });

    it('routes model calls through the connector_id input (Constraint A)', () => {
      expect(step['connector-id']).toBe('${{ inputs.connector_id }}');
    });

    it('does not create a new conversation', () => {
      expect(step['create-conversation']).toBeUndefined();
    });

    it('mentions the attack-discovery-generator skill', () => {
      expect(step.with?.message).toContain('skill://attack-discovery-generator');
    });

    it('drives the status-only path via the get_status tool', () => {
      expect(step.with?.message).toContain('security.attack-discovery.get_status');
    });

    it('passes the execution_uuid to the skill', () => {
      expect(step.with?.message).toContain('{{ inputs.execution_uuid }}');
    });

    it('requests the Missed Detection Closure pass after the report', () => {
      expect(step.with?.message).toContain('Missed Detection Closure');
    });

    it('requests a missed-detection heading for each coverage gap', () => {
      expect(step.with?.message).toContain('## ⚠️ Missed Detection');
    });

    it('drafts a candidate ES|QL detection rule for each gap', () => {
      expect(step.with?.message).toContain('candidate ES|QL detection rule');
    });

    it('runs best-effort raw-log corroboration of the persisted chains', () => {
      expect(step.with?.message).toContain('raw-log corroboration');
    });

    it('pauses at the verbatim create the rule approval gate', () => {
      expect(step.with?.message).toContain('create the rule');
    });

    it('forbids auto-creating detection rules without the create the rule reply', () => {
      expect(step.with?.message).toContain(
        "Do NOT auto-create detection rules without the user's `create the rule` reply"
      );
    });
  });
});

// The persist step (`security.attack-discovery.persistDiscoveries`) skips ad-hoc
// index I/O when `source === 'scheduled'` so scheduled discoveries are written
// only to the scheduled alerts index by the alerting-framework executor. That
// skip relies on each validation workflow forwarding its `source` input into the
// persist step. A workflow that omits it makes scheduled runs leak discoveries
// into the ad-hoc index (where they wrongly appear on the main Attack Discovery
// page), so lock the wiring in for every validation workflow that persists.
describe('validation workflows forward source into the persist step', () => {
  const getPersistStepSourceInput = (
    definition: ManagedWorkflowDefinition & { yaml: string }
  ): unknown => {
    const parsedWorkflow = parse(definition.yaml) as ParsedWorkflow;
    const persistStep = parsedWorkflow.steps?.find(
      ({ type }) => type === 'security.attack-discovery.persistDiscoveries'
    );
    if (!persistStep) {
      throw new Error(`Managed workflow '${definition.id}' has no persistDiscoveries step`);
    }

    return persistStep.with?.source;
  };

  it.each([
    ['default validation', ATTACK_DISCOVERY_VALIDATE_WORKFLOW],
    ['custom validation example', ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW],
  ])('%s wires source into the persist step', (_label, definition) => {
    expect(getPersistStepSourceInput(definition)).toBe('${{ inputs.source }}');
  });
});

// Backs the claim in `definitions/index.ts` that adding the Attack Discovery
// workflows to `managedWorkflowDefinitions` is feature-flag-off safe. Membership
// in the registry only makes a definition *discoverable by id*; it never installs
// or executes anything. Installation is a separate, explicit step performed by the
// owner (discoveries) plugin in `start()`, which reads the
// `securitySolution.attackDiscoveryWorkflowsEnabled` feature flag and skips
// installation when it is off (that FF gating is covered by the discoveries
// plugin's `plugin` tests; `install_static` covers the underlying enabled/disabled
// install behavior). Here we lock in the platform-side half of the contract: the
// entries are inert data.
describe('FF-off safety: AD registry membership is discoverable-by-id and inert', () => {
  const adWorkflows: Array<[string, ManagedWorkflowDefinition & { yaml: string }]> = [
    [ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID, ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW],
    [
      ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
      ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW,
    ],
    [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID, ATTACK_DISCOVERY_GENERATION_WORKFLOW],
    [ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID, ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW],
    [
      ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID,
      ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW,
    ],
    [ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID, ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW],
    [ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID, ATTACK_DISCOVERY_VALIDATE_WORKFLOW],
  ];

  it.each(adWorkflows)(
    '%s is a member of the managed registry, discoverable by id',
    (id, workflow) => {
      expect(managedWorkflowDefinitions).toContain(workflow);
      expect(getManagedWorkflowDefinition(id)).toBe(workflow);
    }
  );

  it.each(adWorkflows)(
    '%s is declarative data only (no side-effect hooks that could run FF-off)',
    (_id, workflow) => {
      // The definition exposes a static `yaml` source and carries no
      // function-valued properties, so importing it or including it in the
      // registry cannot install or execute anything on its own.
      expect(typeof workflow.yaml).toBe('string');

      const functionValuedKeys = Object.keys(workflow).filter(
        (key) => typeof (workflow as Record<string, unknown>)[key] === 'function'
      );
      expect(functionValuedKeys).toEqual([]);
    }
  );
});
