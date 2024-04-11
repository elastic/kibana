/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { useMemo, useCallback } from 'react';
import { RuleUpdatesBody, updateRule } from './update_rule';
import { parseRuleCircuitBreakerErrorMessage } from '../../../common/helpers';
import { useKibanaServices } from '../../contexts';
import { useRuleFormSelector } from '../../hooks';

export const useUpdateRuleApi = () => {
  const { http, toasts } = useKibanaServices();
  const ruleDefinition = useRuleFormSelector((state) => state.ruleDefinition);
  const ruleDetails = useRuleFormSelector((state) => state.ruleDetails);

  const rule: RuleUpdatesBody & { id: string } = useMemo(
    () => ({
      ...ruleDetails,
      ...ruleDefinition,
      actions: [],
    }),
    [ruleDefinition, ruleDetails]
  );

  return useCallback(async () => {
    try {
      const updatedRule = await updateRule({ http, rule, id: rule.id });
      toasts.addSuccess(
        i18n.translate('alertsUIShared.ruleForm.updateSuccessNotificationText', {
          defaultMessage: 'Updated rule "{ruleName}"',
          values: {
            ruleName: updatedRule.name,
          },
        })
      );
      return updatedRule;
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
