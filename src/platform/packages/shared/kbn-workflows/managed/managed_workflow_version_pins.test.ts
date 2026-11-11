/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TemplatedManagedWorkflowId } from '.';
import { managedWorkflowDefinitions } from '.';
import {
  ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID,
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
  CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID,
  EXAMPLE_MANAGED_WORKFLOW_ID,
  EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_DECISION_TREE_HYDRATE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from './definitions';
import { WORKER_AUTONOMY_LEVELS } from './definitions/alertzero/worker_settings_defaults';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from './types';

/**
 * A template's definition hash is `render(hashValues)`, so an edit that changes the render only for
 * other values leaves it unchanged, and installed copies rendered from those values keep the old
 * workflow until `version` moves. Each template whose render branches on its values pins its
 * version with a fingerprint of how other values render, so such an edit at the same version
 * fails here.
 */

type BlindSpotValues = (
  hashValues: ManagedWorkflowTemplateValues
) => ManagedWorkflowTemplateValues[];

interface BlindSpots {
  /** Values that take the branches `hashValues` skip. */
  values: BlindSpotValues;
  /** `version:fingerprint`. On a failure, the message gives the new pin. */
  pin: string;
}

/** Fixes the interval unit conversion and the three Attack Discovery max-alerts clamp regions. */
const WORKER_SCHEDULE_INTERVALS = ['5m', '90m', '2h', '3d'] as const;

/**
 * The stored Worker values production renders besides `hashValues`: every autonomy level, with
 * and without a service account, an install from before schedules and extras existed, partial or
 * stale extras, and other schedule intervals.
 */
const workerBlindSpotValues: BlindSpotValues = (hashValues) => {
  const { serviceAccountId: _serviceAccountId, ...withoutAccount } = hashValues;
  const { settingsVersion } = hashValues;
  return [
    ...WORKER_AUTONOMY_LEVELS.flatMap((autonomyLevel) => [
      { ...hashValues, autonomyLevel },
      { ...withoutAccount, autonomyLevel },
    ]),
    { settingsVersion, autonomyLevel: 'manual' },
    Object.hasOwn(hashValues, 'extras')
      ? { ...hashValues, extras: {} }
      : { ...hashValues, extras: { stale: true } },
    ...(Object.hasOwn(hashValues, 'scheduleInterval')
      ? WORKER_SCHEDULE_INTERVALS.map((scheduleInterval) => ({ ...hashValues, scheduleInterval }))
      : []),
  ];
};

/**
 * Every template needs an entry: `null` when its render does not branch on its values, so
 * `hashValues` already reach everything it renders.
 */
const BLIND_SPOTS: Record<TemplatedManagedWorkflowId, BlindSpots | null> = {
  [ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID]: {
    values: workerBlindSpotValues,
    pin: '5:2847a85c',
  },
  [ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID]: {
    values: workerBlindSpotValues,
    pin: '12:42c2401b',
  },
  [ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID]: {
    values: workerBlindSpotValues,
    pin: '18:b3345beb',
  },
  [ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID]: {
    values: workerBlindSpotValues,
    pin: '9:b0cda1d8',
  },
  [ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID]: {
    values: workerBlindSpotValues,
    pin: '7:bda3b621',
  },
  [ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID]: {
    values: workerBlindSpotValues,
    pin: '8:cd0c7798',
  },
  [CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID]: null,
  [EXAMPLE_MANAGED_WORKFLOW_ID]: null,
  [EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID]: {
    // `hashValues` set every option, so these cover each option unset.
    values: (hashValues) => [
      {},
      { childWorkflowId: 'example-child' },
      { ...hashValues, fallbackChild: false },
    ],
    pin: '2:12089a17',
  },
  [NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW_ID]: null,
  [NIGHTSHIFT_BOUND_DECISION_TREE_HYDRATE_WORKFLOW_ID]: null,
  [NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID]: null,
  [NIGHTSHIFT_BOUND_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID]: null,
  [NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID]: null,
  [SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID]: {
    // Installs from before the defaulted fields existed re-render without them on boot.
    values: ({ detectionIntervalMinutes }) => [{ detectionIntervalMinutes }],
    pin: '3:0000893d',
  },
  [SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID]: {
    // Installs from before the defaulted fields existed re-render without them on boot.
    values: ({ reviewIntervalMinutes, discoveryBatchSize, maxReviewPasses }) => [
      { reviewIntervalMinutes, discoveryBatchSize, maxReviewPasses },
    ],
    pin: '6:0000893d',
  },
};

const blindSpotsById = new Map<string, BlindSpots | null>(Object.entries(BLIND_SPOTS));

function createContentFingerprint(content: string): string {
  let fingerprint = 0;
  for (const character of content) {
    fingerprint = (fingerprint * 31 + character.charCodeAt(0)) % 0xffffffff;
  }
  return fingerprint.toString(16).padStart(8, '0');
}

function countLines(yaml: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of yaml.split('\n')) {
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return counts;
}

/**
 * The lines a variant render adds (`+`) or drops (`-`) against `render(hashValues)`, sorted. A
 * template edit that both renders share cancels out, so only edits the hash cannot see move it.
 */
function diffRenderedLines(hashedYaml: string, variantYaml: string): string[] {
  const hashedCounts = countLines(hashedYaml);
  const variantCounts = countLines(variantYaml);
  const lines = new Set([...hashedCounts.keys(), ...variantCounts.keys()]);
  return [...lines]
    .flatMap((line) => {
      const difference = (variantCounts.get(line) ?? 0) - (hashedCounts.get(line) ?? 0);
      const sign = difference > 0 ? '+' : '-';
      return Array.from({ length: Math.abs(difference) }, () => `${sign}${line}`);
    })
    .sort();
}

function getBlindSpotPin({
  definition,
  values,
}: {
  definition: ManagedWorkflowDefinition;
  values: BlindSpotValues;
}): string {
  const { id, version, yamlTemplate } = definition;
  if (!yamlTemplate) {
    throw new Error(`'${id}' has blind spots but no yamlTemplate`);
  }
  const { hashValues, render } = yamlTemplate;
  const hashedYaml = render(hashValues);
  const diffs = values(hashValues).map(
    (variantValues, index) =>
      `#${index}\n${diffRenderedLines(hashedYaml, render(variantValues)).join('\n')}`
  );
  return `${version}:${createContentFingerprint(diffs.join('\n'))}`;
}

function describePinMismatch({
  definition,
  pinned,
  actual,
}: {
  definition: ManagedWorkflowDefinition;
  pinned: string;
  actual: string;
}): string {
  const { id, version } = definition;
  const [pinnedVersion] = pinned.split(':');
  if (pinnedVersion !== String(version)) {
    return `'${id}' is now at version ${version}. Set its BLIND_SPOTS pin to '${actual}'.`;
  }
  const [, fingerprint] = actual.split(':');
  const nextVersion = version + 1;
  return (
    `'${id}' renders differently for values other than its hashValues at version ${version}. ` +
    `The definition hash does not cover those values, so installed copies rendered from them ` +
    `keep the old workflow until version moves. Bump version to ${nextVersion} and set its ` +
    `BLIND_SPOTS pin to '${nextVersion}:${fingerprint}'.`
  );
}

const templateDefinitionsById = managedWorkflowDefinitions
  .filter((definition: ManagedWorkflowDefinition) => definition.yamlTemplate !== undefined)
  .map((definition) => [definition.id, definition] as const);

describe('managed workflow blind-spot pins', () => {
  it.each(templateDefinitionsById)(
    '%s bumps version when its render changes only for values other than hashValues',
    (id, definition) => {
      const blindSpots = blindSpotsById.get(id);
      if (blindSpots === undefined) {
        throw new Error(`Add an entry for '${id}' to BLIND_SPOTS.`);
      }
      if (blindSpots === null) {
        return;
      }
      const { values, pin } = blindSpots;
      const actual = getBlindSpotPin({ definition, values });
      if (actual === pin) {
        return;
      }
      throw new Error(describePinMismatch({ definition, pinned: pin, actual }));
    }
  );
});
