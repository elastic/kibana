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
import { getManagedWorkflowHashedYaml, managedWorkflowDefinitions } from '.';
import {
  ALERTZERO_ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_WORKFLOW_ID,
  ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
  ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID,
  ALERTZERO_ACTION_WORKFLOW_IDS,
  ALERTZERO_ALERT_TRIAGE_WORKFLOW_IDS,
  ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS,
  ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW_ID,
  ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW_ID,
  ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW_ID,
  ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW_ID,
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_FORENSICS_WORKFLOW_IDS,
  ALERTZERO_MANAGED_WORKER_WORKFLOW_IDS,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
  ALERTZERO_RULE_WORKFLOW_IDS,
  ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID,
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
} from './definitions';
import ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_YAML from './definitions/alertzero/actions/action_close_attack_discovery_investigation.yaml';
import ACTION_ISOLATE_HOST_YAML from './definitions/alertzero/actions/defend/action_isolate_host.yaml';
import ACTION_KILL_PROCESS_YAML from './definitions/alertzero/actions/defend/action_kill_process.yaml';
import ACTION_SUSPEND_PROCESS_YAML from './definitions/alertzero/actions/defend/action_suspend_process.yaml';
import CLOSE_ATTACK_AND_ALERTS_YAML from './definitions/alertzero/close_attack_and_alerts.yaml';
import DETECTION_RULE_COVERAGE_YAML from './definitions/alertzero/detection_rule_coverage.yaml';
import DETECTION_RULE_TUNING_YAML from './definitions/alertzero/detection_rule_tuning.yaml';
import FLOOR_ALERT_TRIAGE_YAML from './definitions/alertzero/floor_alert_triage.yaml';
import FLOOR_ALERT_TRIAGE_BATCH_YAML from './definitions/alertzero/floor_alert_triage_batch.yaml';
import FLOOR_ALERT_TRIAGE_REVIEW_YAML from './definitions/alertzero/floor_alert_triage_review.yaml';
import FLOOR_ATTACK_DISCOVERY_YAML from './definitions/alertzero/floor_attack_discovery.yaml';
import FORENSICS_CLOSE_INVESTIGATION_GATE_YAML from './definitions/alertzero/forensics_close_investigation_gate.yaml';
import FORENSICS_ENDPOINT_ANALYSIS_YAML from './definitions/alertzero/forensics_endpoint_analysis.yaml';
import FORENSICS_PROPOSAL_GATE_YAML from './definitions/alertzero/forensics_proposal_gate.yaml';
import FORENSICS_RUN_ENDPOINT_ANALYSIS_YAML from './definitions/alertzero/forensics_run_endpoint_analysis.yaml';
import RULE_TUNING_WORKER_YAML from './definitions/alertzero/rule_tuning_worker.yaml';
import {
  ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS,
  ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS,
  ENDPOINT_ANALYSIS_WORKER_SETTINGS_DEFAULTS,
  RULE_COVERAGE_WORKER_SETTINGS_DEFAULTS,
  RULE_TUNING_WORKER_SETTINGS_DEFAULTS,
  type WorkerSettingsDefaults,
} from './definitions/alertzero/worker_settings_defaults';
import type {
  ManagedWorkflowDefinition,
  ManagedWorkflowTemplateValues,
  ManagedYamlTemplate,
} from './types';
import { WorkflowSchemaBase } from '../spec/schema';

const ManagedWorkflowSchema = WorkflowSchemaBase.extend({
  triggers: z.array(z.object({ type: z.string().min(1) }).passthrough()).min(1),
});

type RegistryManagedWorkflowDefinition = (typeof managedWorkflowDefinitions)[number];
type TemplateManagedWorkflowDefinition<TDefinition> = TDefinition extends {
  yamlTemplate: { render: (values: infer _TValues) => string };
}
  ? TDefinition
  : never;
type RegistryTemplateManagedWorkflowDefinition =
  TemplateManagedWorkflowDefinition<RegistryManagedWorkflowDefinition>;
type YamlTemplateManagedWorkflowDefinition = ManagedWorkflowDefinition & {
  yamlTemplate: ManagedYamlTemplate<ManagedWorkflowTemplateValues>;
};

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

const alertZeroWorkerWorkflowIds = new Set<string>(ALERTZERO_MANAGED_WORKER_WORKFLOW_IDS);

const alertZeroWorkerDefinitionsById = managedDefinitionsById.filter(([id]) =>
  alertZeroWorkerWorkflowIds.has(id)
);

