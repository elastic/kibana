/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  renderScheduledWorkerYaml,
  type ScheduledWorkerTemplateValues,
  scheduleIntervalToMinutes,
} from '../worker_template_values';

/** One day's retrieval. Also the hard ceiling: a longer interval does not raise it. */
const ATTACK_DISCOVERY_ALERTS_PER_DAY = 10_000;
/** One batch. Shorter intervals stay at a single batch rather than a partial one. */
const ATTACK_DISCOVERY_MIN_ALERTS = 100;
const MINUTES_PER_DAY = 24 * 60;

/**
 * Alerts one Attack Discovery run may retrieve, prorated to its schedule interval.
 * 10,000 per 24h, at least 100, and never more than 10,000.
 */
export const attackDiscoveryMaxAlerts = (interval: string): number => {
  const prorated = Math.floor(
    (ATTACK_DISCOVERY_ALERTS_PER_DAY * scheduleIntervalToMinutes(interval)) / MINUTES_PER_DAY
  );
  return Math.min(ATTACK_DISCOVERY_ALERTS_PER_DAY, Math.max(ATTACK_DISCOVERY_MIN_ALERTS, prorated));
};

export const renderAttackDiscoveryWorkerYaml = (
  yaml: string,
  values: ScheduledWorkerTemplateValues
): string =>
  renderScheduledWorkerYaml(yaml, values).replaceAll(
    '__WORKER_MAX_ALERTS__',
    String(attackDiscoveryMaxAlerts(values.scheduleInterval))
  );
