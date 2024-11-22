/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ES_QUERY_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  RuleCreationValidConsumer,
  AlertConsumers,
} from '@kbn/rule-data-utils';
import { RuleNotifyWhen } from '@kbn/alerting-types';
import { RuleFormData } from './types';

export const DEFAULT_RULE_INTERVAL = '1m';

export const ALERTING_FEATURE_ID = 'alerts';

export const DEFAULT_FREQUENCY = {
  notifyWhen: RuleNotifyWhen.CHANGE,
  throttle: null,
  summary: false,
};

export const getDefaultFormData = ({
  ruleTypeId,
  name,
  consumer,
  schedule,
  actions,
}: {
  ruleTypeId: RuleFormData['ruleTypeId'];
  name: RuleFormData['name'];
  consumer: RuleFormData['consumer'];
  actions: RuleFormData['actions'];
  schedule?: RuleFormData['schedule'];
}) => {
  return {
    tags: [],
    params: {},
    schedule: schedule || {
      interval: DEFAULT_RULE_INTERVAL,
    },
    consumer,
    ruleTypeId,
    name,
    actions,
    alertDelay: { active: 1 },
  };
};

export const MULTI_CONSUMER_RULE_TYPE_IDS = [
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
];

export const DEFAULT_VALID_CONSUMERS: RuleCreationValidConsumer[] = [
  AlertConsumers.LOGS,
  AlertConsumers.INFRASTRUCTURE,
  'stackAlerts',
  'alerts',
];

export const createRuleRoute = '/rule/create/:ruleTypeId' as const;
export const editRuleRoute = '/rule/edit/:id' as const;
