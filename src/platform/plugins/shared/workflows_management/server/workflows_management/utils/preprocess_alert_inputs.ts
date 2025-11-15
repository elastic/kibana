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
import type { Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { set } from '@kbn/safer-lodash-set';
import signalAadMapping from './signal_aad_mapping.json';
import { getWorkflowsConnectorAdapter } from '../../connectors/workflows';

interface AlertSelection {
  _id: string;
  _index: string;
}

interface AlertTriggerInput {
  event: {
    alertIds: AlertSelection[];
    triggerType: 'alert';
  };
}

interface Rule {
  id: string;
  name: string;
  tags: string[];
  consumer: string;
  producer: string;
  ruleTypeId: string;
}

/**
 * Constructs the signal object from kibana.alert fields (legacy format for security alerts).
 * Mirrors the logic in convertToLegacyAlert from the security solution plugin.
 * Since we can't import from the security solution plugin, we maintain our own copy
 * of signal_aad_mapping.json and reimplement the same transformation logic.
 */
function constructSignalObject(
  expandedAlert: Record<string, unknown>
): Record<string, unknown> | undefined {
  const signal: Record<string, unknown> = {};

  for (const [signalPath, alertPath] of Object.entries(signalAadMapping)) {
    const value = get(expandedAlert, alertPath);
    if (value !== undefined) {
      set(signal, signalPath, value);
    }
  }

  return Object.keys(signal).length > 0 ? signal : undefined;
}

/**
 * Extracts rule information from an alert's _source
 */
function extractRuleFromAlert(alert: Record<string, unknown>): Rule | null {
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
function extractRulesFromAlerts(alertHits: AlertHit[]): Map<string, Rule> {
  const rulesByUuid = new Map<string, Rule>();
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
function selectPrimaryRule(rulesByUuid: Map<string, Rule>, logger: Logger): Rule {
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
  esClient: ElasticsearchClient,
  alertIds: AlertSelection[],
  logger: Logger
): Promise<AlertHit[]> {
  if (alertIds.length === 0) {
    return [];
  }

  try {
    const body: Record<string, unknown> = {
      docs: alertIds.map(({ _id, _index }) => ({
        _id,
        _index,
      })),
    };

    const response = await esClient.mget(body);

    const alerts: AlertHit[] = [];
    for (let i = 0; i < response.docs.length; i++) {
      const doc = response.docs[i];
      if ('found' in doc && doc.found && '_source' in doc && doc._source) {
        const source = doc._source as Record<string, unknown>;
        const expandedSource = expandFlattenedAlert(source);
        const signalObject = constructSignalObject(expandedSource);

        const alertHit = {
          _id: alertIds[i]._id,
          _index: alertIds[i]._index,
          ...(signalObject ? signalObject : {}),
          ...expandedSource,
        } as AlertHit;
        alerts.push(alertHit);
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
 * using the same logic as buildActionParams from getWorkflowsConnectorAdapter
 */
export async function preprocessAlertInputs(
  inputs: Record<string, unknown>,
  spaceId: string,
  esClient: ElasticsearchClient,
  logger: Logger,
  workflowId?: string
): Promise<Record<string, unknown>> {
  const event = inputs.event as AlertTriggerInput['event'] | undefined;
  if (!event || event.triggerType !== 'alert' || !event.alertIds || event.alertIds.length === 0) {
    return inputs;
  }

  logger.debug(`Preprocessing ${event.alertIds.length} alert(s) for workflow execution`);

  const alertHits = await fetchAlerts(esClient, event.alertIds, logger);

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

  const adapter = getWorkflowsConnectorAdapter();
  const transformedParams = adapter.buildActionParams({
    alerts: summarizedAlerts,
    rule: primaryRule,
    params: {
      subAction: 'run' as const,
      subActionParams: {
        workflowId: workflowId || 'test',
      },
    },
    spaceId,
    ruleUrl: undefined,
  });

  const transformedEvent = (transformedParams.subActionParams?.inputs as { event?: unknown })
    ?.event;

  if (!transformedEvent) {
    throw new Error('Failed to transform alert inputs using buildActionParams');
  }

  return {
    ...inputs,
    event: transformedEvent,
  };
}
