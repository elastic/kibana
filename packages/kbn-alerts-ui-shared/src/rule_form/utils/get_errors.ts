/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  RuleTypeModel,
  RuleFormErrors,
  ValidationResult,
  MinimumScheduleInterval,
} from '../../common';
import { parseDuration, formatDuration } from './parse_duration';
import {
  NAME_REQUIRED_TEXT,
  CONSUMER_REQUIRED_TEXT,
  RULE_TYPE_REQUIRED_TEXT,
  INTERVAL_REQUIRED_TEXT,
  INTERVAL_MINIMUM_TEXT,
  RULE_ALERT_DELAY_BELOW_MINIMUM_TEXT,
} from '../translations';
import { InitialRule } from '../types';

export function validateBaseProperties({
  rule,
  minimumScheduleInterval,
}: {
  rule: InitialRule;
  minimumScheduleInterval?: MinimumScheduleInterval;
}): ValidationResult {
  const validationResult = { errors: {} };

  const errors = {
    name: new Array<string>(),
    interval: new Array<string>(),
    consumer: new Array<string>(),
    ruleTypeId: new Array<string>(),
    actionConnectors: new Array<string>(),
    alertDelay: new Array<string>(),
  };

  validationResult.errors = errors;

  if (!rule.name) {
    errors.name.push(NAME_REQUIRED_TEXT);
  }

  if (rule.consumer === null) {
    errors.consumer.push(CONSUMER_REQUIRED_TEXT);
  }

  if (rule.schedule.interval.length < 2) {
    errors.interval.push(INTERVAL_REQUIRED_TEXT);
  } else if (minimumScheduleInterval && minimumScheduleInterval.enforce) {
    const duration = parseDuration(rule.schedule.interval);
    const minimumDuration = parseDuration(minimumScheduleInterval.value);
    if (duration < minimumDuration) {
      errors.interval.push(
        INTERVAL_MINIMUM_TEXT(formatDuration(minimumScheduleInterval.value, true))
      );
    }
  }

  if (!rule.ruleTypeId) {
    errors.ruleTypeId.push(RULE_TYPE_REQUIRED_TEXT);
  }

  if (rule.alertDelay?.active && rule.alertDelay?.active < 1) {
    errors.alertDelay.push(RULE_ALERT_DELAY_BELOW_MINIMUM_TEXT);
  }

  return validationResult;
}

export function getRuleErrors({
  rule,
  ruleTypeModel,
  minimumScheduleInterval,
  isServerless,
}: {
  rule: InitialRule;
  ruleTypeModel: RuleTypeModel | null;
  minimumScheduleInterval?: MinimumScheduleInterval;
  isServerless?: boolean;
}) {
  const ruleParamsErrors: RuleFormErrors = ruleTypeModel
    ? ruleTypeModel.validate(rule.params, isServerless).errors
    : {};

  const ruleBaseErrors = validateBaseProperties({
    rule,
    minimumScheduleInterval,
  }).errors as RuleFormErrors;

  const ruleErrors = {
    ...ruleParamsErrors,
    ...ruleBaseErrors,
  } as RuleFormErrors;

  return {
    ruleParamsErrors,
    ruleBaseErrors,
    ruleErrors,
  };
}
