/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", and the "Server Side Public License v 1".
 */

import { parse } from 'yaml';
import ATTACK_DISCOVERY_RUNNER_YAML from './attack_discovery_runner.yaml';
import FLOOR_ATTACK_DISCOVERY_YAML from './floor_attack_discovery.yaml';
import {
  ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS,
  upgradeStoredWorkerSettings,
} from './worker_settings_defaults';
import { renderScheduledWorkerYaml } from './worker_template_values';
import { requiresDelegatedIdentity } from '../../../definition/requires_delegated_identity';

describe('Attack Discovery manual-run gate', () => {
  it('flags the managed runner: its generation step inherits a parent service account', () => {
    // Regression (elastic/kibana#297266): the managed runner is exposed as a
    // manual-trigger workflow, but a top-level run can never supply the parent
    // service account its run-as-mode: inherit step requires — and starting it
    // by hand cancels the space's in-flight scheduled run via cancel-in-progress.
    const definition = parse(ATTACK_DISCOVERY_RUNNER_YAML);
    expect(requiresDelegatedIdentity({ definition })).toBe(true);
  });

  it('does not flag the rendered floor worker: it carries its own run_as', () => {
    const yaml = renderScheduledWorkerYaml(
      FLOOR_ATTACK_DISCOVERY_YAML,
      upgradeStoredWorkerSettings(ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS, {
        settingsVersion: 1,
        autonomyLevel: 'manual',
        scheduleInterval: '24h',
        serviceAccountId: 'space-service-account',
      })
    );
    const definition = parse(yaml);
    expect(definition.settings?.run_as).toBeDefined();
    expect(requiresDelegatedIdentity({ definition })).toBe(false);
  });
});
