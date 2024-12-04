/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDuration } from './parse_duration';
import { DEFAULT_RULE_INTERVAL } from '../constants';
import { MinimumScheduleInterval, RuleTypeWithDescription } from '../common/types';
import { RuleFormData } from '../types';

const getInitialInterval = (interval: string) => {
  if (parseDuration(interval) > parseDuration(DEFAULT_RULE_INTERVAL)) {
    return interval;
  }
  return DEFAULT_RULE_INTERVAL;
};

export const getInitialSchedule = ({
  ruleType,
  minimumScheduleInterval,
  initialSchedule,
}: {
  ruleType: RuleTypeWithDescription;
  minimumScheduleInterval?: MinimumScheduleInterval;
  initialSchedule?: RuleFormData['schedule'];
}): RuleFormData['schedule'] => {
  if (initialSchedule) {
    return initialSchedule;
  }

  if (minimumScheduleInterval?.value) {
    return { interval: getInitialInterval(minimumScheduleInterval.value) };
  }

  if (ruleType.defaultScheduleInterval) {
    return { interval: ruleType.defaultScheduleInterval };
  }

  return { interval: DEFAULT_RULE_INTERVAL };
};
