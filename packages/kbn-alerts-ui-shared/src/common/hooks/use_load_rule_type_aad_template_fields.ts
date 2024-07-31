/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsFlat } from '@elastic/ecs';
import { ActionVariable } from '@kbn/alerting-types';
import type { HttpStart } from '@kbn/core-http-browser';
import { useQuery } from '@tanstack/react-query';
import { fetchRuleTypeAadTemplateFields, getDescription } from '../apis';

export interface UseLoadRuleTypeAadTemplateFieldProps {
  http: HttpStart;
  ruleTypeId: string;
  enabled: boolean;
}

export const useLoadRuleTypeAadTemplateField = (props: UseLoadRuleTypeAadTemplateFieldProps) => {
  const { http, ruleTypeId, enabled } = props;

  const queryFn = () => {
    return fetchRuleTypeAadTemplateFields({ http, ruleTypeId });
  };

  const {
    data = [],
    isLoading,
    isFetching,
    isInitialLoading,
  } = useQuery({
    queryKey: ['useLoadRuleTypeAadTemplateField', ruleTypeId],
    queryFn,
    select: (dataViewFields) => {
      return dataViewFields.map<ActionVariable>((d) => ({
        name: d.name,
        description: getDescription(d.name, EcsFlat),
      }));
    },
    refetchOnWindowFocus: false,
    enabled,
  });

  return {
    data,
    isInitialLoading,
    isLoading: isLoading || isFetching,
  };
};
