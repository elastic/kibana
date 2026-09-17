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
import {
  fetchAlertsByQuery,
  fetchDocumentsByIds,
  fetchDocumentsByQuery,
  MAX_TRIGGER_EVENT_DOCS,
  type RawDocumentHit,
} from './fetch_event_documents';
import type { AlertEventRule, AlertTriggerInput } from '../../../../../common/types/alert_types';
import type {
  DocumentEventEntry,
  DocumentTriggerInput,
} from '../../../../../common/types/document_types';
import { buildAlertEvent } from '../../../../../common/utils/build_alert_event';
import type { TriggerInputPreprocessingContext } from '../../../workflows_management_api';

const formatTrackedTotal = (total: number, relation: 'eq' | 'gte'): string =>
  `${relation === 'gte' ? 'at least ' : ''}${total}`;

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
 * Formats raw document hits into the alert-as-data shape, applying the registered
 * rule type's `formatAlert` when available and expanding flattened fields.
 */
function formatAlertHits(
  rawHits: RawDocumentHit[],
  ruleTypeRegistryMap: ReturnType<
    Awaited<TriggerInputPreprocessingContext['alerting']>['listTypes']
  >
): AlertHit[] {
  return rawHits.map(({ _id, _index, _source }) => {
    let alert = _source as Alert;

    const ruleTypeId = get(alert, 'kibana.alert.rule.rule_type_id') as string;
    // Default to 'siem.queryRule' if the rule type is undefined.
    const registeredRuleType = ruleTypeRegistryMap.get(ruleTypeId || QUERY_RULE_TYPE_ID);
    if (registeredRuleType?.alerts?.formatAlert) {
      alert = registeredRuleType.alerts.formatAlert(alert) as Alert;
    }

    const expandedAlert = expandFlattenedAlert(alert) as Alert;
    return { _id, _index, ...expandedAlert };
  });
}

/**
 * Expands an `alert` trigger event (from either explicit ids or a query) into the
 * standardized alert event format using `buildAlertEvent`.
 */
async function preprocessAlertEvent(
  inputs: Record<string, unknown>,
  event: AlertTriggerInput['event'],
  context: TriggerInputPreprocessingContext,
  spaceId: string,
  logger: Logger
): Promise<Record<string, unknown>> {
  if (!event.querySelection && (!event.alertIds || event.alertIds.length === 0)) {
    return inputs;
  }

  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  const ruleTypeRegistryMap = (await context.alerting).listTypes();
  const alertsClient = await (await context.rac).getAlertsClient();

  let rawHits: RawDocumentHit[];
  if (event.querySelection) {
    const { query, index } = event.querySelection;
    logger.debug(`Preprocessing alerts for workflow execution from a query selection`);
    const { hits, total, totalRelation, truncated } = await fetchAlertsByQuery(
      { query, index },
      alertsClient,
      logger
    );
    if (truncated) {
      logger.warn(
        `Alert selection truncated to ${hits.length} of ${formatTrackedTotal(
          total,
          totalRelation
        )} matching alerts (maxDocs=${MAX_TRIGGER_EVENT_DOCS}).`
      );
    }
    rawHits = hits;
  } else if (event.alertIds && event.alertIds.length > 0) {
    logger.debug(`Preprocessing ${event.alertIds.length} alert(s) for workflow execution`);
    await alertsClient.ensureAllAlertsAuthorizedRead({
      alerts: event.alertIds.map(({ _id, _index }) => ({ id: _id, index: _index })),
    });
    rawHits = await fetchDocumentsByIds(event.alertIds, esClient, logger);
  } else {
    // Nothing to expand (e.g. a malformed selection) — leave inputs untouched.
    return inputs;
  }

  if (rawHits.length === 0) {
    throw new Error('No alerts found with the provided selection');
  }

  const alertHits = formatAlertHits(rawHits, ruleTypeRegistryMap);

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

/**
 * Expands a `document` trigger event (from either explicit ids or a query) into the
 * `event.documents` shape consumed by workflows. Pre-expanded `documents` are passed
 * through unchanged for backward compatibility with clients that embed the source.
 */
async function preprocessDocumentEvent(
  inputs: Record<string, unknown>,
  event: DocumentTriggerInput['event'],
  context: TriggerInputPreprocessingContext,
  logger: Logger
): Promise<Record<string, unknown>> {
  // Pre-expanded documents: nothing to fetch.
  if (event.documents && event.documents.length > 0) {
    return inputs;
  }

  const esClient = (await context.core).elasticsearch.client.asCurrentUser;

  let rawHits: RawDocumentHit[];
  if (event.querySelection) {
    const { query, index } = event.querySelection;
    logger.debug(`Preprocessing documents for workflow execution from a query selection`);
    const { hits, total, totalRelation, truncated } = await fetchDocumentsByQuery(
      { query, index },
      esClient,
      logger
    );
    if (truncated) {
      logger.warn(
        `Document selection truncated to ${hits.length} of ${formatTrackedTotal(
          total,
          totalRelation
        )} matching documents (maxDocs=${MAX_TRIGGER_EVENT_DOCS}).`
      );
    }
    rawHits = hits;
  } else if (event.documentIds && event.documentIds.length > 0) {
    logger.debug(`Preprocessing ${event.documentIds.length} document(s) for workflow execution`);
    rawHits = await fetchDocumentsByIds(event.documentIds, esClient, logger);
  } else {
    // Nothing to expand — leave inputs untouched.
    return inputs;
  }

  if (rawHits.length === 0) {
    throw new Error('No documents found with the provided selection');
  }

  const documents: DocumentEventEntry[] = rawHits.map(({ _id, _index, _source }) => ({
    id: _id,
    index: _index,
    timestamp: _source['@timestamp'],
    data: _source,
  }));

  return {
    ...inputs,
    event: {
      triggerType: 'document',
      documents,
      ...(event.query ? { query: event.query } : {}),
      ...(event.dataView ? { dataView: event.dataView } : {}),
    },
  };
}

/**
 * Preprocesses trigger inputs by expanding an `alert` or `document` trigger event from
 * either an explicit id selection (mget) or a query selection (using a point in time and
 * `search_after`), then shaping the fetched documents into the event format that workflows
 * consume. Inputs for any other trigger type (or an already-expanded event) are returned
 * unchanged.
 */
export async function preprocessTriggerInputs(
  inputs: Record<string, unknown>,
  context: TriggerInputPreprocessingContext,
  spaceId: string,
  logger: Logger
): Promise<Record<string, unknown>> {
  const event = inputs.event as { triggerType?: string } | undefined;
  if (!event || typeof event !== 'object') {
    return inputs;
  }

  if (event.triggerType === 'alert') {
    return preprocessAlertEvent(
      inputs,
      event as AlertTriggerInput['event'],
      context,
      spaceId,
      logger
    );
  }

  if (event.triggerType === 'document') {
    return preprocessDocumentEvent(inputs, event as DocumentTriggerInput['event'], context, logger);
  }

  return inputs;
}
