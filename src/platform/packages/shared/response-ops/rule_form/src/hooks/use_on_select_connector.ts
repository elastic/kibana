/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ActionConnector } from '@kbn/alerts-ui-shared';
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useRuleFormDispatch, useRuleFormState } from '.';
import { RuleFormParamsErrors } from '../common/types';
import { DEFAULT_FREQUENCY } from '../constants';
import { getDefaultParams } from '../utils';

export const useOnSelectConnector = ({ onClose }: { onClose: () => void }) => {
  const {
    plugins: { actionTypeRegistry },
    selectedRuleType,
  } = useRuleFormState();

  const dispatch = useRuleFormDispatch();
  return useCallback(
    async (connector: ActionConnector) => {
      const { id, actionTypeId } = connector;
      const uuid = uuidv4();
      const group = selectedRuleType.defaultActionGroupId;
      const actionTypeModel = actionTypeRegistry.get(actionTypeId);

      const params =
        getDefaultParams({
          group,
          ruleType: selectedRuleType,
          actionTypeModel,
        }) || {};

      dispatch({
        type: 'addAction',
        payload: {
          id,
          actionTypeId,
          uuid,
          params,
          group,
          frequency: DEFAULT_FREQUENCY,
        },
      });

      const res: { errors: RuleFormParamsErrors } = await actionTypeRegistry
        .get(actionTypeId)
        ?.validateParams(params);

      dispatch({
        type: 'setActionParamsError',
        payload: {
          uuid,
          errors: res.errors,
        },
      });

      onClose();
    },
    [dispatch, onClose, selectedRuleType, actionTypeRegistry]
  );
};
