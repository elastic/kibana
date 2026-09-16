/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { z } from '@kbn/zod/v4';
import { managedWorkflowDefinitions } from '.';
import type { ManagedWorkflowTemplateValuesById } from '.';
import {
  ALERTZERO_WORKER_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
  ALERTZERO_WORKER_DETECTION_RULE_CREATION_WORKFLOW_ID,
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
  CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID,
  EXAMPLE_MANAGED_WORKFLOW_ID,
  SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from './definitions';
import ACTION_CLOSE_ALERTS_FP_YAML from './definitions/alertzero/actions/action_close_alerts_false_positive.yaml';
import DARK_CONTINUOUS_THREAT_HUNT_YAML from './definitions/alertzero/dark_continuous_threat_hunt.yaml';
import DETECTION_RULE_CREATION_YAML from './definitions/alertzero/detection_rule_creation.yaml';
import DETECTION_RULE_TUNING_YAML from './definitions/alertzero/detection_rule_tuning.yaml';
import FLOOR_ALERT_TRIAGE_YAML from './definitions/alertzero/floor_alert_triage.yaml';
import FLOOR_ATTACK_DISCOVERY_YAML from './definitions/alertzero/floor_attack_discovery.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from './types';
import { WorkflowSchemaBase } from '../spec/schema';

const ManagedWorkflowSchema = WorkflowSchemaBase.extend({
  triggers: z.array(z.object({ type: z.string().min(1) }).passthrough()).min(1),
});

type RegistryManagedWorkflowDefinition = (typeof managedWorkflowDefinitions)[number];
type TemplateManagedWorkflowDefinition<TDefinition> = TDefinition extends {
  yamlTemplate: (values: infer _TValues) => string;
}
  ? TDefinition
  : never;
type RegistryTemplateManagedWorkflowDefinition =
  TemplateManagedWorkflowDefinition<RegistryManagedWorkflowDefinition>;
type YamlTemplateManagedWorkflowDefinition = ManagedWorkflowDefinition & {
  yamlTemplate: (values: ManagedWorkflowTemplateValues) => string;
};

const templateRepresentativeValuesById: ManagedWorkflowTemplateValuesById = {
  [EXAMPLE_MANAGED_WORKFLOW_ID]: {
    recipient: 'World',
  },
  [CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID]: {
    aiIndexId: 'my-ai-index',
    intervalMinutes: 1440,
  },
  [ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
    autoCloseConfidenceScoreMinThreshold: 0.85,
  },
  [ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
    scheduleInterval: '24h',
  },
  [ALERTZERO_WORKER_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
  },
  [ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
    scheduleInterval: '2h',
  },
  [ALERTZERO_WORKER_DETECTION_RULE_CREATION_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
  },
  [SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID]: {
    detectionIntervalMinutes: 30,
    detectionBucketIntervalMinutes: 1,
    detectionLookbackMinutes: 40,
    targetCoverageMinutes: 30,
  },
  [SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID]: {
    reviewIntervalMinutes: 10,
    discoveryBatchSize: 3,
    maxReviewPasses: 3,
    flakyRuleDetectionThreshold: 10,
    flakyRuleProbeAfterMinutes: 360,
    flakyRuleExemptSeverityScore: 80,
  },
};

const templateValuesLookup = templateRepresentativeValuesById as Record<
  string,
  ManagedWorkflowTemplateValues | undefined
>;

const managedDefinitionsById: Array<[string, RegistryManagedWorkflowDefinition]> =
  managedWorkflowDefinitions.map((definition) => [definition.id, definition]);
const managedTemplateDefinitionsById: Array<[string, RegistryTemplateManagedWorkflowDefinition]> =
  managedDefinitionsById.filter(
    (definitionEntry): definitionEntry is [string, RegistryTemplateManagedWorkflowDefinition] =>
      hasYamlTemplate(definitionEntry[1])
  );

function hasYamlTemplate(
  definition: ManagedWorkflowDefinition
): definition is YamlTemplateManagedWorkflowDefinition {
  return typeof definition.yamlTemplate === 'function';
}

function hasYaml(
  definition: ManagedWorkflowDefinition
): definition is ManagedWorkflowDefinition & { yaml: string } {
  return typeof definition.yaml === 'string';
}

function renderWorkflowYaml(definition: ManagedWorkflowDefinition): string {
  const { id } = definition;

  if (hasYaml(definition)) {
    return definition.yaml;
  }

  if (!hasYamlTemplate(definition)) {
    throw new Error(`Managed workflow '${id}' must define either yaml or yamlTemplate`);
  }

  const representativeValues = templateValuesLookup[definition.id];
  if (!representativeValues) {
    throw new Error(
      `Missing representative template values for managed workflow '${definition.id}'. Add an entry to templateRepresentativeValuesById.`
    );
  }

  return definition.yamlTemplate(representativeValues);
}

/** Matches the `__SCREAMING_SNAKE__` placeholders that yamlTemplate definitions substitute. */
const UNREPLACED_TOKEN_PATTERN = /__[A-Z][A-Z0-9_]*__/g;

function createContentFingerprint(content: string): string {
  let fingerprint = 0;
  for (const character of content) {
    fingerprint = (fingerprint * 31 + character.charCodeAt(0)) % 0xffffffff;
  }
  return fingerprint.toString(16).padStart(8, '0');
}

it.each([
  [ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID, FLOOR_ALERT_TRIAGE_YAML, '4:e8bc7059'],
  [ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID, FLOOR_ATTACK_DISCOVERY_YAML, '2:d13818a0'],
  [
    ALERTZERO_WORKER_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
    DARK_CONTINUOUS_THREAT_HUNT_YAML,
    '2:de85a75a',
  ],
  [ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID, DETECTION_RULE_TUNING_YAML, '4:b1cbd09c'],
  [
    ALERTZERO_WORKER_DETECTION_RULE_CREATION_WORKFLOW_ID,
    DETECTION_RULE_CREATION_YAML,
    '1:a6804a44',
  ],
] as const)(
  'requires bumping %s definition.version together with the imported YAML fingerprint',
  (workflowId, importedYaml, expectedFingerprint) => {
    const definition = managedWorkflowDefinitions.find(({ id }) => id === workflowId);
    if (!definition) throw new Error(`Managed worker "${workflowId}" is not registered`);
    const actualFingerprint = `${definition.version}:${createContentFingerprint(importedYaml)}`;
    if (actualFingerprint === expectedFingerprint) {
      return;
    }
    throw new Error(
      `Imported YAML for '${workflowId}' changed (${actualFingerprint}, expected ${expectedFingerprint}). ` +
        `yamlTemplate hashing covers only the function source, not this imported string, so already-installed spaces will not receive the edit until definition.version is bumped. ` +
        `Bump version in the worker module and update this expected fingerprint in the same change.`
    );
  }
);

function assertWorkflowYamlIsValid(workflowId: string, yamlContent: string): void {
  let parsedYaml: unknown;
  try {
    parsedYaml = parse(yamlContent);
  } catch (error) {
    throw new Error(
      `Managed workflow '${workflowId}' has invalid YAML: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const validationResult = ManagedWorkflowSchema.safeParse(parsedYaml);
  if (!validationResult.success) {
    throw new Error(
      `Managed workflow '${workflowId}' failed workflow schema validation: ${validationResult.error.message}`
    );
  }
}

describe('managedWorkflowDefinitions', () => {
  it('contains unique workflow ids', () => {
    const ids = managedWorkflowDefinitions.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains the Security alert analysis workflow', () => {
    const ids = managedWorkflowDefinitions.map(({ id }) => id);
    expect(ids).toContain(SECURITY_ALERT_ANALYSIS_WORKFLOW_ID);
  });

  it.each(managedDefinitionsById)('%s uses the reserved system- id prefix', (id) => {
    expect(id.startsWith('system-')).toBe(true);
  });

  it.each(managedDefinitionsById)('%s declares an explicit pluginId', (_id, definition) => {
    expect(typeof definition.pluginId).toBe('string');
    expect(definition.pluginId.trim()).not.toHaveLength(0);
  });

  it.each(managedDefinitionsById)(
    '%s declares a version that is a positive integer',
    (_id, definition) => {
      expect(typeof definition.version).toBe('number');
      expect(Number.isInteger(definition.version)).toBe(true);
      expect(definition.version).toBeGreaterThanOrEqual(1);
    }
  );

  it.each(managedDefinitionsById)('%s declares whether it is billable', (_id, definition) => {
    expect(typeof definition.billable).toBe('boolean');
  });

  it.each(managedDefinitionsById)(
    '%s defines exactly one source field: yaml xor yamlTemplate',
    (_id, definition) => {
      const hasYamlField = hasYaml(definition);
      const hasYamlTemplateField = hasYamlTemplate(definition);

      expect(hasYamlField || hasYamlTemplateField).toBe(true);
      expect(hasYamlField && hasYamlTemplateField).toBe(false);
    }
  );

  it('defines representative template values for every yamlTemplate workflow', () => {
    const templatedIds = managedTemplateDefinitionsById.map(([id]) => id).sort();
    const representedIds = Object.keys(templateRepresentativeValuesById).sort();

    expect(representedIds).toEqual(templatedIds);
  });

  it.each(managedDefinitionsById)(
    '%s parses and validates as a workflow definition',
    (id, definition) => {
      const renderedYaml = renderWorkflowYaml(definition);
      assertWorkflowYamlIsValid(id, renderedYaml);
    }
  );

  it.each(managedTemplateDefinitionsById)(
    '%s yamlTemplate renders cleanly with representative values',
    (id, definition) => {
      const renderedYaml = renderWorkflowYaml(definition);

      expect(typeof renderedYaml).toBe('string');
      expect(renderedYaml.trim()).not.toHaveLength(0);
      expect(renderedYaml).not.toContain('undefined');
      // A token the template map never replaces stays behind as a valid YAML
      // string, so it survives schema validation and ships a workflow pointing
      // at the literal placeholder. Only a mismatch between the yaml text and
      // the token keys can cause this, and nothing else would catch it.
      expect(renderedYaml.match(UNREPLACED_TOKEN_PATTERN) ?? []).toEqual([]);
      assertWorkflowYamlIsValid(id, renderedYaml);
    }
  );
});

// =============================================================================
// PR 4: Alert Analysis Worker pipeline structural tests
//
// These tests assert YAML structure, not runtime behaviour. A managed workflow
// cannot be executed inside Jest, so the assertions below encode WHY the
// structure matters so that a future edit that breaks the invariant fails
// loudly with a named reason — not silently during a 72 h gate wait.
// =============================================================================

describe('Alert Triage Worker pipeline (floor_alert_triage.yaml)', () => {
  let renderedYaml: ReturnType<typeof parse>;

  beforeAll(() => {
    const definition = managedWorkflowDefinitions.find(
      ({ id }) => id === ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID
    );
    if (!definition) throw new Error('Alert Triage Worker definition not found in registry');
    const rendered = renderWorkflowYaml(definition);
    renderedYaml = parse(rendered);
  });

  // ---------------------------------------------------------------------------
  // Test 1: No-FP branch structure
  //
  // A batch that classifies nothing as a false positive must still write the
  // conclusion and close the Investigation. The conclusion step and the no-FP
  // close step must be siblings of the autonomy gate, not nested inside it.
  //
  // Limit: this asserts structure only. Runtime coverage ("given zero FP
  // classifications, no proposal is created and the Investigation closes") lives
  // in the manual desk-test and in #290740's Scout API spec.
  // ---------------------------------------------------------------------------
  it('conclusion metadata-patch and no-FP close are siblings of the autonomy gate, not nested inside it', () => {
    const steps: Array<{ name: string; type?: string }> = renderedYaml.steps ?? [];
    const stepNames = steps.map((s) => s.name);

    // The conclusion must exist at the top level of steps
    expect(stepNames).toContain('write_conclusion');

    // The no-FP close must exist at the top level of steps
    expect(stepNames).toContain('close_investigation_no_fp');

    // The gate must also exist at the top level (not nested inside another branch)
    expect(stepNames).toContain('gate_fp_close');

    // write_conclusion must come BEFORE gate_fp_close (ordering is load-bearing:
    // the gate parks the Worker for up to 72 h; the conclusion must be visible
    // to the analyst while the proposal is pending)
    const conclusionIdx = stepNames.indexOf('write_conclusion');
    const gateIdx = stepNames.indexOf('gate_fp_close');
    expect(conclusionIdx).toBeLessThan(gateIdx);

    // close_investigation_no_fp must be a top-level `if` step (not inside gate_fp_close)
    const noFpStep = steps.find((s) => s.name === 'close_investigation_no_fp');
    expect(noFpStep?.type).toBe('if');

    // The gate_fp_close condition must reference fp_candidate_ids, proving
    // the proposal step is guarded by a non-empty FP set
    const gateStep = steps.find((s) => s.name === 'gate_fp_close') as { condition?: string };
    expect(gateStep?.condition).toMatch(/fp_candidate_ids/);
  });

  // ---------------------------------------------------------------------------
  // Test 2: Autonomy → autoApprove mapping
  //
  // The mapping must live in exactly one place in the YAML so P17's closure
  // is a single line change, and so a future editor cannot accidentally
  // fork the mapping into multiple sites. This test checks the YAML source
  // (not runtime Liquid evaluation — that requires a full workflow engine).
  //
  // Expected mapping per the epic (which overrides D15 / Triage Watch catalog):
  //   manual     → autoApprove: false  (Liquid: autonomy == 'assisted' is false)
  //   supervised → autoApprove: false  (fail-closed MVP; D37/P17 still open)
  //   assisted   → autoApprove: true   (Liquid: autonomy == 'assisted' is true)
  // ---------------------------------------------------------------------------
  it('autoApprove expression is present in the gate step and maps assisted → true, all others → false', () => {
    const gateSteps: Array<{
      name: string;
      type?: string;
      steps?: Array<{ name: string; with?: { inputs?: { autoApprove?: unknown } } }>;
    }> = renderedYaml.steps ?? [];
    const gateIfStep = gateSteps.find((s) => s.name === 'gate_fp_close');

    const proposalStep = gateIfStep?.steps?.find((s) => s.name === 'create_fp_proposal');
    const autoApproveExpr = proposalStep?.with?.inputs?.autoApprove;

    // The expression must exist and reference autonomy
    expect(String(autoApproveExpr)).toMatch(/autonomy/);

    // The expression must only appear once in the whole YAML (one mapping site)
    const rendered = renderWorkflowYaml(
      managedWorkflowDefinitions.find(
        ({ id }) => id === ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID
      )!
    );
    const siteCount = (rendered.match(/autonomy == 'assisted'/g) ?? []).length;
    expect(siteCount).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Test 3: Action workflow contract
  //
  // All four requirements from the agentic_investigations README. Every one of
  // them fails at runtime rather than at type-check, which is why they are
  // worth a structural test.
  // ---------------------------------------------------------------------------
  describe('action_close_alerts_false_positive.yaml contract', () => {
    let actionYaml: ReturnType<typeof parse>;

    beforeAll(() => {
      actionYaml = parse(ACTION_CLOSE_ALERTS_FP_YAML);
    });

    it('carries the action tag (required for catalog discovery)', () => {
      expect(actionYaml.tags).toContain('action');
    });

    it('declares consts.actionMetadata (required for proposal rendering)', () => {
      expect(actionYaml.consts?.actionMetadata).toBeDefined();
      expect(typeof actionYaml.consts.actionMetadata.name).toBe('string');
      expect(typeof actionYaml.consts.actionMetadata.category).toBe('string');
      expect(typeof actionYaml.consts.actionMetadata.impact).toBe('string');
      expect(typeof actionYaml.consts.actionMetadata.reversible).toBe('boolean');
    });

    it('takes exactly one top-level actionInput input (not top-level fields)', () => {
      // The gate passes exactly one key. An action with top-level `alertIds` etc.
      // receives none of them — the single `actionInput` object is the contract.
      const trigger = actionYaml.triggers?.[0];
      const inputProps = trigger?.inputs?.properties ?? {};
      const inputKeys = Object.keys(inputProps);

      expect(inputKeys).toEqual(['actionInput']);
      expect(inputProps.actionInput.type).toBe('object');
      expect(trigger?.inputs?.required).toContain('actionInput');
    });

    it('ends in workflow.output (required for caller result verification)', () => {
      const steps: Array<{ name: string; type: string }> = actionYaml.steps ?? [];
      const lastStep = steps[steps.length - 1];

      expect(lastStep?.type).toBe('workflow.output');
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Gate timeout fallback
  //
  // A 72 h gate timeout surfaces as a step failure in the parent (not a branch).
  // The Worker must declare an on-failure fallback on the gate's workflow.execute
  // that patches the Investigation closed so the analyst sees a legible terminal
  // state rather than a perpetually open Investigation (criterion 11).
  // ---------------------------------------------------------------------------
  it('gate workflow.execute declares an on-failure fallback that patches the Investigation closed', () => {
    const steps: Array<{ name: string; type?: string; steps?: unknown[] }> = renderedYaml.steps;
    const gateIfStep = steps.find((s) => s.name === 'gate_fp_close') as {
      steps?: Array<{
        name: string;
        type?: string;
        'on-failure'?: { fallback?: Array<{ name: string; type: string }> };
      }>;
    };

    expect(gateIfStep).toBeDefined();

    const proposalStep = gateIfStep?.steps?.find((s) => s.name === 'create_fp_proposal');
    expect(proposalStep).toBeDefined();

    const fallback = (proposalStep as { 'on-failure'?: { fallback?: unknown[] } })?.['on-failure']
      ?.fallback;
    expect(Array.isArray(fallback)).toBe(true);
    expect((fallback as unknown[]).length).toBeGreaterThan(0);

    // The fallback must patch the Investigation closed so the analyst does not
    // see an open Investigation with no pending action after a 72 h expiry.
    const closePatch = (
      fallback as Array<{ name: string; type: string; with?: { updates?: { status?: string } } }>
    ).find((step) => step.type === 'ai.conversation.metadata.patch');
    expect(closePatch).toBeDefined();
    expect(closePatch?.with?.updates?.status).toBe('closed');
  });
});
