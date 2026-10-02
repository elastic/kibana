/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AlertRow } from './fake_entity_tabs';

/** Prefix for deterministic lab rule/alert ids ({@link stableUuidFromSeed}). */
export const ENTITY_CENTRIC_LAB_SYNTHETIC_ID_PREFIX = '0175ec0a-';

export const isEntityCentricLabSyntheticRuleId = (ruleId: string): boolean =>
  ruleId.startsWith(ENTITY_CENTRIC_LAB_SYNTHETIC_ID_PREFIX);

/** Deterministic UUID-shaped id for lab mock alerts/rules (stable across reloads). */
export const stableUuidFromSeed = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, '0');
  return `${ENTITY_CENTRIC_LAB_SYNTHETIC_ID_PREFIX}${hex.slice(0, 4)}-4d41-b557-${hex.padStart(12, '0').slice(0, 12)}`;
};

export const alertRowToStableRuleUuid = (row: AlertRow): string =>
  stableUuidFromSeed(row.ruleName);

export const alertRowToStableAlertUuid = (row: AlertRow, entityName: string): string =>
  stableUuidFromSeed(`${entityName}:${row.id}`);