function hasYamlTemplate(
  definition: ManagedWorkflowDefinition
): definition is YamlTemplateManagedWorkflowDefinition {
  return definition.yamlTemplate !== undefined;
}

function hasYaml(
  definition: ManagedWorkflowDefinition
): definition is ManagedWorkflowDefinition & { yaml: string } {
  return typeof definition.yaml === 'string';
}

function renderWorkerYamlWithoutServiceAccount(definition: ManagedWorkflowDefinition): string {
  if (!hasYamlTemplate(definition)) {
    throw new Error(`AlertZero Worker '${definition.id}' must define a yamlTemplate`);
  }

  const {
    yamlTemplate: { hashValues, render },
  } = definition;
  const { serviceAccountId: _serviceAccountId, ...valuesWithoutAccount } = hashValues;
  return render({ ...valuesWithoutAccount, autonomyLevel: 'manual' });
}

const RUN_AS_SETTING_PATTERN = /^\s*run_as:/m;

/** Matches the `__SCREAMING_SNAKE__` placeholders that yamlTemplate definitions substitute. */
const UNREPLACED_TOKEN_PATTERN = /__[A-Z][A-Z0-9_]*__/g;

function assertTemplateRendersCleanly(workflowId: string, renderedYaml: string): void {
  expect(typeof renderedYaml).toBe('string');
  expect(renderedYaml.trim()).not.toHaveLength(0);
  expect(renderedYaml).not.toContain('undefined');
  // A token the template map never replaces stays behind as a valid YAML
  // string, so it survives schema validation and ships a workflow pointing
  // at the literal placeholder. Only a mismatch between the yaml text and
  // the token keys can cause this, and nothing else would catch it.
  expect(renderedYaml.match(UNREPLACED_TOKEN_PATTERN) ?? []).toEqual([]);
  assertWorkflowYamlIsValid(workflowId, renderedYaml);
}

function createContentFingerprint(content: string): string {
  let fingerprint = 0;
  for (const character of content) {
    fingerprint = (fingerprint * 31 + character.charCodeAt(0)) % 0xffffffff;
  }
  return fingerprint.toString(16).padStart(8, '0');
}

/**
 * What AlertZero bumps a definition's `version` for: its YAML and, for AlertZero Workers, the
 * settings defaults their renderer fills stored values from.
 */
const renderInputs = (importedYaml: string, defaults?: WorkerSettingsDefaults): string =>
  defaults === undefined ? importedYaml : `${importedYaml}\n${JSON.stringify(defaults)}`;

