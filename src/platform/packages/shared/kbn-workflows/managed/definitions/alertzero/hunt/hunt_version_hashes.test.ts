/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW } from './hunt_continuous_threat_hunt';
import HUNT_CONTINUOUS_THREAT_HUNT_YAML from './hunt_continuous_threat_hunt.yaml';
import { CONTINUOUS_THREAT_HUNT_WORKER_SETTINGS_DEFAULTS } from '../worker_settings_defaults';

function createContentFingerprint(content: string): string {
  let fingerprint = 0;
  for (const character of content) {
    fingerprint = (fingerprint * 31 + character.charCodeAt(0)) % 0xffffffff;
  }
  return fingerprint.toString(16).padStart(8, '0');
}

/**
 * What the platform's `yamlTemplate` hash cannot see but the render depends on: the imported YAML
 * and the settings defaults the Hunt renderer fills stored values from.
 */
const renderInputs = (importedYaml: string, defaults: unknown): string =>
  `${importedYaml}\n${JSON.stringify(defaults)}`;

describe('Hunt Watch version hashes', () => {
  it('requires bumping Continuous Threat Hunt definition.version with its render-input fingerprint', () => {
    expect(
      `${ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW.version}:${createContentFingerprint(
        renderInputs(
          HUNT_CONTINUOUS_THREAT_HUNT_YAML,
          CONTINUOUS_THREAT_HUNT_WORKER_SETTINGS_DEFAULTS
        )
      )}`
    ).toBe('6:e9a8d4f7');
  });
});
