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
  ON_CLICK_ROW,
  ON_APPLY_FILTER,
  ON_SELECT_RANGE,
  ON_CLICK_VALUE,
  MULTI_VALUE_CLICK_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';

export interface VisEventToTrigger {
  ['applyFilter']: typeof ON_APPLY_FILTER;
  ['brush']: typeof ON_SELECT_RANGE;
  ['filter']: typeof ON_CLICK_VALUE;
  ['multiFilter']: typeof MULTI_VALUE_CLICK_TRIGGER;
  ['tableRowContextMenuClick']: typeof ON_CLICK_ROW;
  ['alertRule']: typeof ALERT_RULE_TRIGGER;
}

export const VIS_EVENT_TO_TRIGGER: VisEventToTrigger = {
  applyFilter: ON_APPLY_FILTER,
  brush: ON_SELECT_RANGE,
  filter: ON_CLICK_VALUE,
  multiFilter: MULTI_VALUE_CLICK_TRIGGER,
  tableRowContextMenuClick: ON_CLICK_ROW,
  alertRule: ALERT_RULE_TRIGGER,
};
