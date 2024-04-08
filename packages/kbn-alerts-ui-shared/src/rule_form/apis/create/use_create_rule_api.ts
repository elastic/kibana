/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useMemo, useCallback } from 'react';
import { createRule } from './create';
import { parseRuleCircuitBreakerErrorMessage } from '../../../common/helpers';
import { useRuleType, useKibanaServices } from '../../contexts';
import { useRuleFormSelector } from '../../hooks';

export const useCreateRuleApi = () => {
  const { id: ruleTypeId } = useRuleType();
  const { http, toasts } = useKibanaServices();
  const ruleDefinition = useRuleFormSelector((state) => state.ruleDefinition);
  const ruleDetails = useRuleFormSelector((state) => state.ruleDetails);

  const rule = useMemo(
    () => ({
      ...ruleDetails,
      ...omit(ruleDefinition, 'id'),
      ruleTypeId,
      actions: [],
    }),
    [ruleDefinition, ruleDetails, ruleTypeId]
  );

  return useCallback(async () => {
    try {
      const newRule = await createRule({ http, rule });
      toasts.addSuccess(
        i18n.translate('xpack.triggersActionsUI.sections.ruleAdd.saveSuccessNotificationText', {
          defaultMessage: 'Created rule "{ruleName}"',
          values: {
            ruleName: newRule.name,
          },
        })
      );
      return newRule;
    } catch (errorRes) {
      const message = parseRuleCircuitBreakerErrorMessage(
        errorRes.body?.message ||
          i18n.translate('alertsUIShared.ruleForm.defaultCreateRuleError', {
            defaultMessage: 'Error creating rule',
          })
      );
      toasts.addDanger({
        title: message.summary,
        ...(message.details && {
          text: message.details,
        }),
      });
      return null;
    }
  }, [rule, http, toasts]);
};
