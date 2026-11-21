/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import FLOOR_ALERT_TRIAGE_YAML from './alert_triage/floor_alert_triage.yaml';
import { renderAlertTriageWorkerYaml } from './alert_triage/worker_template_values';
import FLOOR_ATTACK_DISCOVERY_YAML from './attack_discovery/floor_attack_discovery.yaml';
import { renderAttackDiscoveryWorkerYaml } from './attack_discovery/worker_template_values';
import FORENSICS_ENDPOINT_ANALYSIS_YAML from './endpoint_analysis/forensics_endpoint_analysis.yaml';
import DETECTION_RULE_COVERAGE_YAML from './rule_coverage/detection_rule_coverage.yaml';
import { renderRuleCoverageWorkerYaml } from './rule_coverage/worker_template_values';
import DETECTION_RULE_TUNING_YAML from './rule_tuning/detection_rule_tuning.yaml';
import { renderRuleTuningWorkerYaml } from './rule_tuning/worker_template_values';
import { renderCommonWorkerYaml } from './worker_template_values';

const HOSTILE_ID = 'we"ird: id\n#x/kibana';

const shared = { settingsVersion: 1, autonomyLevel: 'manual' as const };

const workers: Array<[string, (serviceAccountId?: string) => string]> = [
  [
    'Alert Triage',
    (serviceAccountId) =>
      renderAlertTriageWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, {
        ...shared,
        scheduleInterval: '15m',
        extras: {
          autoCloseConfidenceScoreMinThreshold: 0.85,
          budgetPerHour: 1300,
          lookbackHours: 24,
          minSeverity: 'low',
          excludeBuildingBlocks: false,
          excludedRuleTags: [],
        },
        serviceAccountId,
      }),
  ],
  [
    'Attack Discovery',
    (serviceAccountId) =>
      renderAttackDiscoveryWorkerYaml(FLOOR_ATTACK_DISCOVERY_YAML, {
        ...shared,
        scheduleInterval: '24h',
        serviceAccountId,
      }),
  ],
  [
    'Endpoint analysis',
    (serviceAccountId) =>
      renderCommonWorkerYaml(FORENSICS_ENDPOINT_ANALYSIS_YAML, { ...shared, serviceAccountId }),
  ],
  [
    'Rule Tuning',
    (serviceAccountId) =>
      renderRuleTuningWorkerYaml(DETECTION_RULE_TUNING_YAML, {
        ...shared,
        scheduleInterval: '2h',
        extras: { analysisWindowDays: 7, fpCountThreshold: 10, fpRateThresholdPct: 50 },
        serviceAccountId,
      }),
  ],
  [
    'Rule Coverage',
    (serviceAccountId) =>
      renderRuleCoverageWorkerYaml(DETECTION_RULE_COVERAGE_YAML, {
        ...shared,
        scheduleInterval: '1h',
        extras: { lookbackDays: 14, maxGapsPerRun: 5 },
        serviceAccountId,
      }),
  ],
];

const settingsOf = (yaml: string): unknown => {
  const parsed = parse(yaml) as { settings?: unknown };
  return parsed.settings;
};

describe('renderRunAs', () => {
  it.each(workers)(
    'renders %s settings as an object when no account is stored',
    (_name, render) => {
      expect(settingsOf(render())).toEqual(expect.any(Object));
    }
  );

  it.each(workers)('omits run_as from %s when no account is stored', (_name, render) => {
    const settings = settingsOf(render()) as { run_as?: string };

    expect(settings.run_as).toBeUndefined();
  });

  it.each(workers)('round-trips a quoted %s service account id', (_name, render) => {
    const settings = settingsOf(render(HOSTILE_ID)) as { run_as?: string };

    expect(settings.run_as).toBe(HOSTILE_ID);
  });
});
