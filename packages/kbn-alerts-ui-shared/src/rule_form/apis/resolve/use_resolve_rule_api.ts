/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibanaServices } from '../../contexts';
import { resolveRule } from './resolve_rule';
import { RuleFormRule } from '../../types';

export const useResolveRuleApi = ({
  ruleId,
  onSuccess,
}: {
  ruleId: string;
  onSuccess: (result: RuleFormRule) => void;
}) => {
  const { http, toasts } = useKibanaServices();
  const [rule, setRule] = useState<RuleFormRule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRule = async () => {
      try {
        const resolvedRule = await resolveRule({ ruleId, http });
        setRule(resolvedRule);
        onSuccess(resolvedRule);
      } catch (errorRes) {
        toasts.addDanger(
          i18n.translate('alertsUIShared.ruleForm.resolveError', {
            defaultMessage: 'Unable to load rule ID {ruleId}: {error}',
            values: { ruleId, error: errorRes.message },
          })
        );
      }
      setIsLoading(false);
    };

    fetchRule();
  }, [ruleId, onSuccess, http, toasts]);

  return { rule, isLoading };
};
