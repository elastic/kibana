/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get, isString } from 'lodash';
import type { AlertHit, CombinedSummarizedAlerts } from '@kbn/alerting-plugin/server/types';
import type { Logger } from '@kbn/core/server';
import { isRecord } from '@kbn/workflows-yaml';
import { parseTriggerSelections } from './parse_trigger_selections';
import type {
  AlertEventRule,
  AlertSelection,
  AlertTriggerInput,
} from '../../../../../common/types/alert_types';
import { buildAlertEvent } from '../../../../../common/utils/build_alert_event';
import { loadAlertDocuments } from '../../../lib/load_alert_documents';
import { WorkflowTriggerInputError } from '../../../workflow_trigger_input_error';
import type { AlertPreprocessingContext } from '../../../workflows_management_api';

/** An alert trigger `event` that carries an `alertIds` selection, which is not validated yet. */
type UnvalidatedAlertTriggerEvent = Pick<AlertTriggerInput['event'], 'triggerType'> & {
  alertIds: NonNullable<unknown>;
};

const isAlertTriggerEvent = (event: unknown): event is UnvalidatedAlertTriggerEvent =>
  isRecord(event) && event.triggerType === 'alert' && event.alertIds != null;

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
  context: AlertPreprocessingContext,
  logger: Logger
): Promise<AlertHit[]> {
  const { alerts } = await loadAlertDocuments({
    alerts: { selections: alertIds },
    esClient: (await context.core).elasticsearch.client.asCurrentUser,
    ruleTypes: (await context.alerting).listTypes(),
    logger,
  });

  return alerts as AlertHit[];
}

/**
 * Preprocesses alert inputs by fetching full alert documents and transforming them
 * into the standardized alert event format using buildAlertEvent
 */
export async function preprocessAlertInputs(
  inputs: Record<string, unknown>,
  context: AlertPreprocessingContext,
  spaceId: string,
  logger: Logger
): Promise<Record<string, unknown>> {
  const { event } = inputs;
  if (!isAlertTriggerEvent(event)) {
    return inputs;
  }

  const selections = parseTriggerSelections({ value: event.alertIds, kind: 'alertIds' });
  if (selections.length === 0) {
    return inputs;
  }

  logger.debug(`Preprocessing ${selections.length} alert(s) for workflow execution`);

  const alertHits = await fetchAlerts(selections, context, logger);

  if (alertHits.length === 0) {
    throw new WorkflowTriggerInputError('No alerts found with the provided IDs');
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
