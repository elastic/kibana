/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * registering a new instance of the rule data client
 * in a new plugin will require updating the below data structure
 * to include the index name where the alerts as data will be written to.
 *
 * This doesn't work in combination with the `xpack.ruleRegistry.index`
 * setting, with which the user can change the index prefix.
 */

export const AlertConsumers = {
  APM: 'apm',
  LOGS: 'logs',
  INFRASTRUCTURE: 'infrastructure',
  OBSERVABILITY: 'observability',
  SIEM: 'siem',
  SYNTHETICS: 'synthetics',
} as const;
export type AlertConsumers = typeof AlertConsumers[keyof typeof AlertConsumers];

export const mapConsumerToIndexName: Record<AlertConsumers, string | string[]> = {
  apm: '.alerts-observability-apm',
  logs: '.alerts-observability.logs',
  infrastructure: '.alerts-observability.metrics',
  observability: '.alerts-observability',
  siem: ['.alerts-security.alerts', '.siem-signals'],
  synthetics: '.alerts-observability-synthetics',
};
export type ValidFeatureId = keyof typeof mapConsumerToIndexName;

export const validFeatureIds = Object.keys(mapConsumerToIndexName);
export const isValidFeatureId = (a: unknown): a is ValidFeatureId =>
  typeof a === 'string' && validFeatureIds.includes(a);
