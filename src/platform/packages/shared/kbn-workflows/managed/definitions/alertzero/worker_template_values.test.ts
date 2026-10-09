/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import DETECTION_RULE_COVERAGE_YAML from './detection_rule_coverage.yaml';
import DETECTION_RULE_TUNING_YAML from './detection_rule_tuning.yaml';
import FLOOR_ALERT_TRIAGE_YAML from './floor_alert_triage.yaml';
import FLOOR_ATTACK_DISCOVERY_YAML from './floor_attack_discovery.yaml';
import FORENSICS_ENDPOINT_ANALYSIS_YAML from './forensics_endpoint_analysis.yaml';
import HUNT_CONTINUOUS_THREAT_HUNT_YAML from './hunt_continuous_threat_hunt.yaml';
import {
  renderAlertTriageWorkerYaml,
  renderCommonWorkerYaml,
  renderHuntWorkerYaml,
  renderRuleCoverageWorkerYaml,
  renderRuleTuningWorkerYaml,
  renderScheduledWorkerYaml,
} from './worker_template_values';

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
        },
        serviceAccountId,
      }),
  ],
  [
    'Attack Discovery',
    (serviceAccountId) =>
      renderScheduledWorkerYaml(FLOOR_ATTACK_DISCOVERY_YAML, {
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
    'Continuous Threat Hunt',
    (serviceAccountId) =>
      renderHuntWorkerYaml(HUNT_CONTINUOUS_THREAT_HUNT_YAML, {
        ...shared,
        scheduleInterval: '4h',
        serviceAccountId,
      }),
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

describe('Alert Triage sweep rendering', () => {
  const render = (scheduleInterval: string) =>
    renderAlertTriageWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, {
      ...shared,
      scheduleInterval,
      extras: {
        autoCloseConfidenceScoreMinThreshold: 0.85,
        budgetPerHour: 1300,
        lookbackHours: 24,
      },
    });

  it.each([
    ['15m', 15],
    ['2h', 120],
    ['1d', 1440],
  ])('renders the %s interval as %i minutes for the budget per sweep', (interval, minutes) => {
    const rendered = parse(render(interval)) as {
      triggers: Array<{ type: string; with?: { every: string } }>;
      consts: { schedule_interval_minutes: number };
    };

    expect(rendered.triggers.find(({ type }) => type === 'scheduled')?.with?.every).toBe(interval);
    expect(rendered.consts.schedule_interval_minutes).toBe(minutes);
  });

  it('renders the settings under consts and leaves no placeholder behind', () => {
    const rendered = render('15m');

    expect(rendered).not.toMatch(/__WORKER_[A-Z_]+__/);
    expect(
      (parse(rendered) as { consts: { worker_settings: { extras: unknown } } }).consts
        .worker_settings.extras
    ).toEqual({
      autoCloseConfidenceScoreMinThreshold: 0.85,
      budgetPerHour: 1300,
      lookbackHours: 24,
    });
  });

  it('rejects an interval the settings schema would not allow', () => {
    expect(() => render('90s')).toThrow(/Unsupported schedule interval/);
  });
});
