/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { ToastsStart, HttpStart } from '@kbn/core/public';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { EMPTY_AAD_FIELDS } from '../constants';
import { fetchAadFields } from '../apis/fetch_aad_fields';

export interface UseRuleAADFieldsProps {
  ruleTypeId?: string;
  http: HttpStart;
  toasts: ToastsStart;
}

export interface UseRuleAADFieldsResult {
  aadFields: DataViewField[];
  loading: boolean;
}

export function useRuleAADFields(props: UseRuleAADFieldsProps): UseRuleAADFieldsResult {
  const { ruleTypeId, http, toasts } = props;

  const queryAadFieldsFn = () => {
    return fetchAadFields({ http, ruleTypeId });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('alertsUIShared.hooks.useRuleAADFields.errorMessage', {
        defaultMessage: 'Unable to load alert fields per rule type',
      })
    );
  };

  const {
    data: aadFields = EMPTY_AAD_FIELDS,
    isInitialLoading,
    isLoading,
  } = useQuery({
    queryKey: ['loadAlertAadFieldsPerRuleType', ruleTypeId],
    queryFn: queryAadFieldsFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    enabled: ruleTypeId !== undefined,
  });

  return useMemo(
    () => ({
      aadFields,
      loading: ruleTypeId === undefined ? false : isInitialLoading || isLoading,
    }),
    [aadFields, isInitialLoading, isLoading, ruleTypeId]
  );
}
