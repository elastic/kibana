/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import type {
  AlertHit,
  AlertInstanceContext,
  CombinedSummarizedAlerts,
} from '@kbn/alerting-plugin/server/types';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import type { AlertEvent, AlertEventHit, AlertEventRule } from '../types/alert_types';

const attachContext = (
  hits: AlertHit[],
  contextByAlertUuid?: Record<string, AlertInstanceContext>
): AlertEventHit[] => {
  if (!contextByAlertUuid) {
    return hits;
  }

  return hits.map((hit) => {
    const uuid = get(hit, ALERT_UUID);
    if (typeof uuid !== 'string') {
      return hit;
    }
    const context = contextByAlertUuid[uuid];
    if (context === undefined) {
      return hit;
    }
    return { ...hit, context };
  });
};

/**
 * Builds the alert event structure used in workflow execution.
 * This function creates the standardized event format that contains
 * alerts, rule information, and context.
 */
export function buildAlertEvent(params: {
  alerts: CombinedSummarizedAlerts;
  rule: AlertEventRule;
  ruleUrl?: string;
  spaceId: string;
  contextByAlertUuid?: Record<string, AlertInstanceContext>;
}): AlertEvent {
  return {
    alerts: attachContext(
      [
        ...(params.alerts.new?.data ?? []),
        ...(params.alerts.ongoing?.data ?? []),
        ...(params.alerts.recovered?.data ?? []),
      ],
      params.contextByAlertUuid
    ),
    rule: {
      id: params.rule.id,
      name: params.rule.name,
      tags: params.rule.tags,
      consumer: params.rule.consumer,
      producer: params.rule.producer,
      ruleTypeId: params.rule.ruleTypeId,
    },
    ruleUrl: params.ruleUrl,
    spaceId: params.spaceId,
  };
}
