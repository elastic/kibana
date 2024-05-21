/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useQuery } from '@tanstack/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import { resolveRule } from '../apis';
import { RuleFormData } from '../../rule_form';

export interface UseResolveProps {
  http: HttpStart;
  id: string;
}

export const useResolveRule = (props: UseResolveProps) => {
  const { id, http } = props;

  const queryFn = () => {
    return resolveRule({ http, id });
  };

  const { data, isSuccess, isFetching, isLoading, isError, error } = useQuery({
    queryKey: ['useResolveRule'],
    queryFn,
    select: (rule): RuleFormData => {
      return {
        ...rule,
        ...(rule.alertDelay ? { alertDelay: rule.alertDelay } : {}),
        ...(rule.notifyWhen ? { notifyWhen: rule.notifyWhen } : {}),
      };
    },
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading: isLoading || isFetching,
    isSuccess,
    isError,
    error,
  };
};
