/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@tanstack/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import { resolveRule } from '../apis/resolve_rule';
import { RuleFormData } from '../../types';

export interface UseResolveProps {
  http: HttpStart;
  id?: string;
  cacheTime?: number;
}

export const useResolveRule = (props: UseResolveProps) => {
  const { id, http, cacheTime } = props;

  const queryFn = () => {
    if (id) {
      return resolveRule({ http, id });
    }
  };

  const { data, isSuccess, isFetching, isLoading, isInitialLoading, isError, error } = useQuery({
    queryKey: ['useResolveRule', id],
    queryFn,
    enabled: !!id,
    cacheTime,
    select: (rule): RuleFormData | null => {
      if (!rule) {
        return null;
      }
      return {
        ...rule,
        ...(rule.alertDelay ? { alertDelay: rule.alertDelay } : {}),
        ...(rule.notifyWhen ? { notifyWhen: rule.notifyWhen } : {}),
      };
    },
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    data,
    isLoading: isLoading || isFetching,
    isInitialLoading,
    isSuccess,
    isError,
    error,
  };
};
