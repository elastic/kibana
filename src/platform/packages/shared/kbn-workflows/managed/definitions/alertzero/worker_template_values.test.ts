/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import ATTACK_DISCOVERY_REVIEW_YAML from './attack_discovery_review.yaml';
import COVERAGE_WORKER_YAML from './coverage_worker.yaml';
import DETECTION_RULE_COVERAGE_YAML from './detection_rule_coverage.yaml';
import DETECTION_RULE_TUNING_YAML from './detection_rule_tuning.yaml';
import FLOOR_ALERT_TRIAGE_YAML from './floor_alert_triage.yaml';
import FLOOR_ATTACK_DISCOVERY_YAML from './floor_attack_discovery.yaml';
import FORENSICS_ENDPOINT_ANALYSIS_YAML from './forensics_endpoint_analysis.yaml';
import HUNT_CONTINUOUS_THREAT_HUNT_YAML from './hunt_continuous_threat_hunt.yaml';
import {
  SECURITY_INVESTIGATIONS_AI_INDEX_ID,
  SECURITY_INVESTIGATIONS_AI_INDEX_ID_TOKEN,
  SECURITY_INVESTIGATIONS_AI_INDEX_NAME,
} from './security_investigations_ai_index';
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
        extras: { autoCloseConfidenceScoreMinThreshold: 0.85 },
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

describe('AI index rendering', () => {
  const tokenYamls: Array<[string, string]> = [
    ['Coverage worker', COVERAGE_WORKER_YAML],
    ['Attack Discovery review', ATTACK_DISCOVERY_REVIEW_YAML],
    ['Endpoint analysis', FORENSICS_ENDPOINT_ANALYSIS_YAML],
  ];

  it.each(tokenYamls)('%s source carries the AI index token', (_name, yaml) => {
    expect(yaml).toContain(SECURITY_INVESTIGATIONS_AI_INDEX_ID_TOKEN);
  });

  it.each(tokenYamls)('replaces every AI index token in %s without values', (_name, yaml) => {
    const rendered = renderCommonWorkerYaml(yaml);

    expect(rendered).not.toContain(SECURITY_INVESTIGATIONS_AI_INDEX_ID_TOKEN);
    expect(rendered).toContain(SECURITY_INVESTIGATIONS_AI_INDEX_ID);
  });

  it('replaces the AI index token alongside worker settings when values are given', () => {
    const rendered = renderCommonWorkerYaml(FORENSICS_ENDPOINT_ANALYSIS_YAML, shared);

    expect(rendered).not.toContain(SECURITY_INVESTIGATIONS_AI_INDEX_ID_TOKEN);
    expect(rendered).not.toContain('__WORKER_');
    expect(rendered).toContain(SECURITY_INVESTIGATIONS_AI_INDEX_ID);
  });

  it('leaves worker settings placeholders alone when no values are given', () => {
    const yaml = 'a: __WORKER_SETTINGS_VERSION__\nb: __WORKER_AUTONOMY_LEVEL__';

    expect(renderCommonWorkerYaml(yaml)).toBe(yaml);
  });

  it('replaces repeated tokens', () => {
    const token = SECURITY_INVESTIGATIONS_AI_INDEX_ID_TOKEN;

    expect(renderCommonWorkerYaml(`${token} ${token}`)).toBe(
      `${SECURITY_INVESTIGATIONS_AI_INDEX_ID} ${SECURITY_INVESTIGATIONS_AI_INDEX_ID}`
    );
  });

  it('derives the backing index name from the id', () => {
    expect(SECURITY_INVESTIGATIONS_AI_INDEX_NAME).toBe(
      `ai-index-idx-${SECURITY_INVESTIGATIONS_AI_INDEX_ID}`
    );
  });
});
