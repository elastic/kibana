/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { parseDuration, formatDuration } from '../../../common/helpers/parse_duration';
import {
  IErrorObject,
  RuleFormConfig,
  RuleFormValidationError,
  RuleTypeModel,
  RuleFormValidationErrorObject,
} from '../../types';
import {
  getStatusFromErrorObject,
  IncompleteError,
  InvalidError,
  isValidationErrorList,
  isValidationErrorObject,
} from '../../common/validation_error';
import { useRuleFormSelector } from '../../hooks';

export interface ValidateRuleDefinitionProps {
  config: RuleFormConfig;
  ruleTypeModel: RuleTypeModel;
}

const convertStringErrorsToIncomplete: (
  errors: string | string[] | IErrorObject
) => RuleFormValidationErrorObject = (errors) => {
  if (typeof errors === 'string') {
    return { errors: [IncompleteError(errors)] };
  }
  if (Array.isArray(errors)) {
    return { errors: errors.map((error) => IncompleteError(error)) };
  }
  return {
    errors: Object.entries(errors).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: convertStringErrorsToIncomplete(value),
      }),
      {}
    ),
  };
};

const convertStringErrorsToInvalid: (
  errors: string | string[] | IErrorObject
) => RuleFormValidationErrorObject = (errors) => {
  if (typeof errors === 'string') {
    return { errors: [InvalidError(errors)] };
  }
  if (Array.isArray(errors)) {
    return { errors: errors.map((error) => InvalidError(error)) };
  }
  return {
    errors: Object.entries(errors).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: convertStringErrorsToInvalid(value),
      }),
      {}
    ),
  };
};

export const useValidateRuleDefinition = ({
  config,
  ruleTypeModel,
}: ValidateRuleDefinitionProps) => {
  const ruleDefinition = useRuleFormSelector((state) => state.ruleDefinition);
  const { haveRuleParamsChanged } = useRuleFormSelector((state) => state.meta);
  const { errors: paramsErrors } = useMemo<RuleFormValidationErrorObject>(() => {
    const { errors } = ruleTypeModel.validate(ruleDefinition.params);
    if (isValidationErrorList(errors) || isValidationErrorObject(errors)) {
      return { errors } as RuleFormValidationErrorObject;
    }
    if (!errors || errors.length === 0) {
      return { errors: new Array<RuleFormValidationError>() };
    }
    if (!haveRuleParamsChanged) {
      /**
       * Backwards compaitibility for V1 error validation
       * On init, convert all string errors to IncompleteError. They should only be marked as
       * invalid if the user has interacted with the field.
       */
      return convertStringErrorsToIncomplete(errors);
    }
    return convertStringErrorsToInvalid(errors);
  }, [ruleDefinition.params, ruleTypeModel, haveRuleParamsChanged]);

  return useMemo(() => {
    const {
      schedule: { interval },
      consumer,
      alertDelay,
    } = ruleDefinition;

    const errors = {
      params: paramsErrors as RuleFormValidationErrorObject,
      schedule: { interval: new Array<RuleFormValidationError>() },
      consumer: new Array<RuleFormValidationError>(),
      alertDelay: new Array<RuleFormValidationError>(),
    };

    if (consumer === null) {
      errors.consumer.push(
        IncompleteError(
          i18n.translate('alertsUIShared.ruleForm.ruleDefinition.error.requiredConsumerText', {
            defaultMessage: 'Scope is required.',
          })
        )
      );
    }

    if (interval.length < 2) {
      errors.schedule.interval.push(
        IncompleteError(
          i18n.translate('alertsUIShared.ruleForm.ruleDefinition.error.requiredIntervalText', {
            defaultMessage: 'Check interval is required.',
          })
        )
      );
    } else {
      try {
        const duration = parseDuration(interval);
        if (config.minimumScheduleInterval && config.minimumScheduleInterval.enforce) {
          const minimumDuration = parseDuration(config.minimumScheduleInterval.value);
          if (duration < minimumDuration) {
            errors.schedule.interval.push(
              InvalidError(
                i18n.translate('alertsUIShared.ruleForm.ruleDefinition.error.belowMinimumText', {
                  defaultMessage: 'Interval must be at least {minimum}.',
                  values: {
                    minimum: formatDuration(config.minimumScheduleInterval.value, true),
                  },
                })
              )
            );
          }
        }
      } catch (e) {
        errors.schedule.interval.push(
          InvalidError(
            i18n.translate('alertsUIShared.ruleForm.ruleDefinition.error.invalidIntervalText', {
              defaultMessage: 'Invalid interval format.',
            })
          )
        );
      }
    }

    if (alertDelay && (typeof alertDelay.active !== 'number' || isNaN(alertDelay.active))) {
      errors.alertDelay.push(
        InvalidError(
          i18n.translate('alertsUIShared.ruleForm.ruleDefinition.error.invalidAlertDelayText', {
            defaultMessage: 'Alert delay must be a number if set.',
          })
        )
      );
    }

    return {
      errors,
      status: getStatusFromErrorObject(errors),
    };
  }, [ruleDefinition, config, paramsErrors]);
};

export type RuleDefinitionValidation = ReturnType<typeof useValidateRuleDefinition>;