it.each([
  [
    ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
    renderInputs(FLOOR_ALERT_TRIAGE_YAML, ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS),
    '18:1ec301f5',
  ],
  [ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW_ID, FLOOR_ALERT_TRIAGE_BATCH_YAML, '13:8948d29b'],
  [ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID, FLOOR_ALERT_TRIAGE_REVIEW_YAML, '15:a9d8d6ac'],
  [
    ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
    renderInputs(FLOOR_ATTACK_DISCOVERY_YAML, ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS),
    '9:5e3ea300',
  ],
  [
    ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
    renderInputs(FORENSICS_ENDPOINT_ANALYSIS_YAML, ENDPOINT_ANALYSIS_WORKER_SETTINGS_DEFAULTS),
    '7:4084021c',
  ],
  [
    ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW_ID,
    FORENSICS_CLOSE_INVESTIGATION_GATE_YAML,
    '3:36b83096',
  ],
  [ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW_ID, CLOSE_ATTACK_AND_ALERTS_YAML, '1:e7a50b9e'],
  [
    ALERTZERO_ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_WORKFLOW_ID,
    ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_YAML,
    '2:c95fb7f7',
  ],
  [ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW_ID, FORENSICS_PROPOSAL_GATE_YAML, '5:67acf4fc'],
  [
    ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
    FORENSICS_RUN_ENDPOINT_ANALYSIS_YAML,
    '17:10eeb3eb',
  ],
  [
    ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
    renderInputs(DETECTION_RULE_TUNING_YAML, RULE_TUNING_WORKER_SETTINGS_DEFAULTS),
    '12:8f08f83c',
  ],
  [
    ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID,
    renderInputs(DETECTION_RULE_COVERAGE_YAML, RULE_COVERAGE_WORKER_SETTINGS_DEFAULTS),
    '5:d2801f59',
  ],
  [ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID, RULE_TUNING_WORKER_YAML, '34:499cabfe'],
  [ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID, ACTION_ISOLATE_HOST_YAML, '5:fa71b87b'],
  [ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID, ACTION_KILL_PROCESS_YAML, '7:2ce58cc9'],
  [ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID, ACTION_SUSPEND_PROCESS_YAML, '6:063c014a'],
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
        `AlertZero bumps definition.version for every change to its YAML or the settings defaults in worker_settings_defaults.ts. ` +
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
const ALERTZERO_TIER_IDS = new Set([
  'alertzero_efficient',
  'alertzero_frontier',
  'alertzero_balanced',
]);

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

/**
 * A step is pinned when its connector field is a tier id, or a list that includes one.
 * The list form can lead with another feature and keeps the tier as the fallback.
 */
function namesAlertZeroTier(value: unknown): boolean {
  if (typeof value === 'string') {
    return ALERTZERO_TIER_IDS.has(value);
  }
  if (!Array.isArray(value)) {
    return false;
  }
  return value.some((entry) => typeof entry === 'string' && ALERTZERO_TIER_IDS.has(entry));
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

  it.each(managedDefinitionsById)(
    '%s parses and validates as a workflow definition',
    (id, definition) => {
      const renderedYaml = getManagedWorkflowHashedYaml(definition);
      assertWorkflowYamlIsValid(id, renderedYaml);
    }
  );

  // Asset criticality is the customer's to set: appearing in an attack does not change how much an
  // identity matters. No managed workflow, including the Workers, may write it, so a change has to
  // be made by an analyst in Entity Analytics. Templated definitions are rendered first: their
  // text to scan only exists after `yamlTemplate.render` runs.
  it.each(managedDefinitionsById)('%s never writes asset criticality', (_id, definition) => {
    expect(getManagedWorkflowHashedYaml(definition)).not.toMatch(
      /api\/asset_criticality|entityStore\.updateAssetCriticality/
    );
  });

  // The definition hash is `render(hashValues)`, computed on every reconciliation, so a render that
  // throws or ships an invalid workflow for these values would break installs.
  it.each(managedTemplateDefinitionsById)(
    '%s yamlTemplate renders cleanly with its hashValues',
    (id, definition) => {
      assertTemplateRendersCleanly(id, getManagedWorkflowHashedYaml(definition));
    }
  );

  // A render that varies between calls (a timestamp, a random or v4 uuid) moves the definition hash
  // on every reconciliation, so every installed copy reinstalls each time and the hash differs
  // between instances. Values that are stable in one process but differ per instance, such as the
  // timezone, locale or environment, are not caught here.
  describe('deterministic rendering', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.each(managedTemplateDefinitionsById)(
      '%s yamlTemplate renders the same YAML for its hashValues at different times',
      (_id, definition) => {
        jest.setSystemTime(new Date('2020-01-01T00:00:00.000Z'));
        const firstRender = getManagedWorkflowHashedYaml(definition);
        jest.setSystemTime(new Date('2030-06-15T12:34:56.789Z'));
        const secondRender = getManagedWorkflowHashedYaml(definition);

        expect(secondRender).toBe(firstRender);
      }
    );
  });

  // Worker hashValues bind a service account, so the test above never renders a Worker without
  // one. Production does: the Workers list renders defaults for uninstalled Workers, disabled
  // Workers can be saved without an account, and installs from before accounts were required
  // re-render on boot, falling back to `settings: {}` when `run_as` was the only setting.
  it.each(alertZeroWorkerDefinitionsById)(
    '%s yamlTemplate renders cleanly without a service account at manual autonomy',
    (id, definition) => {
      const renderedYaml = renderWorkerYamlWithoutServiceAccount(definition);

      expect(renderedYaml).not.toMatch(RUN_AS_SETTING_PATTERN);
      assertTemplateRendersCleanly(id, renderedYaml);
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
        parse(getManagedWorkflowHashedYaml(definition))
      );
      const unpinnedStepNames = aiAgentSteps
        .filter((step) => !namesAlertZeroTier(step[CONNECTOR_ID_BY_FEATURE]))
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
        parse(getManagedWorkflowHashedYaml(definition))
      );
      const unpinnedStepNames = runSteps
        .filter((step) => !namesAlertZeroTier(getNamedTier(step, FEATURE_ID)))
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
        parse(getManagedWorkflowHashedYaml(definition))
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
