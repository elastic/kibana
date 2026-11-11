/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { diffLines } from 'diff';
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

/** Covers the interval unit conversion and the three Attack Discovery max-alerts clamp regions. */
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
    pin: '5:989b142c',
  },
  [ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID]: {
    values: workerBlindSpotValues,
    pin: '12:45c2a8be',
  },
  [ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID]: {
    values: workerBlindSpotValues,
    pin: '18:6ef8aab3',
  },
  [ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID]: {
    values: workerBlindSpotValues,
    pin: '9:4efc0779',
  },
  [ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID]: {
    values: workerBlindSpotValues,
    pin: '7:b42367ae',
  },
  [ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID]: {
    values: workerBlindSpotValues,
    pin: '8:531ab7a6',
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
    pin: '2:44ac72d1',
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

/**
 * The lines a variant render adds (`+`) or drops (`-`) against `render(hashValues)`, in render
 * order, so reordering lines only one render has moves the fingerprint. Lines both renders share
 * are left out, so an edit that changes both renders the same way usually does not move it.
 */
function diffRenderedLines(hashedYaml: string, variantYaml: string): string[] {
  return diffLines(hashedYaml, variantYaml, { oneChangePerToken: true, ignoreNewlineAtEof: true })
    .filter(({ added, removed }) => added || removed)
    .map(({ added, value }) => `${added ? '+' : '-'}${value.replace(/\n$/, '')}`);
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
    `At version ${version}, the lines '${id}' renders differently for values other than its ` +
    `hashValues have changed. If its render for hashValues is unchanged, so is the definition ` +
    `hash, and installed copies rendered from other values keep the old workflow until version ` +
    `moves. Bump version to ${nextVersion} and set its BLIND_SPOTS pin to ` +
    `'${nextVersion}:${fingerprint}'.`
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

describe('blind-spot pin fingerprint', () => {
  const createBranchingDefinition = ({
    sharedStep,
    branchSteps,
  }: {
    sharedStep: string;
    branchSteps: readonly string[];
  }): ManagedWorkflowDefinition => ({
    id: 'branching-template',
    pluginId: 'test',
    version: 1,
    billable: false,
    management: { lifecycle: 'static', versionStrategy: 'auto', enablement: 'enforced' },
    yamlTemplate: {
      hashValues: { branch: false },
      render: ({ branch }) =>
        [
          'steps:',
          `  - name: ${sharedStep}`,
          ...(branch === true ? branchSteps.map((step) => `  - name: ${step}`) : []),
        ].join('\n'),
    },
  });
  const takeBranch: BlindSpotValues = (hashValues) => [{ ...hashValues, branch: true }];

  it('moves when steps only other values render are reordered', () => {
    const pin = getBlindSpotPin({
      definition: createBranchingDefinition({ sharedStep: 'shared', branchSteps: ['a', 'b'] }),
      values: takeBranch,
    });
    const reorderedPin = getBlindSpotPin({
      definition: createBranchingDefinition({ sharedStep: 'shared', branchSteps: ['b', 'a'] }),
      values: takeBranch,
    });
    expect(reorderedPin).not.toBe(pin);
  });

  it('does not move when an edit changes both renders the same way', () => {
    const pin = getBlindSpotPin({
      definition: createBranchingDefinition({ sharedStep: 'shared', branchSteps: ['a', 'b'] }),
      values: takeBranch,
    });
    const editedPin = getBlindSpotPin({
      definition: createBranchingDefinition({ sharedStep: 'renamed', branchSteps: ['a', 'b'] }),
      values: takeBranch,
    });
    expect(editedPin).toBe(pin);
  });
});
