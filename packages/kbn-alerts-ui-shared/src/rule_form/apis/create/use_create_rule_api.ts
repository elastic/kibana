/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useStore } from 'react-redux';
import { useCallback } from 'react';
import { createRule, RuleCreateBody } from './create_rule';
import { parseRuleCircuitBreakerErrorMessage } from '../../../common/helpers';
import { useRuleType, useKibanaServices } from '../../contexts';
import { selectRuleForSave } from '../../store';

export const useCreateRuleApi = () => {
  const { id: ruleTypeId } = useRuleType();
  const { http, toasts } = useKibanaServices();
  const store = useStore();

  return useCallback(async () => {
    const storedRule = selectRuleForSave(store.getState());
    const rule: RuleCreateBody = {
      ...omit(storedRule, 'id'),
      ruleTypeId,
    };
    try {
      const newRule = await createRule({ http, rule });
      toasts.addSuccess(
        i18n.translate('alertsUIShared.ruleForm.createSuccessNotificationText', {
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
  }, [store, ruleTypeId, http, toasts]);
};
