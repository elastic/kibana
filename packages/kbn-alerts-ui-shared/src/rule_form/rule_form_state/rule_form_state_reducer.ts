/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RuleFormData, RuleFormState } from '../types';
import { validateRuleBase, validateRuleParams } from '../validation';

export type RuleFormStateReducerAction =
  | {
      type: 'setRule';
      payload: RuleFormData;
    }
  | {
      type: 'setRuleProperty';
      payload: {
        property: string;
        value: unknown;
      };
    }
  | {
      type: 'setName';
      payload: RuleFormData['name'];
    }
  | {
      type: 'setTags';
      payload: RuleFormData['tags'];
    }
  | {
      type: 'setParams';
      payload: RuleFormData['params'];
    }
  | {
      type: 'setParamsProperty';
      payload: {
        property: string;
        value: unknown;
      };
    }
  | {
      type: 'setSchedule';
      payload: RuleFormData['schedule'];
    }
  | {
      type: 'setAlertDelay';
      payload: RuleFormData['alertDelay'];
    }
  | {
      type: 'setNotifyWhen';
      payload: RuleFormData['notifyWhen'];
    }
  | {
      type: 'setConsumer';
      payload: RuleFormData['consumer'];
    }
  | {
      type: 'setMultiConsumer';
      payload: RuleFormState['multiConsumerSelection'];
    }
  | {
      type: 'setMetadata';
      payload: Record<string, unknown>;
    };

const getUpdateWithValidation =
  (ruleFormState: RuleFormState) =>
  (updater: () => RuleFormData): RuleFormState => {
    const { minimumScheduleInterval, selectedRuleTypeModel, multiConsumerSelection } =
      ruleFormState;

    const formData = updater();

    const formDataWithMultiConsumer = {
      ...formData,
      ...(multiConsumerSelection ? { consumer: multiConsumerSelection } : {}),
    };

    return {
      ...ruleFormState,
      formData,
      baseErrors: validateRuleBase({
        formData: formDataWithMultiConsumer,
        minimumScheduleInterval,
      }),
      paramsErrors: validateRuleParams({
        formData: formDataWithMultiConsumer,
        ruleTypeModel: selectedRuleTypeModel,
      }),
    };
  };

export const ruleFormStateReducer = (
  ruleFormState: RuleFormState,
  action: RuleFormStateReducerAction
): RuleFormState => {
  const { formData } = ruleFormState;
  const updateWithValidation = getUpdateWithValidation(ruleFormState);

  switch (action.type) {
    case 'setRule': {
      const { payload } = action;
      return updateWithValidation(() => payload);
    }
    case 'setRuleProperty': {
      const {
        payload: { property, value },
      } = action;
      return updateWithValidation(() => ({
        ...ruleFormState.formData,
        [property]: value,
      }));
    }
    case 'setName': {
      const { payload } = action;
      return updateWithValidation(() => ({
        ...formData,
        name: payload,
      }));
    }
    case 'setTags': {
      const { payload } = action;
      return updateWithValidation(() => ({
        ...formData,
        tags: payload,
      }));
    }
    case 'setParams': {
      const { payload } = action;
      return updateWithValidation(() => ({
        ...formData,
        params: payload,
      }));
    }
    case 'setParamsProperty': {
      const {
        payload: { property, value },
      } = action;
      return updateWithValidation(() => ({
        ...formData,
        params: {
          ...formData.params,
          [property]: value,
        },
      }));
    }
    case 'setSchedule': {
      const { payload } = action;
      return updateWithValidation(() => ({
        ...formData,
        schedule: payload,
      }));
    }
    case 'setAlertDelay': {
      const { payload } = action;
      return updateWithValidation(() => ({
        ...formData,
        alertDelay: payload,
      }));
    }
    case 'setNotifyWhen': {
      const { payload } = action;
      return updateWithValidation(() => ({
        ...formData,
        notifyWhen: payload,
      }));
    }
    case 'setConsumer': {
      const { payload } = action;
      return updateWithValidation(() => ({
        ...formData,
        consumer: payload,
      }));
    }
    case 'setMultiConsumer': {
      const { payload } = action;
      return {
        ...ruleFormState,
        multiConsumerSelection: payload,
      };
    }
    case 'setMetadata': {
      const { payload } = action;
      return {
        ...ruleFormState,
        metadata: payload,
      };
    }
    default: {
      return ruleFormState;
    }
  }
};
