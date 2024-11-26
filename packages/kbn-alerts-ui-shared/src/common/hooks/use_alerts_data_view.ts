/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { DataView, DataViewsContract, FieldSpec } from '@kbn/data-views-plugin/common';
import { AlertConsumers, ValidFeatureId } from '@kbn/rule-data-utils';
import type { ToastsStart, HttpStart } from '@kbn/core/public';

import { DataViewBase } from '@kbn/es-query';
import { useVirtualDataViewQuery } from './use_virtual_data_view_query';
import { useFetchAlertsFieldsQuery } from './use_fetch_alerts_fields_query';
import { useFetchAlertsIndexNamesQuery } from './use_fetch_alerts_index_names_query';

export interface UseAlertsDataViewParams {
  // Dependencies
  http: HttpStart;
  dataViewsService: DataViewsContract;
  toasts: ToastsStart;

  // Params
  /**
   * Array of feature ids used for authorization and area-based filtering
   *
   * Security data views must be requested in isolation (i.e. `['siem']`). If mixed with
   * other feature ids, the resulting data view will be empty.
   */
  featureIds: ValidFeatureId[];
}

export interface UseAlertsDataViewResult {
  isLoading: boolean;
  dataView?: Omit<DataViewBase, 'fields'> & { fields: FieldSpec[] };
}

/**
 * Resolves the DataView or DataViewBase object
 *
 * Returns undefined if any of the dependencies are in error state
 */
const resolveDataView = ({
  isError,
  fields,
  indexNames,
  virtualDataView,
}: {
  isError: boolean;
  virtualDataView?: DataView;
  indexNames?: string[];
  fields?: { fields: FieldSpec[] };
}) => {
  if (isError) {
    return;
  }
  // When the only feature id is Security Solution, use an in-memory data view:
  // their alerting authorization is based on end-user privileges, which allows us to create
  // an actual data view
  if (virtualDataView) {
    return virtualDataView;
  }
  // For all other feature id combinations, compute the data view from the fetched index names and
  // fields since the Kibana-user-based authorization wouldn't allow us to create a data view
  if (indexNames) {
    return {
      title: indexNames.join(','),
      fieldFormatMap: {},
      fields: (fields?.fields ?? []).map((field) => {
        return {
          ...field,
          ...(field.esTypes && field.esTypes.includes('flattened') ? { type: 'string' } : {}),
        };
      }),
    };
  }
};

/**
 * Computes a {@link DataViewBase} object for alerts indices based on the provided feature ids
 *
 * @returns
 * A {@link DataViewBase} object, intentionally not typed as a complete {@link DataView} object
 * since only Security Solution uses an actual in-memory data view (when `featureIds = ['siem']).
 * In all other cases the data view is computed from the index names and fields fetched from the
 * alerting APIs.
 */
export const useAlertsDataView = ({
  http,
  dataViewsService,
  toasts,
  featureIds,
}: UseAlertsDataViewParams): UseAlertsDataViewResult => {
  const includesSecurity = featureIds.includes(AlertConsumers.SIEM);
  const isOnlySecurity = featureIds.length === 1 && includesSecurity;
  const hasMixedFeatureIds = featureIds.length > 1 && includesSecurity;

  const {
    data: indexNames,
    isError: isIndexNamesError,
    isLoading: isLoadingIndexNames,
    isInitialLoading: isInitialLoadingIndexNames,
  } = useFetchAlertsIndexNamesQuery(
    { http, featureIds },
    {
      // Don't fetch index names when featureIds includes both Security Solution and other features
      enabled: !!featureIds.length && (isOnlySecurity || !includesSecurity),
    }
  );

  const {
    data: fields,
    isError: isFieldsError,
    isLoading: isLoadingFields,
    isInitialLoading: isInitialLoadingFields,
  } = useFetchAlertsFieldsQuery(
    { http, featureIds },
    {
      // Don't fetch fields when featureIds includes Security Solution
      enabled: !!featureIds.length && !includesSecurity,
    }
  );

  // eslint-disable-next-line no-console
  console.log(
    'use_alerts_data_view.fields.length',
    fields?.fields?.length,
    'use_alerts_data_view.fields',
    JSON.stringify(fields?.fields?.find((field) => field.name === 'kibana.alert.start'))
  );

  const { data: virtualDataView, isError: isVirtualDataViewError } = useVirtualDataViewQuery(
    {
      dataViewsService,
      indexNames,
    },
    {
      // Create data view only when featureIds = ['siem'] and indexNames have been fetched
      enabled: isOnlySecurity && !!indexNames?.length,
    }
  );

  useEffect(() => {
    if (isIndexNamesError || isFieldsError || isVirtualDataViewError) {
      toasts.addDanger(
        i18n.translate('alertsUIShared.hooks.useAlertDataView.fetchErrorMessage', {
          defaultMessage: 'Unable to load alert data view',
        })
      );
    }
  }, [isFieldsError, isIndexNamesError, isVirtualDataViewError, toasts]);

  const dataView = useMemo(
    () =>
      resolveDataView({
        isError: isIndexNamesError || isFieldsError || isVirtualDataViewError,
        fields,
        indexNames,
        virtualDataView: !isOnlySecurity ? undefined : virtualDataView,
      }),
    [
      fields,
      indexNames,
      isFieldsError,
      isIndexNamesError,
      isOnlySecurity,
      isVirtualDataViewError,
      virtualDataView,
    ]
  );

  return useMemo(() => {
    let isLoading: boolean;
    if (!featureIds.length || hasMixedFeatureIds) {
      isLoading = false;
    } else {
      if (isOnlySecurity) {
        isLoading = isInitialLoadingIndexNames || isLoadingIndexNames || !dataView;
      } else {
        isLoading =
          isInitialLoadingIndexNames ||
          isLoadingIndexNames ||
          isInitialLoadingFields ||
          isLoadingFields;
      }
    }
    return {
      dataView,
      isLoading,
    };
  }, [
    dataView,
    featureIds.length,
    hasMixedFeatureIds,
    isInitialLoadingFields,
    isInitialLoadingIndexNames,
    isLoadingFields,
    isLoadingIndexNames,
    isOnlySecurity,
  ]);
};
