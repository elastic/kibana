/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import HUNT_CONTINUOUS_THREAT_HUNT_YAML from './hunt_continuous_threat_hunt.yaml';
import { renderHuntWorkerYaml } from './hunt_worker_template';

const HOSTILE_ID = 'we"ird: id\n#x/kibana';

const shared = { settingsVersion: 1, autonomyLevel: 'manual' as const };

const render = (serviceAccountId?: string) =>
  renderHuntWorkerYaml(HUNT_CONTINUOUS_THREAT_HUNT_YAML, {
    ...shared,
    scheduleInterval: '4h',
    serviceAccountId,
  });

const settingsOf = (yaml: string): unknown => {
  const parsed = parse(yaml) as { settings?: unknown };
  return parsed.settings;
};

describe('renderHuntWorkerYaml run_as', () => {
  it('renders settings as an object when no account is stored', () => {
    expect(settingsOf(render())).toEqual(expect.any(Object));
  });

  it('omits run_as when no account is stored', () => {
    const settings = settingsOf(render()) as { run_as?: string };

    expect(settings.run_as).toBeUndefined();
  });

  it('round-trips a quoted service account id', () => {
    const settings = settingsOf(render(HOSTILE_ID)) as { run_as?: string };

    expect(settings.run_as).toBe(HOSTILE_ID);
  });
});

describe('renderHuntWorkerYaml Hunt placeholders', () => {
  it('substitutes scheduled plus manual reportIds triggers and Hunt dials', () => {
    const rendered = render();
    const parsed = parse(rendered) as {
      triggers: Array<{
        type: string;
        with?: { every: string };
        inputs?: { properties?: { reportIds?: { maxItems?: number } } };
      }>;
      consts: {
        worker_settings: {
          tier2When: string;
          candidateLimit: number;
          fanOutMax: number;
        };
      };
    };

    expect(rendered).not.toMatch(/__WORKER_[A-Z_]+__/);
    expect(parsed.triggers.find(({ type }) => type === 'scheduled')?.with?.every).toBe('4h');
    expect(
      parsed.triggers.find(({ type }) => type === 'manual')?.inputs?.properties?.reportIds?.maxItems
    ).toBe(10);
    expect(parsed.consts.worker_settings.tier2When).toBe('always');
    expect(parsed.consts.worker_settings.candidateLimit).toBe(10);
    expect(parsed.consts.worker_settings.fanOutMax).toBe(10);
  });
});
