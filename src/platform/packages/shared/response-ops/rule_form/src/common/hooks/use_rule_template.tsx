/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';

import type { HttpStart } from '@kbn/core-http-browser';
import { loadRuleTemplate } from '../apis/create_rule_from_template';

export interface UseRuleTemplateProps {
  http: HttpStart;
  templateId?: string;
}

export function useRuleTemplate(props: UseRuleTemplateProps) {
  const { http, templateId } = props;

  const queryFn = () => {
    if (!templateId) {
      throw new Error('templateId not defined');
    }
    return loadRuleTemplate({ http, templateId });
  };
  const enabled = !!templateId && templateId !== 'undefined';
  const { data, error, isFetching, isError, isLoadingError, isLoading } = useQuery({
    queryKey: ['getRuleTemplate', templateId],
    queryFn,
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    isLoading: enabled && (isLoading || isFetching),
    isError: isError || isLoadingError,
    error,
    data,
  };
}
