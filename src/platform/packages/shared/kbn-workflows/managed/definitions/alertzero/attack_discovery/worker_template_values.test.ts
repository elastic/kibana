/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import FLOOR_ATTACK_DISCOVERY_YAML from './floor_attack_discovery.yaml';
import {
  attackDiscoveryMaxAlerts,
  renderAttackDiscoveryWorkerYaml,
} from './worker_template_values';

const shared = { settingsVersion: 1, autonomyLevel: 'manual' as const };

describe('Attack Discovery alert cap', () => {
  it.each([
    ['1m', 100],
    ['15m', 104],
    ['1h', 416],
    ['2h', 833],
    ['143m', 993],
    ['24h', 10000],
    ['1d', 10000],
    ['2d', 10000],
  ])('prorates %s to %i alerts', (interval, alerts) => {
    expect(attackDiscoveryMaxAlerts(interval)).toBe(alerts);
  });

  it('renders the cap into the floor worker and leaves no placeholder behind', () => {
    const rendered = renderAttackDiscoveryWorkerYaml(FLOOR_ATTACK_DISCOVERY_YAML, {
      ...shared,
      scheduleInterval: '1h',
    });

    expect(rendered).not.toMatch(/__WORKER_[A-Z0-9_]+__/);
    expect(
      (parse(rendered) as { consts: { worker_settings: { maxAlerts: number } } }).consts
        .worker_settings.maxAlerts
    ).toBe(416);
    expect((parse(rendered) as { settings: { timeout: string } }).settings.timeout).toBe('12h');
  });
});
