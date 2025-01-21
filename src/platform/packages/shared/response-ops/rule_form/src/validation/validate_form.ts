/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isObject } from 'lodash';
import { i18n } from '@kbn/i18n';
import { RuleFormData } from '../types';
import { parseDuration, formatDuration } from '../utils';
import {
  NAME_REQUIRED_TEXT,
  CONSUMER_REQUIRED_TEXT,
  RULE_TYPE_REQUIRED_TEXT,
  INTERVAL_REQUIRED_TEXT,
  INTERVAL_MINIMUM_TEXT,
  RULE_ALERT_DELAY_BELOW_MINIMUM_TEXT,
} from '../translations';
import {
  MinimumScheduleInterval,
  RuleFormActionsErrors,
  RuleFormBaseErrors,
  RuleFormParamsErrors,
  RuleTypeModel,
  RuleUiAction,
} from '../common';

export const validateAction = ({ action }: { action: RuleUiAction }): RuleFormActionsErrors => {
  const errors = {
    filterQuery: new Array<string>(),
  };

  if ('alertsFilter' in action) {
    const query = action?.alertsFilter?.query;
    if (!query) {
      return errors;
    }
    if (!query.filters.length && !query.kql) {
      errors.filterQuery.push(
        i18n.translate('responseOpsRuleForm.ruleForm.actionsForm.requiredFilterQuery', {
          defaultMessage: 'A custom query is required.',
        })
      );
    }
  }
  return errors;
};

export function validateRuleBase({
  formData,
  minimumScheduleInterval,
}: {
  formData: RuleFormData;
  minimumScheduleInterval?: MinimumScheduleInterval;
}): RuleFormBaseErrors {
  const errors = {
    name: new Array<string>(),
    interval: new Array<string>(),
    consumer: new Array<string>(),
    ruleTypeId: new Array<string>(),
    actionConnectors: new Array<string>(),
    alertDelay: new Array<string>(),
    tags: new Array<string>(),
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

  if (!formData.alertDelay || isNaN(formData.alertDelay.active) || formData.alertDelay.active < 1) {
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
}): RuleFormParamsErrors => {
  return ruleTypeModel.validate(formData.params, isServerless).errors;
};

export const hasRuleBaseErrors = (errors: RuleFormBaseErrors) => {
  return Object.values(errors).some((error: string[]) => error.length > 0);
};

export const hasActionsError = (actionsErrors: Record<string, RuleFormActionsErrors>) => {
  return Object.values(actionsErrors).some((errors: RuleFormActionsErrors) => {
    return Object.values(errors).some((error: string[]) => error.length > 0);
  });
};

export const hasParamsErrors = (errors: RuleFormParamsErrors | string | string[]): boolean => {
  let hasError = false;

  if (typeof errors === 'string' && errors.trim() !== '') {
    hasError = true;
  }

  if (Array.isArray(errors)) {
    errors.forEach((error) => {
      hasError = hasError || hasParamsErrors(error);
    });
  }

  if (isObject(errors)) {
    Object.entries(errors).forEach(([_, value]) => {
      hasError = hasError || hasParamsErrors(value);
    });
  }

  return hasError;
};

export const hasActionsParamsErrors = (
  actionsParamsErrors: Record<string, RuleFormParamsErrors>
) => {
  return Object.values(actionsParamsErrors).some((errors: RuleFormParamsErrors) => {
    return hasParamsErrors(errors);
  });
};

export const hasRuleErrors = ({
  baseErrors,
  paramsErrors,
  actionsErrors,
  actionsParamsErrors,
}: {
  baseErrors: RuleFormBaseErrors;
  paramsErrors: RuleFormParamsErrors;
  actionsErrors: Record<string, RuleFormActionsErrors>;
  actionsParamsErrors: Record<string, RuleFormParamsErrors>;
}): boolean => {
  return (
    hasRuleBaseErrors(baseErrors) ||
    hasParamsErrors(paramsErrors) ||
    hasActionsError(actionsErrors) ||
    hasActionsParamsErrors(actionsParamsErrors)
  );
};
