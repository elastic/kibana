/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERT_RULE_TRIGGER,
  ROW_CLICK_TRIGGER,
  APPLY_FILTER_TRIGGER,
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
  MULTI_VALUE_CLICK_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';

export interface VisEventToTrigger {
  ['applyFilter']: typeof APPLY_FILTER_TRIGGER;
  ['brush']: typeof SELECT_RANGE_TRIGGER;
  ['filter']: typeof VALUE_CLICK_TRIGGER;
  ['multiFilter']: typeof MULTI_VALUE_CLICK_TRIGGER;
  ['tableRowContextMenuClick']: typeof ROW_CLICK_TRIGGER;
  ['alertRule']: typeof ALERT_RULE_TRIGGER;
}

export const VIS_EVENT_TO_TRIGGER: VisEventToTrigger = {
  applyFilter: APPLY_FILTER_TRIGGER,
  brush: SELECT_RANGE_TRIGGER,
  filter: VALUE_CLICK_TRIGGER,
  multiFilter: MULTI_VALUE_CLICK_TRIGGER,
  tableRowContextMenuClick: ROW_CLICK_TRIGGER,
  alertRule: ALERT_RULE_TRIGGER,
};
