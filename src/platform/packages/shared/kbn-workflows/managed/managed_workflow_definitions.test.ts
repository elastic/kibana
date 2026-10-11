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
  ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
  ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
  ALERTZERO_ACTION_SET_ASSET_CRITICALITY_WORKFLOW_ID,
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID,
  ALERTZERO_ACTION_WORKFLOW_IDS,
  ALERTZERO_ALERT_TRIAGE_WORKFLOW_IDS,
  ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS,
  ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_FORENSICS_WORKFLOW_IDS,
  ALERTZERO_HUNT_CHILD_WORKFLOW_IDS,
  ALERTZERO_MANAGED_WORKER_WORKFLOW_IDS,
  ALERTZERO_RULE_WORKFLOW_IDS,
  ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID,
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
  CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID,
  EXAMPLE_MANAGED_WORKFLOW_ID,
  EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID,
  SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from './definitions';
import ACTION_ISOLATE_HOST_YAML from './definitions/alertzero/actions/defend/action_isolate_host.yaml';
import ACTION_KILL_PROCESS_YAML from './definitions/alertzero/actions/defend/action_kill_process.yaml';
import ACTION_SUSPEND_PROCESS_YAML from './definitions/alertzero/actions/defend/action_suspend_process.yaml';
import ACTION_SET_ASSET_CRITICALITY_YAML from './definitions/alertzero/actions/identity/action_set_asset_criticality.yaml';
import DETECTION_RULE_COVERAGE_YAML from './definitions/alertzero/detection_rule_coverage.yaml';
import DETECTION_RULE_TUNING_YAML from './definitions/alertzero/detection_rule_tuning.yaml';
import FLOOR_ALERT_TRIAGE_YAML from './definitions/alertzero/floor_alert_triage.yaml';
import FLOOR_ALERT_TRIAGE_REVIEW_YAML from './definitions/alertzero/floor_alert_triage_review.yaml';
import FLOOR_ATTACK_DISCOVERY_YAML from './definitions/alertzero/floor_attack_discovery.yaml';
import FORENSICS_ENDPOINT_ANALYSIS_YAML from './definitions/alertzero/forensics_endpoint_analysis.yaml';
import FORENSICS_RUN_ENDPOINT_ANALYSIS_YAML from './definitions/alertzero/forensics_run_endpoint_analysis.yaml';
import HUNT_CONTINUOUS_THREAT_HUNT_YAML from './definitions/alertzero/hunt_continuous_threat_hunt.yaml';
import {
  ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS,
  ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS,
  CONTINUOUS_THREAT_HUNT_WORKER_SETTINGS_DEFAULTS,
  ENDPOINT_ANALYSIS_WORKER_SETTINGS_DEFAULTS,
  RULE_COVERAGE_WORKER_SETTINGS_DEFAULTS,
  RULE_TUNING_WORKER_SETTINGS_DEFAULTS,
  type WorkerSettingsDefaults,
} from './definitions/alertzero/worker_settings_defaults';
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
  [EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID]: { serviceAccountId: 'example-account' },
  [EXAMPLE_MANAGED_WORKFLOW_ID]: {
    recipient: 'World',
  },
  [CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID]: {
    aiIndexId: 'my-ai-index',
    intervalMinutes: 1440,
  },
  [ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID]: {
    settingsVersion: 2,
    autonomyLevel: 'manual',
    extras: { autoCloseConfidenceScoreMinThreshold: 0.85 },
  },
  [ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
    scheduleInterval: '24h',
  },
  [ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
  },
  [ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
    scheduleInterval: '4h',
  },
  [ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
    scheduleInterval: '2h',
    extras: { analysisWindowDays: 7, fpCountThreshold: 10, fpRateThresholdPct: 50 },
  },
  [ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
    scheduleInterval: '1h',
    extras: { lookbackDays: 14, maxGapsPerRun: 5 },
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

const alertZeroWorkflowIds = new Set<string>([
  ...ALERTZERO_MANAGED_WORKER_WORKFLOW_IDS,
  ...ALERTZERO_RULE_WORKFLOW_IDS,
  ...ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS,
  ...ALERTZERO_FORENSICS_WORKFLOW_IDS,
  ...ALERTZERO_ALERT_TRIAGE_WORKFLOW_IDS,
  ...ALERTZERO_ACTION_WORKFLOW_IDS,
]);

const alertZeroDefinitionsById = managedDefinitionsById.filter(([id]) =>
  alertZeroWorkflowIds.has(id)
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

/**
 * What the platform's `yamlTemplate` hash cannot see but the render depends on: the imported YAML
 * and, for AlertZero Workers, the settings defaults their renderer fills stored values from.
 */
const renderInputs = (importedYaml: string, defaults?: WorkerSettingsDefaults): string =>
  defaults === undefined ? importedYaml : `${importedYaml}\n${JSON.stringify(defaults)}`;

it.each([
  [
    ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
    renderInputs(FLOOR_ALERT_TRIAGE_YAML, ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS),
    '13:ee8cf0d1',
  ],
  [ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID, FLOOR_ALERT_TRIAGE_REVIEW_YAML, '3:b59aafc3'],
  [
    ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
    renderInputs(FLOOR_ATTACK_DISCOVERY_YAML, ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS),
    '7:81e93c9b',
  ],
  [
    ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
    renderInputs(FORENSICS_ENDPOINT_ANALYSIS_YAML, ENDPOINT_ANALYSIS_WORKER_SETTINGS_DEFAULTS),
    '5:ca69d574',
  ],
  [
    ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
    FORENSICS_RUN_ENDPOINT_ANALYSIS_YAML,
    '6:73c35d66',
  ],
  [
    ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
    renderInputs(HUNT_CONTINUOUS_THREAT_HUNT_YAML, CONTINUOUS_THREAT_HUNT_WORKER_SETTINGS_DEFAULTS),
    '4:432a8ccd',
  ],
  [
    ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
    renderInputs(DETECTION_RULE_TUNING_YAML, RULE_TUNING_WORKER_SETTINGS_DEFAULTS),
    '11:8f08f83c',
  ],
  [
    ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID,
    renderInputs(DETECTION_RULE_COVERAGE_YAML, RULE_COVERAGE_WORKER_SETTINGS_DEFAULTS),
    '4:d2801f59',
  ],
  [ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID, ACTION_ISOLATE_HOST_YAML, '3:46476397'],
  [ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID, ACTION_KILL_PROCESS_YAML, '3:968a7ee7'],
  [ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID, ACTION_SUSPEND_PROCESS_YAML, '3:149afbb2'],
  [
    ALERTZERO_ACTION_SET_ASSET_CRITICALITY_WORKFLOW_ID,
    ACTION_SET_ASSET_CRITICALITY_YAML,
    '1:3cd8044e',
  ],
] as const)(
  'requires bumping %s definition.version together with the fingerprint of its render inputs',
  (workflowId, inputs, expectedFingerprint) => {
    const definition = managedWorkflowDefinitions.find(({ id }) => id === workflowId);
    if (!definition) throw new Error(`Managed worker "${workflowId}" is not registered`);
    const actualFingerprint = `${definition.version}:${createContentFingerprint(inputs)}`;
    if (actualFingerprint === expectedFingerprint) {
      return;
    }
    throw new Error(
      `Render inputs for '${workflowId}' changed (${actualFingerprint}, expected ${expectedFingerprint}). ` +
        `yamlTemplate hashing covers only the function source, not the imported YAML or the settings defaults in worker_settings_defaults.ts, so already-installed spaces will not receive the edit until definition.version is bumped. ` +
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

const AI_AGENT_STEP_TYPE = 'ai.agent';
/** Attack Discovery's custom LLM step, which names its tier as a `with.feature_id` input. */
const ATTACK_DISCOVERY_RUN_STEP_TYPE = 'security.attack-discovery.run';
const CONNECTOR_ID_BY_FEATURE = 'connector-id-by-feature';
const FEATURE_ID = 'feature_id';
const PLUGIN_ID = 'plugin-id';
const AGGREGATE_BY = 'aggregate-by';
/** Mirrors ALERTZERO_INFERENCE_PARENT_FEATURE_ID; @kbn/alertzero-common is not a dependency here. */
const ALERTZERO_ROLLUP_ID = 'alertzero_parent';
/**
 * Mirrors the three ALERTZERO_*_INFERENCE_FEATURE_IDs, for the same reason as the rollup id above.
 * Matching the exact set matters: an unregistered id resolves to the deployment default at runtime
 * exactly as an absent one does, so accepting any string would let a typo through the guard.
 */
const ALERTZERO_TIER_IDS = new Set(['alertzero_fast', 'alertzero_reasoning', 'alertzero_agentic']);

/**
 * Collects steps of a given type from anywhere in a parsed workflow, walking the whole tree rather
 * than the step containers known today so nesting added later (`foreach`, `if`/`else`, `parallel`
 * branches, `switch` cases) is covered without touching this.
 */
function collectStepsOfType(
  stepType: string,
  node: unknown,
  collected: Array<Record<string, unknown>> = []
): Array<Record<string, unknown>> {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectStepsOfType(stepType, item, collected);
    }
    return collected;
  }

  if (node !== null && typeof node === 'object') {
    const candidate = node as Record<string, unknown>;
    if (candidate.type === stepType) {
      collected.push(candidate);
    }
    for (const value of Object.values(candidate)) {
      collectStepsOfType(stepType, value, collected);
    }
  }

  return collected;
}

/** The tier a step names, whether it is an `ai.agent` field or a custom step's `with` input. */
function getNamedTier(step: Record<string, unknown>, field: string): unknown {
  if (field in step) {
    return step[field];
  }
  const withInputs = step.with;
  return withInputs !== null && typeof withInputs === 'object'
    ? (withInputs as Record<string, unknown>)[field]
    : undefined;
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

  describe('Hunt Watch: registry-wide checks', () => {
    // Every managed definition, rendered once (yamlTemplate ones with their representative
    // values), parsed for its top-level `tags`. Reused by both checks below so a templated
    // definition is rendered only once for this whole block.
    const parsedDefinitions = managedWorkflowDefinitions.map((definition) => ({
      id: definition.id,
      parsed: parse(renderWorkflowYaml(definition)) as {
        tags?: string[];
        steps?: Array<{
          type?: string;
          with?: { 'workflow-id'?: string };
          steps?: Array<{ type?: string; with?: { 'workflow-id'?: string } }>;
        }>;
      },
    }));

    it('registers all four hunt child ids exactly once', () => {
      const ids = managedWorkflowDefinitions.map(({ id }) => id);

      for (const childId of ALERTZERO_HUNT_CHILD_WORKFLOW_IDS) {
        expect(ids.filter((id) => id === childId)).toEqual([childId]);
      }
    });

    // The tagged Worker is the only `watch-hunt` definition in the whole
    // registry, not just among the four hunt children -- a second
    // definition carrying it would make the Watch UI list two Workers for one feature.
    it('tags only the tagged Worker as watch-hunt', () => {
      const taggedWatchHunt = parsedDefinitions.filter((definition) =>
        (definition.parsed.tags ?? []).includes('watch-hunt')
      );

      expect(taggedWatchHunt.map((definition) => definition.id)).toEqual([
        ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
      ]);
    });

    // Proves the Worker's own workflow.execute/executeAsync targets are real, not just that
    // the four hunt ids exist somewhere -- a typo'd workflow-id string would otherwise only
    // fail at runtime, on the first sweep that reaches that step.
    it("resolves every workflow.execute/executeAsync id the Worker's rendered YAML references", () => {
      const worker = parsedDefinitions.find(
        (definition) => definition.id === ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID
      );
      const registeredIds = new Set<string>(managedWorkflowDefinitions.map(({ id }) => id));
      const referencedIds = (worker?.parsed.steps ?? [])
        .flatMap((step) => step.steps ?? [step])
        .filter((step) => step.type === 'workflow.execute' || step.type === 'workflow.executeAsync')
        .map((step) => step.with?.['workflow-id'])
        .filter((id): id is string => typeof id === 'string');

      expect(referencedIds.length).toBeGreaterThan(0);
      expect(referencedIds.filter((id) => !registeredIds.has(id))).toEqual([]);
    });
  });

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

  // An ai.agent step naming no model is accepted by the schema and runs on whatever the
  // deployment-wide default is, so the operator's tier choice is silently ignored and nothing
  // else fails. Requiring the pin here is deliberately stricter than the schema: a step that
  // genuinely must take its connector elsewhere has to change this test, which puts the
  // exception in front of a reviewer instead of leaving it invisible.
  it.each(alertZeroDefinitionsById)(
    '%s resolves every ai.agent step through an inference feature',
    (id, definition) => {
      const aiAgentSteps = collectStepsOfType(
        AI_AGENT_STEP_TYPE,
        parse(renderWorkflowYaml(definition))
      );
      const unpinnedStepNames = aiAgentSteps
        .filter((step) => !ALERTZERO_TIER_IDS.has(step[CONNECTOR_ID_BY_FEATURE] as string))
        .map((step) => (typeof step.name === 'string' ? step.name : '<unnamed>'));

      expect(unpinnedStepNames).toEqual([]);
    }
  );

  // Attack Discovery's LLM call is a custom step rather than `ai.agent`, so the guard above cannot
  // see it: it names its tier as a `with.feature_id` input. Dropping or mistyping that input fails
  // exactly as silently, and puts scheduled Attack Discovery back on the deployment-wide default.
  it.each(alertZeroDefinitionsById)(
    '%s resolves every Attack Discovery run step through an inference feature',
    (id, definition) => {
      const runSteps = collectStepsOfType(
        ATTACK_DISCOVERY_RUN_STEP_TYPE,
        parse(renderWorkflowYaml(definition))
      );
      const unpinnedStepNames = runSteps
        .filter((step) => !ALERTZERO_TIER_IDS.has(getNamedTier(step, FEATURE_ID) as string))
        .map((step) => (typeof step.name === 'string' ? step.name : '<unnamed>'));

      expect(unpinnedStepNames).toEqual([]);
    }
  );

  // Same failure mode as the tier pin: a step with no plugin-id falls back to the default Agent
  // Builder attribution, so its spend leaves AlertZero's rollup without anything failing.
  it.each(alertZeroDefinitionsById)(
    '%s attributes every ai.agent step to a Worker and the AlertZero rollup',
    (id, definition) => {
      const aiAgentSteps = collectStepsOfType(
        AI_AGENT_STEP_TYPE,
        parse(renderWorkflowYaml(definition))
      );
      const unattributedStepNames = aiAgentSteps
        .filter(
          (step) =>
            typeof step[PLUGIN_ID] !== 'string' || step[AGGREGATE_BY] !== ALERTZERO_ROLLUP_ID
        )
        .map((step) => (typeof step.name === 'string' ? step.name : '<unnamed>'));

      expect(unattributedStepNames).toEqual([]);
    }
  );
});
