/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ActionTypeModel, RuleTypeWithDescription } from '../../common/types';

export const getDefaultParams = ({
  group,
  ruleType,
  actionTypeModel,
}: {
  group: string;
  actionTypeModel: ActionTypeModel;
  ruleType: RuleTypeWithDescription;
}) => {
  if (group === ruleType.recoveryActionGroup.id) {
    return actionTypeModel.defaultRecoveredActionParams;
  } else {
    return actionTypeModel.defaultActionParams;
  }
};
