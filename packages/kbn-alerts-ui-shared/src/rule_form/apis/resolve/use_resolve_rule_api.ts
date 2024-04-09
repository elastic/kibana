/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { useKibanaServices } from '../../contexts';
import { resolveRule } from './resolve_rule';

export const useResolveRuleApi = ({
  ruleId,
  enabled = true,
  onSuccess,
}: {
  ruleId: string;
  onSuccess: (rule: ResolvedRule) => void;
  enabled?: boolean;
}) => {
  const { http, toasts } = useKibanaServices();

  const { data, isSuccess, isLoading } = useQuery({
    enabled,
    queryKey: ['resolveRule'],
    queryFn: async () => {
      const result = await resolveRule({ ruleId, http });
      onSuccess(result);
      return result;
    },
    onError: (errorRes: Error) => {
      if (errorRes) {
        toasts.addDanger(
          i18n.translate('alertsUIShared.ruleForm.resolveError', {
            defaultMessage: 'Unable to load rule ID {ruleId}: {error}',
            values: { ruleId, error: errorRes.message },
          })
        );
      }
    },
    refetchOnWindowFocus: false,
  });

  return { rule: data, isSuccess, isLoading };
};
