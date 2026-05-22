/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { managedWorkflowDefinitions } from '.';
import {
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
} from './definitions';

const EXPECTED_AD_IDS = [
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
] as const;

describe('Attack Discovery managed workflow definitions', () => {
  const registeredIds = managedWorkflowDefinitions.map(({ id }) => id);

  it(`contains all ${EXPECTED_AD_IDS.length} AD workflow IDs in the registry`, () => {
    for (const id of EXPECTED_AD_IDS) {
      expect(registeredIds).toContain(id);
    }
  });

  it.each(EXPECTED_AD_IDS)('%s uses the system- prefix', (id) => {
    expect(id.startsWith('system-')).toBe(true);
  });

  it.each(EXPECTED_AD_IDS)('%s has pluginId "discoveries"', (id) => {
    const definition = managedWorkflowDefinitions.find((d) => d.id === id);

    expect(definition?.pluginId).toBe('discoveries');
  });

  it.each(EXPECTED_AD_IDS)(
    '%s has lifecycle static, versionStrategy auto, enablement enforced',
    (id) => {
      const definition = managedWorkflowDefinitions.find((d) => d.id === id);

      expect(definition?.management).toEqual({
        enablement: 'enforced',
        lifecycle: 'static',
        versionStrategy: 'auto',
      });
    }
  );

  it.each(EXPECTED_AD_IDS)('%s has a non-empty yaml string', (id) => {
    const definition = managedWorkflowDefinitions.find((d) => d.id === id);
    const yaml = definition != null && 'yaml' in definition ? definition.yaml : undefined;

    expect(typeof yaml).toBe('string');
    expect((yaml as string).trim().length).toBeGreaterThan(0);
  });
});
