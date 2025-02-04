/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef } from 'react';
import { isEmpty } from 'lodash';
import { ActionVariable } from '@kbn/alerting-types';
import type { HttpStart } from '@kbn/core-http-browser';
import { useQuery } from '@tanstack/react-query';
import {
  fetchRuleTypeAadTemplateFields,
  getDescription,
} from '@kbn/alerts-ui-shared/src/common/apis';

export interface UseLoadRuleTypeAadTemplateFieldProps {
  http: HttpStart;
  ruleTypeId?: string;
  enabled: boolean;
  cacheTime?: number;
}

export const useLoadRuleTypeAadTemplateField = (props: UseLoadRuleTypeAadTemplateFieldProps) => {
  const ecsFlat = useRef<Record<string, any>>({});
  const { http, ruleTypeId, enabled, cacheTime } = props;

  const queryFn = async () => {
    if (!ruleTypeId) {
      return;
    }
    if (isEmpty(ecsFlat.current)) {
      // If we use import { EcsFlat } from '@elastic/ecs' then it will sometimes balloon the bundle size
      // by about 1MB, or not, depending on how Webpack is feeling today. If you delete this dynamic import,
      // it's possible that it won't make the bundle size explode, and then you will commit that change, and
      // we will all continue to live our lives safe and secure, falsely believing that the danger has passed,
      // until one day somebody makes another change to this package and, for mysterious, unknowable reasons,
      // Webpack decides that today the bundle size shall be engorged once again.
      // To avoid all that maybe just don't delete this dynamic import.
      ecsFlat.current = await import('@elastic/ecs').then((ecs) => ecs.EcsFlat);
    }

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
      return dataViewFields?.map<ActionVariable>((d) => ({
        name: d.name,
        description: getDescription(d.name, ecsFlat.current),
      }));
    },
    cacheTime,
    refetchOnWindowFocus: false,
    enabled,
  });

  return {
    data,
    isInitialLoading,
    isLoading: isLoading || isFetching,
  };
};
