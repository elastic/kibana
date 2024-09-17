/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ActionType } from '@kbn/actions-types';
import { configurationCheckResult, getLicenseCheckResult } from './get_license_check_result';
import { ActionConnector } from '../../common';

export interface IsEnabledResult {
  isEnabled: true;
}
export interface IsDisabledResult {
  isEnabled: false;
  message: string;
  messageCard: JSX.Element;
}

export const checkActionTypeEnabled = (
  actionType?: ActionType
): IsEnabledResult | IsDisabledResult => {
  if (actionType?.enabledInLicense === false) {
    return getLicenseCheckResult(actionType);
  }

  if (actionType?.enabledInConfig === false) {
    return configurationCheckResult;
  }

  return { isEnabled: true };
};

export const checkActionFormActionTypeEnabled = (
  actionType: ActionType,
  preconfiguredConnectors: ActionConnector[]
): IsEnabledResult | IsDisabledResult => {
  if (actionType?.enabledInLicense === false) {
    return getLicenseCheckResult(actionType);
  }

  if (
    actionType?.enabledInConfig === false &&
    // do not disable action type if it contains preconfigured connectors (is preconfigured)
    !preconfiguredConnectors.find(
      (preconfiguredConnector) => preconfiguredConnector.actionTypeId === actionType.id
    )
  ) {
    return configurationCheckResult;
  }

  return { isEnabled: true };
};
