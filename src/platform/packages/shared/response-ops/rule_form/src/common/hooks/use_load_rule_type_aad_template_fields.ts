/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionVariable } from '@kbn/alerting-types';
import { useRef } from 'react';
import { isEmpty } from 'lodash';
import type { HttpStart } from '@kbn/core-http-browser';
import { useQuery } from '@tanstack/react-query';
import {
  fetchRuleTypeAadTemplateFields,
  getDescription,
} from '@kbn/alerts-ui-shared/src/common/apis';
import { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';

export interface UseLoadRuleTypeAadTemplateFieldProps {
  http: HttpStart;
  ruleTypeId?: string;
  enabled: boolean;
  cacheTime?: number;
  fieldsMetadata?: FieldsMetadataPublicStart;
}

export const useLoadRuleTypeAadTemplateField = (props: UseLoadRuleTypeAadTemplateFieldProps) => {
  const ecsFlat = useRef<Record<string, any>>({});
  const { http, ruleTypeId, enabled, cacheTime, fieldsMetadata } = props;

  const queryFn = async () => {
    if (!ruleTypeId) {
      return;
    }

    if (isEmpty(ecsFlat.current)) {
      const fmClient = await fieldsMetadata?.getClient();
      if (fmClient) {
        const { fields } = await fmClient.find({});
        ecsFlat.current = fields;
      }
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
