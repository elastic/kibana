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
  EXAMPLE_MANAGED_WORKFLOW_ID,
  PND_RULE_CREATION_WORKFLOW_ID,
  PND_RULE_PREVIEW_WORKFLOW_ID,
  PND_RULE_TUNING_WORKFLOW_ID,
  PND_WATCH_AUTO_APPROVER_WORKFLOW_ID,
  PND_WATCH_DARK_WORKFLOW_ID,
  PND_WATCH_DEEP_WORKFLOW_ID,
  PND_WATCH_DETECTION_WORKFLOW_ID,
  PND_WATCH_FLOOR_WORKFLOW_ID,
  PND_WATCH_OFFICER_WORKFLOW_ID,
  PND_WATCH_POST_INCIDENT_WORKFLOW_ID,
  SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from './definitions';
import WATCH_DARK_YAML from './definitions/pnd/watch_dark.yaml';
import WATCH_DEEP_YAML from './definitions/pnd/watch_deep.yaml';
import WATCH_DETECTION_YAML from './definitions/pnd/watch_detection.yaml';
import WATCH_FLOOR_YAML from './definitions/pnd/watch_floor.yaml';
import WATCH_OFFICER_YAML from './definitions/pnd/watch_officer.yaml';
import WATCH_POST_INCIDENT_YAML from './definitions/pnd/watch_post_incident.yaml';
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
  [PND_WATCH_FLOOR_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
  },
  [PND_WATCH_OFFICER_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
  },
  [PND_WATCH_DARK_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
  },
  [PND_WATCH_DEEP_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
  },
  [PND_WATCH_DETECTION_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
  },
  [PND_WATCH_POST_INCIDENT_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
  },
  [PND_WATCH_AUTO_APPROVER_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
  },
  [PND_RULE_PREVIEW_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
  },
  [PND_RULE_TUNING_WORKFLOW_ID]: {
    settingsVersion: 1,
    autonomyLevel: 'manual',
  },
  [PND_RULE_CREATION_WORKFLOW_ID]: {
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
  [PND_WATCH_FLOOR_WORKFLOW_ID, WATCH_FLOOR_YAML, '22:59deadaf'],
  [PND_WATCH_OFFICER_WORKFLOW_ID, WATCH_OFFICER_YAML, '6:ac13554a'],
  [PND_WATCH_DARK_WORKFLOW_ID, WATCH_DARK_YAML, '6:add36220'],
  [PND_WATCH_DEEP_WORKFLOW_ID, WATCH_DEEP_YAML, '19:ee9a2bf1'],
  [PND_WATCH_DETECTION_WORKFLOW_ID, WATCH_DETECTION_YAML, '8:c9f95029'],
  [PND_WATCH_POST_INCIDENT_WORKFLOW_ID, WATCH_POST_INCIDENT_YAML, '14:58a5b54e'],
] as const)(
  'requires bumping %s definition.version together with the imported YAML fingerprint',
  (workflowId, importedYaml, expectedFingerprint) => {
    const definition = managedWorkflowDefinitions.find(({ id }) => id === workflowId);
    if (!definition) throw new Error(`Managed watch "${workflowId}" is not registered`);
    const actualFingerprint = `${definition.version}:${createContentFingerprint(importedYaml)}`;
    if (actualFingerprint === expectedFingerprint) {
      return;
    }
    throw new Error(
      `Imported YAML for '${workflowId}' changed (${actualFingerprint}, expected ${expectedFingerprint}). ` +
        `yamlTemplate hashing covers only the function source, not this imported string, so already-installed spaces will not receive the edit until definition.version is bumped. ` +
        `Bump version in the watch module and update this expected fingerprint in the same change.`
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
