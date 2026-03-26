/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import {
  ALERT_RULE_TYPE_ID,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  EVENT_KIND,
} from '@kbn/rule-data-utils';

const ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID = 'attack_discovery_ad_hoc_rule_type_id' as const;

/**
 * Returns true if the document is a security alert — i.e. event.kind is 'signal'
 * and the rule type is not an attack discovery rule type.
 */
export const isAlertDocument = (record: DataTableRecord): boolean => {
  if (getFieldValue(record, EVENT_KIND) !== 'signal') return false;
  const ruleTypeId = getFieldValue(record, ALERT_RULE_TYPE_ID);
  return (
    ruleTypeId !== ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID &&
    ruleTypeId !== ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID
  );
};
