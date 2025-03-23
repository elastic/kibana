/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const BASE_ALERTING_API_PATH = '/api/alerting';

export const queryKeys = {
  root: 'alerts',
  mutedAlerts: (ruleIds: string[]) =>
    [queryKeys.root, 'mutedInstanceIdsForRuleIds', ruleIds] as const,
};

export const mutationKeys = {
  root: 'alerts',
  muteAlertInstance: () => [mutationKeys.root, 'muteAlertInstance'] as const,
  unmuteAlertInstance: () => [mutationKeys.root, 'unmuteAlertInstance'] as const,
};
