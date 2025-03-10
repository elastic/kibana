/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ActionVariable } from '@kbn/alerting-types';
import {
  ActionVariables,
  OmitMessageVariablesType,
  REQUIRED_ACTION_VARIABLES,
  CONTEXT_ACTION_VARIABLES,
} from '@kbn/triggers-actions-ui-types';
import { pick } from 'lodash';
import {
  AlertProvidedActionVariableDescriptions,
  SummarizedAlertProvidedActionVariableDescriptions,
} from './action_variables';

type ActionVariablesWithoutName = Omit<ActionVariable, 'name'>;

const prefixKeys = (actionVariables: ActionVariable[], prefix: string): ActionVariable[] => {
  return actionVariables.map((actionVariable) => {
    return { ...actionVariable, name: `${prefix}${actionVariable.name}` };
  });
};

export const getSummaryAlertActionVariables = (): ActionVariable[] => {
  return transformContextVariables(SummarizedAlertProvidedActionVariableDescriptions);
};

export const getAlwaysProvidedActionVariables = (): ActionVariable[] => {
  return transformContextVariables(AlertProvidedActionVariableDescriptions);
};

const transformProvidedActionVariables = (
  actionVariables?: ActionVariables,
  omitMessageVariables?: OmitMessageVariablesType
): ActionVariable[] => {
  if (!actionVariables) {
    return [];
  }

  const filteredActionVariables: ActionVariables = omitMessageVariables
    ? omitMessageVariables === 'all'
      ? pick(actionVariables, REQUIRED_ACTION_VARIABLES)
      : pick(actionVariables, [...REQUIRED_ACTION_VARIABLES, ...CONTEXT_ACTION_VARIABLES])
    : actionVariables;

  const paramsVars = prefixKeys(filteredActionVariables.params, 'rule.params.');
  const contextVars = filteredActionVariables.context
    ? prefixKeys(filteredActionVariables.context, 'context.')
    : [];
  const stateVars = filteredActionVariables.state
    ? prefixKeys(filteredActionVariables.state, 'state.')
    : [];

  return contextVars.concat(paramsVars, stateVars);
};

// return a "flattened" list of action variables for an alertType
export const transformActionVariables = (
  actionVariables: ActionVariables,
  summaryActionVariables?: ActionVariables,
  omitMessageVariables?: OmitMessageVariablesType,
  isSummaryAction?: boolean
): ActionVariable[] => {
  if (isSummaryAction) {
    const alwaysProvidedVars = getSummaryAlertActionVariables();
    const transformedActionVars = transformProvidedActionVariables(
      summaryActionVariables,
      omitMessageVariables
    );
    return alwaysProvidedVars.concat(transformedActionVars);
  }

  const alwaysProvidedVars = getAlwaysProvidedActionVariables();
  const transformedActionVars = transformProvidedActionVariables(
    actionVariables,
    omitMessageVariables
  );
  return alwaysProvidedVars.concat(transformedActionVars);
};

const transformContextVariables = (
  variables: Record<string, ActionVariablesWithoutName>
): ActionVariable[] =>
  Object.entries(variables).map(([key, variable]) => ({ ...variable, name: key }));
