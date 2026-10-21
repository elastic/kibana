/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID } from '.';
import { ALERTZERO_HUNT_CHILD_WORKFLOW_IDS } from '..';
import { managedWorkflowDefinitions } from '../../..';

const renderWorkflowYaml = (definition: (typeof managedWorkflowDefinitions)[number]): string =>
  'yaml' in definition
    ? definition.yaml
    : definition.yamlTemplate({
        settingsVersion: 1,
        autonomyLevel: 'manual',
        serviceAccountId: 'kibana/nightshift_agent',
      } as never);

describe('Hunt Watch: registry-wide checks', () => {
  // Every managed definition, rendered once (yamlTemplate ones with representative
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
