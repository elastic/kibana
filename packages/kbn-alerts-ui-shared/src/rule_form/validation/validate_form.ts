/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isObject } from 'lodash';
import { RuleTypeModel, RuleFormErrors, MinimumScheduleInterval, RuleFormData } from '../types';
import { parseDuration, formatDuration } from '../utils';
import {
  NAME_REQUIRED_TEXT,
  CONSUMER_REQUIRED_TEXT,
  RULE_TYPE_REQUIRED_TEXT,
  INTERVAL_REQUIRED_TEXT,
  INTERVAL_MINIMUM_TEXT,
  RULE_ALERT_DELAY_BELOW_MINIMUM_TEXT,
} from '../translations';

export function validateRuleBase({
  formData,
  minimumScheduleInterval,
}: {
  formData: RuleFormData;
  minimumScheduleInterval?: MinimumScheduleInterval;
}): RuleFormErrors {
  const errors = {
    name: new Array<string>(),
    interval: new Array<string>(),
    consumer: new Array<string>(),
    ruleTypeId: new Array<string>(),
    actionConnectors: new Array<string>(),
    alertDelay: new Array<string>(),
  };

  if (!formData.name) {
    errors.name.push(NAME_REQUIRED_TEXT);
  }

  if (!formData.consumer) {
    errors.consumer.push(CONSUMER_REQUIRED_TEXT);
  }

  if (formData.schedule.interval.length < 2) {
    errors.interval.push(INTERVAL_REQUIRED_TEXT);
  } else if (minimumScheduleInterval && minimumScheduleInterval.enforce) {
    const duration = parseDuration(formData.schedule.interval);
    const minimumDuration = parseDuration(minimumScheduleInterval.value);
    if (duration < minimumDuration) {
      errors.interval.push(
        INTERVAL_MINIMUM_TEXT(formatDuration(minimumScheduleInterval.value, true))
      );
    }
  }

  if (!formData.ruleTypeId) {
    errors.ruleTypeId.push(RULE_TYPE_REQUIRED_TEXT);
  }

  if (formData.alertDelay?.active && formData.alertDelay?.active < 1) {
    errors.alertDelay.push(RULE_ALERT_DELAY_BELOW_MINIMUM_TEXT);
  }

  return errors;
}

export const validateRuleParams = ({
  formData,
  ruleTypeModel,
  isServerless,
}: {
  formData: RuleFormData;
  ruleTypeModel: RuleTypeModel;
  isServerless?: boolean;
}): RuleFormErrors => {
  return ruleTypeModel.validate(formData.params, isServerless).errors;
};

export const hasObjectErrors: (errors: RuleFormErrors) => boolean = (errors) =>
  !!Object.values(errors).find((errorList) => {
    if (isObject(errorList)) return hasObjectErrors(errorList as RuleFormErrors);
    return errorList.length >= 1;
  });

export function isValidRule(
  formData: RuleFormData,
  errors: RuleFormErrors
): formData is RuleFormData {
  return !hasObjectErrors(errors);
}
