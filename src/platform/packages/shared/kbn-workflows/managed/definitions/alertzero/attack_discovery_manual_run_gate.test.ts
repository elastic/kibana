/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import ATTACK_DISCOVERY_RUNNER_YAML from './attack_discovery_runner.yaml';
import DETECTION_RULE_COVERAGE_YAML from './detection_rule_coverage.yaml';
import DETECTION_RULE_TUNING_YAML from './detection_rule_tuning.yaml';
import FLOOR_ALERT_TRIAGE_YAML from './floor_alert_triage.yaml';
import FLOOR_ATTACK_DISCOVERY_YAML from './floor_attack_discovery.yaml';
import FORENSICS_ENDPOINT_ANALYSIS_YAML from './forensics_endpoint_analysis.yaml';
import HUNT_CONTINUOUS_THREAT_HUNT_YAML from './hunt/hunt_continuous_threat_hunt.yaml';
import { renderHuntWorkerYaml } from './hunt/hunt_worker_template';
import {
  ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS,
  upgradeStoredWorkerSettings,
} from './worker_settings_defaults';
import {
  renderAlertTriageWorkerYaml,
  renderCommonWorkerYaml,
  renderRuleCoverageWorkerYaml,
  renderRuleTuningWorkerYaml,
  renderScheduledWorkerYaml,
} from './worker_template_values';
import { requiresDelegatedIdentity } from '../../../definition/requires_delegated_identity';

describe('Attack Discovery manual-run gate', () => {
  it('flags the managed runner: its generation step inherits a parent service account', () => {
    // Regression (elastic/kibana#297266): a manual run of the runner can never supply the
    // parent service account its inherit step requires, and cancels the scheduled run.
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

  it('does not flag any rendered per-space worker: run_as makes every worker type runnable', () => {
    const base = {
      settingsVersion: 1,
      autonomyLevel: 'manual' as const,
      scheduleInterval: '24h',
      serviceAccountId: 'space-service-account',
    };
    const rendered: Array<[string, string]> = [
      [
        'detection_rule_tuning',
        renderRuleTuningWorkerYaml(DETECTION_RULE_TUNING_YAML, {
          ...base,
          extras: { analysisWindowDays: 7, fpCountThreshold: 5, fpRateThresholdPct: 10 },
        }),
      ],
      [
        'detection_rule_coverage',
        renderRuleCoverageWorkerYaml(DETECTION_RULE_COVERAGE_YAML, {
          ...base,
          extras: { lookbackDays: 7, maxGapsPerRun: 20 },
        }),
      ],
      ['hunt_continuous_threat_hunt', renderHuntWorkerYaml(HUNT_CONTINUOUS_THREAT_HUNT_YAML, base)],
      [
        'floor_alert_triage',
        renderAlertTriageWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, {
          settingsVersion: 1,
          autonomyLevel: 'manual',
          scheduleInterval: '15m',
          serviceAccountId: 'space-service-account',
          extras: {
            autoCloseConfidenceScoreMinThreshold: 80,
            budgetPerHour: 10,
            lookbackHours: 24,
            minSeverity: 'medium',
            excludeBuildingBlocks: false,
            excludedRuleTags: [],
          },
        }),
      ],
      [
        'forensics_endpoint_analysis',
        renderCommonWorkerYaml(FORENSICS_ENDPOINT_ANALYSIS_YAML, {
          settingsVersion: 1,
          autonomyLevel: 'manual',
          serviceAccountId: 'space-service-account',
        }),
      ],
    ];

    for (const [name, yaml] of rendered) {
      const definition = parse(yaml);
      expect(definition.settings?.run_as ?? `${name}: missing run_as`).toBeDefined();
      expect(requiresDelegatedIdentity({ definition })).toBe(false);
    }
  });
});
