/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RuleFormSchema, RuleFormState } from '../types';

export type RuleFormStateReducerAction =
  | {
      type: 'setRule';
      payload: RuleFormSchema;
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
      payload: RuleFormSchema['name'];
    }
  | {
      type: 'setTags';
      payload: RuleFormSchema['tags'];
    }
  | {
      type: 'setParams';
      payload: RuleFormSchema['params'];
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
      payload: RuleFormSchema['schedule'];
    }
  | {
      type: 'setAlertDelay';
      payload: RuleFormSchema['alertDelay'];
    }
  | {
      type: 'setNotifyWhen';
      payload: RuleFormSchema['notifyWhen'];
    }
  | {
      type: 'setConsumer';
      payload: RuleFormSchema['consumer'];
    }
  | {
      type: 'setMetadata';
      payload: Record<string, unknown>;
    };

export const ruleFormStateReducer = (
  ruleFormState: RuleFormState,
  action: RuleFormStateReducerAction
): RuleFormState => {
  const { state } = ruleFormState;

  switch (action.type) {
    case 'setRule': {
      const { payload } = action;
      return {
        ...ruleFormState,
        state: payload,
      };
    }
    case 'setRuleProperty': {
      const { payload } = action;
      const { property, value } = payload;
      return {
        ...ruleFormState,
        state: {
          ...ruleFormState.state,
          [property]: value,
        },
      };
    }
    case 'setName': {
      const { payload } = action;
      return {
        ...ruleFormState,
        state: {
          ...state,
          name: payload,
        },
      };
    }
    case 'setTags': {
      const { payload } = action;
      return {
        ...ruleFormState,
        state: {
          ...state,
          tags: payload,
        },
      };
    }
    case 'setParams': {
      const { payload } = action;
      return {
        ...ruleFormState,
        state: {
          ...state,
          params: payload,
        },
      };
    }
    case 'setParamsProperty': {
      const {
        payload: { property, value },
      } = action;
      return {
        ...ruleFormState,
        state: {
          ...state,
          params: {
            ...state.params,
            [property]: value,
          },
        },
      };
    }
    case 'setSchedule': {
      const { payload } = action;
      return {
        ...ruleFormState,
        state: {
          ...state,
          schedule: payload,
        },
      };
    }
    case 'setAlertDelay': {
      const { payload } = action;
      return {
        ...ruleFormState,
        state: {
          ...state,
          alertDelay: payload,
        },
      };
    }
    case 'setNotifyWhen': {
      const { payload } = action;
      return {
        ...ruleFormState,
        state: {
          ...state,
          notifyWhen: payload,
        },
      };
    }
    case 'setConsumer': {
      const { payload } = action;
      return {
        ...ruleFormState,
        state: {
          ...state,
          consumer: payload,
        },
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
