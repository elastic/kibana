/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/common';
import { AlertConsumers, ValidFeatureId } from '@kbn/rule-data-utils';
import type { ToastsStart, HttpStart } from '@kbn/core/public';

import { useQuery } from '@tanstack/react-query';
import { useFetchAlertsFieldsQuery } from './use_fetch_alerts_fields_query';
import { fetchAlertIndexNames } from '../apis/fetch_alert_index_names';

export interface UseAlertDataViewResult {
  dataViews?: DataView[];
  loading: boolean;
}

export interface UseAlertDataViewProps {
  featureIds: ValidFeatureId[];
  http: HttpStart;
  dataViewsService: DataViewsContract;
  toasts: ToastsStart;
}

export function useAlertDataView(props: UseAlertDataViewProps): UseAlertDataViewResult {
  const { http, dataViewsService, toasts, featureIds } = props;

  const [dataViews, setDataViews] = useState<DataView[]>([]);
  const features = featureIds.sort().join(',');
  const isOnlySecurity = featureIds.length === 1 && featureIds.includes(AlertConsumers.SIEM);

  const hasSecurityAndO11yFeatureIds =
    featureIds.length > 1 && featureIds.includes(AlertConsumers.SIEM);

  const hasNoSecuritySolution =
    featureIds.length > 0 && !isOnlySecurity && !hasSecurityAndO11yFeatureIds;

  const queryIndexNameFn = () => {
    return fetchAlertIndexNames({ http, features });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('alertsUIShared.hooks.useAlertDataView.useAlertDataMessage', {
        defaultMessage: 'Unable to load alert data view',
      })
    );
  };

  const {
    data: indexNames,
    isSuccess: isIndexNameSuccess,
    isInitialLoading: isIndexNameInitialLoading,
    isLoading: isIndexNameLoading,
  } = useQuery({
    queryKey: ['loadAlertIndexNames', features],
    queryFn: queryIndexNameFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000, // To prevent duplicated requests
    enabled: featureIds.length > 0 && !hasSecurityAndO11yFeatureIds,
  });

  const {
    data: { fields: alertFields },
    isSuccess: isAlertFieldsSuccess,
    isInitialLoading: isAlertFieldsInitialLoading,
    isLoading: isAlertFieldsLoading,
  } = useFetchAlertsFieldsQuery(
    { http, featureIds },
    {
      onError: onErrorFn,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
      enabled: hasNoSecuritySolution,
    }
  );

  useEffect(() => {
    return () => {
      dataViews.map((dv) => {
        dataViewsService.clearInstanceCache(dv.id);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViews]);

  // FUTURE ENGINEER this useEffect is for security solution user since
  // we are using the user privilege to access the security alert index
  useEffect(() => {
    async function createDataView() {
      const localDataview = await dataViewsService.create({
        title: (indexNames ?? []).join(','),
        allowNoIndex: true,
      });
      setDataViews([localDataview]);
    }

    if (isOnlySecurity && isIndexNameSuccess) {
      createDataView();
    }
  }, [dataViewsService, indexNames, isIndexNameSuccess, isOnlySecurity]);

  // FUTURE ENGINEER this useEffect is for o11y and stack solution user since
  // we are using the kibana user privilege to access the alert index
  useEffect(() => {
    if (
      indexNames &&
      alertFields &&
      !isOnlySecurity &&
      isAlertFieldsSuccess &&
      isIndexNameSuccess
    ) {
      setDataViews([
        {
          title: (indexNames ?? []).join(','),
          fieldFormatMap: {},
          fields: (alertFields ?? [])?.map((field) => {
            return {
              ...field,
              ...(field.esTypes && field.esTypes.includes('flattened') ? { type: 'string' } : {}),
            };
          }),
        },
      ] as unknown as DataView[]);
    }
  }, [
    alertFields,
    dataViewsService,
    indexNames,
    isIndexNameSuccess,
    isOnlySecurity,
    isAlertFieldsSuccess,
  ]);

  return useMemo(
    () => ({
      dataViews,
      loading:
        featureIds.length === 0 || hasSecurityAndO11yFeatureIds
          ? false
          : isOnlySecurity
          ? isIndexNameInitialLoading || isIndexNameLoading || dataViews.length === 0
          : isIndexNameInitialLoading ||
            isIndexNameLoading ||
            isAlertFieldsInitialLoading ||
            isAlertFieldsLoading,
    }),
    [
      dataViews,
      featureIds.length,
      hasSecurityAndO11yFeatureIds,
      isOnlySecurity,
      isIndexNameInitialLoading,
      isIndexNameLoading,
      isAlertFieldsInitialLoading,
      isAlertFieldsLoading,
    ]
  );
}
