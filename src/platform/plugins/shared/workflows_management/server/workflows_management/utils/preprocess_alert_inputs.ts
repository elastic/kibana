/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get, isString } from 'lodash';
import { expandFlattenedAlert } from '@kbn/alerting-plugin/server/alerts_client/lib';
import type { AlertHit, CombinedSummarizedAlerts } from '@kbn/alerting-plugin/server/types';
import type { Alert } from '@kbn/alerts-as-data-utils';
import type { Logger } from '@kbn/core/server';
import { QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import type {
  AlertEventRule,
  AlertSelection,
  AlertTriggerInput,
} from '../../../common/types/alert_types';
import { buildAlertEvent } from '../../../common/utils/build_alert_event';
import type { WorkflowsRequestHandlerContext } from '../../types';

/**
 * Extracts rule information from an alert's _source
 */
function extractRuleFromAlert(alert: Record<string, unknown>): AlertEventRule | null {
  const ruleKeys = ['uuid', 'name', 'consumer', 'producer', 'rule_type_id'];
  const ruleValues = ruleKeys.reduce((acc, key) => {
    acc[key] = get(alert, `kibana.alert.rule.${key}`);
    return acc;
  }, {} as Record<string, unknown>);

  if (!Object.values(ruleValues).every(isString)) {
    return null;
  }

  const tags = get(alert, 'kibana.alert.rule.tags');

  return {
    id: ruleValues.uuid as string,
    name: ruleValues.name as string,
    consumer: ruleValues.consumer as string,
    producer: ruleValues.producer as string,
    ruleTypeId: ruleValues.rule_type_id as string,
    tags: Array.isArray(tags) ? tags : [],
  };
}

/**
 * Extracts all unique rules from alert hits
 */
function extractRulesFromAlerts(alertHits: AlertHit[]): Map<string, AlertEventRule> {
  const rulesByUuid = new Map<string, AlertEventRule>();
  for (const alert of alertHits) {
    const rule = extractRuleFromAlert(alert as Record<string, unknown>);
    if (rule && !rulesByUuid.has(rule.id)) {
      rulesByUuid.set(rule.id, rule);
    }
  }
  return rulesByUuid;
}

/**
 * Selects the primary rule from a map of rules, logging warnings if multiple rules exist
 */
function selectPrimaryRule(
  rulesByUuid: Map<string, AlertEventRule>,
  logger: Logger
): AlertEventRule {
  if (rulesByUuid.size === 0) {
    throw new Error('Could not extract rule information from alerts');
  }

  const ruleIds = Array.from(rulesByUuid.keys());
  const primaryRule = rulesByUuid.get(ruleIds[0]);
  if (!primaryRule) {
    throw new Error('Could not determine primary rule from alerts');
  }

  if (rulesByUuid.size > 1) {
    logger.warn(
      `Multiple rules detected (${rulesByUuid.size}): ${ruleIds.join(', ')}. Using rule: ${
        primaryRule.id
      }`
    );
  }

  return primaryRule;
}

/**
 * Fetches full alert documents from Elasticsearch using alert IDs and indices
 */
async function fetchAlerts(
  alertIds: AlertSelection[],
  context: WorkflowsRequestHandlerContext,
  logger: Logger
): Promise<AlertHit[]> {
  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  const ruleTypeRegistryMap = (await context.alerting).listTypes();

  if (alertIds.length === 0) {
    return [];
  }

  try {
    const body: Record<string, unknown> = {
      docs: alertIds.map(({ _id, _index }) => ({ _id, _index })),
    };

    const response = await esClient.mget<Alert>(body);

    const alerts: AlertHit[] = [];
    for (let i = 0; i < response.docs.length; i++) {
      const doc = response.docs[i];
      if ('found' in doc && doc.found && '_source' in doc && doc._source) {
        let alert = doc._source;

        const ruleTypeId = get(alert, 'kibana.alert.rule.rule_type_id') as string;

        const registeredRuleType = ruleTypeRegistryMap.get(ruleTypeId || QUERY_RULE_TYPE_ID); // Default to 'siem.queryRule' if undefined
        // Format alert using the registered rule type's formatAlert function if available,
        if (registeredRuleType?.alerts?.formatAlert) {
          alert = registeredRuleType.alerts.formatAlert(alert) as Alert;
        }

        const expandedAlert = expandFlattenedAlert(alert) as Alert;

        alerts.push({ _id: doc._id, _index: doc._index, ...expandedAlert });
      } else {
        logger.warn(`Alert not found: ${alertIds[i]._id} in index ${alertIds[i]._index}`);
      }
    }

    return alerts;
  } catch (error) {
    logger.error(
      `Failed to fetch alerts: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

/**
 * Preprocesses alert inputs by fetching full alert documents and transforming them
 * into the standardized alert event format using buildAlertEvent
 */
export async function preprocessAlertInputs(
  inputs: Record<string, unknown>,
  context: WorkflowsRequestHandlerContext,
  spaceId: string,
  logger: Logger
): Promise<Record<string, unknown>> {
  const event = inputs.event as AlertTriggerInput['event'] | undefined;
  if (!event || event.triggerType !== 'alert' || !event.alertIds || event.alertIds.length === 0) {
    return inputs;
  }

  logger.debug(`Preprocessing ${event.alertIds.length} alert(s) for workflow execution`);

  const alertHits = await fetchAlerts(event.alertIds, context, logger);

  if (alertHits.length === 0) {
    throw new Error('No alerts found with the provided IDs');
  }

  const rulesByUuid = extractRulesFromAlerts(alertHits);
  const primaryRule = selectPrimaryRule(rulesByUuid, logger);

  const summarizedAlerts: CombinedSummarizedAlerts = {
    new: {
      count: alertHits.length,
      data: alertHits,
    },
    ongoing: {
      count: 0,
      data: [],
    },
    recovered: {
      count: 0,
      data: [],
    },
    all: {
      count: alertHits.length,
      data: alertHits,
    },
  };

  const alertEvent = buildAlertEvent({
    alerts: summarizedAlerts,
    rule: primaryRule,
    ruleUrl: undefined,
    spaceId,
  });

  return {
    ...inputs,
    event: alertEvent,
  };
}
