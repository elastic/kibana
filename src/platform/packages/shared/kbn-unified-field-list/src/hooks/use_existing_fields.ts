/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { htmlIdGenerator } from '@elastic/eui';
import { BehaviorSubject } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { AggregateQuery, EsQueryConfig, Filter, Query } from '@kbn/es-query';
import { type DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView, DataViewsContract, FieldSpec } from '@kbn/data-views-plugin/common';
import { getEsQueryConfig } from '@kbn/data-service/src/es_query';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import useLatest from 'react-use/lib/useLatest';
import { loadFieldExisting } from '../services/field_existing';
import {
  ExistenceFetchStatus,
  type ExistingFieldsInfo,
  type FetchedExistingFieldsInfo,
} from '../types';

const getBuildEsQueryAsync = async () => (await import('@kbn/es-query')).buildEsQuery;
const generateId = htmlIdGenerator();
const DEFAULT_EMPTY_NEW_FIELDS: FieldSpec[] = [];

export interface ExistingFieldsFetcherParams {
  disableAutoFetching?: boolean;
  dataViews: DataView[];
  fromDate: string | undefined; // fetching will be skipped if `undefined`
  toDate: string | undefined;
  query: Query | AggregateQuery | undefined;
  filters: Filter[] | undefined;
  services: {
    core: Pick<CoreStart, 'uiSettings' | 'analytics'>;
    data: DataPublicPluginStart;
    dataViews: DataViewsContract;
  };
  onNoData?: (dataViewId: string) => unknown;
  /**
   * Custom container for existing fields info map
   */
  initialExistingFieldsInfo?: FetchedExistingFieldsInfo;
  onInitialExistingFieldsInfoChange?: (info: FetchedExistingFieldsInfo | undefined) => void;
}

export type ExistingFieldsByDataViewMap = Record<string, ExistingFieldsInfo>;

export interface ExistingFieldsFetcher {
  refetchFieldsExistenceInfo: (dataViewId?: string) => Promise<void>;
  isProcessing: boolean;
}

export interface ExistingFieldsReader {
  hasFieldData: (dataViewId: string, fieldName: string) => boolean;
  getFieldsExistenceStatus: (dataViewId: string) => ExistenceFetchStatus;
  isFieldsExistenceInfoUnavailable: (dataViewId: string) => boolean;
  getNewFields: (dataViewId: string) => FieldSpec[];
}

const initialData: ExistingFieldsByDataViewMap = {};
const unknownInfo: ExistingFieldsInfo = {
  fetchStatus: ExistenceFetchStatus.unknown,
  existingFieldsByFieldNameMap: {},
  numberOfFetches: 0,
};

const globalMap$ = new BehaviorSubject<ExistingFieldsByDataViewMap>(initialData); // for syncing between hooks
let lastFetchId: string = ''; // persist last fetch id to skip older requests/responses if any

/**
 * Fetches info whether a field contains data or it's empty.
 * Can be used in combination with `useQuerySubscriber` hook for gathering the required params.
 * @param params
 * @public
 */
export const useExistingFieldsFetcher = (
  params: ExistingFieldsFetcherParams
): ExistingFieldsFetcher => {
  const { initialExistingFieldsInfo, onInitialExistingFieldsInfoChange } = params;
  const mountedRef = useRef<boolean>(true);
  const [activeRequests, setActiveRequests] = useState<number>(0);
  const isProcessing = activeRequests > 0;

  const initialExistingFieldsInfoRef = useRef<FetchedExistingFieldsInfo | undefined>(
    initialExistingFieldsInfo && Object.keys(initialExistingFieldsInfo).length
      ? initialExistingFieldsInfo
      : undefined
  );
  const onInitialExistingFieldsInfoChangeRef = useLatest(onInitialExistingFieldsInfoChange);
  const latestInitialExistingFieldsInfoRef = useLatest(initialExistingFieldsInfo);

  const fetchFieldsExistenceInfo = useCallback(
    async ({
      dataViewId,
      query,
      filters,
      fromDate,
      toDate,
      services: { dataViews, data, core },
      onNoData,
      fetchId,
    }: ExistingFieldsFetcherParams & {
      dataViewId: string | undefined;
      fetchId: string;
    }): Promise<void> => {
      if (!dataViewId || !query || !fromDate || !toDate) {
        return;
      }

      const currentInfo = globalMap$.getValue()?.[dataViewId];

      if (!mountedRef.current) {
        return;
      }

      const numberOfFetches = (currentInfo?.numberOfFetches ?? 0) + 1;
      let dataView: DataView | null = null;

      try {
        dataView = await dataViews.get(dataViewId, false);
      } catch (e) {
        //
      }

      if (!dataView?.title) {
        return;
      }

      const dataViewHash = getDataViewsHash([dataView]);
      let info: ExistingFieldsInfo = {
        ...unknownInfo,
        numberOfFetches,
      };
      const providedInitialInfo = initialExistingFieldsInfoRef.current;
      if (
        providedInitialInfo?.dataViewHash === dataViewHash &&
        providedInitialInfo?.info?.fetchStatus === ExistenceFetchStatus.succeeded &&
        (providedInitialInfo?.info?.hasDataViewRestrictions ||
          (providedInitialInfo?.info?.existingFieldsByFieldNameMap &&
            Object.keys(providedInitialInfo.info.existingFieldsByFieldNameMap).length))
      ) {
        // restoring from the provided initial info
        info = {
          ...info,
          ...providedInitialInfo.info,
        };
        initialExistingFieldsInfoRef.current = undefined;
        globalMap$.next({
          ...globalMap$.getValue(),
          [dataViewId]: info,
        });
        return;
      }

      setActiveRequests((value) => value + 1);

      const hasRestrictions = Boolean(dataView.getAggregationRestrictions?.());

      if (hasRestrictions) {
        info.fetchStatus = ExistenceFetchStatus.succeeded;
        info.hasDataViewRestrictions = true;
      } else {
        try {
          const result = await loadFieldExisting({
            dslQuery: await buildSafeEsQuery(
              dataView,
              query,
              filters || [],
              getEsQueryConfig(core.uiSettings)
            ),
            fromDate,
            toDate,
            timeFieldName: dataView.timeFieldName,
            data,
            uiSettingsClient: core.uiSettings,
            dataViewsService: dataViews,
            dataView,
          });

          const existingFieldNames = result?.existingFieldNames || [];

          if (
            onNoData &&
            numberOfFetches === 1 &&
            !existingFieldNames.filter((fieldName) => !dataView?.metaFields?.includes(fieldName))
              .length
          ) {
            onNoData(dataViewId);
          }

          info.existingFieldsByFieldNameMap = booleanMap(existingFieldNames);
          info.newFields = result.newFields;
          info.fetchStatus = ExistenceFetchStatus.succeeded;
        } catch (error) {
          info.fetchStatus = ExistenceFetchStatus.failed;
        }
      }

      // skip redundant and older results
      if (fetchId === lastFetchId) {
        onInitialExistingFieldsInfoChangeRef.current?.({
          dataViewId,
          dataViewHash,
          info,
        });
        if (mountedRef.current) {
          globalMap$.next({
            ...globalMap$.getValue(),
            [dataViewId]: info,
          });
        }
      }

      setActiveRequests((value) => value - 1);
    },
    [mountedRef, setActiveRequests, onInitialExistingFieldsInfoChangeRef]
  );

  const dataViewsHash = getDataViewsHash(params.dataViews);
  const refetchFieldsExistenceInfo = useCallback(
    async (dataViewId?: string) => {
      const startTime = window.performance.now();
      const metricEventName = 'fetchFieldsExistenceInfo';
      const fetchId = generateId();
      lastFetchId = fetchId;

      const options = {
        fetchId,
        dataViewId,
        ...params,
      };
      // refetch only for the specified data view
      if (dataViewId) {
        await fetchFieldsExistenceInfo({
          ...options,
          dataViewId,
        });
        reportPerformanceMetricEvent(params.services.core.analytics, {
          eventName: metricEventName,
          duration: window.performance.now() - startTime,
          meta: { dataViewsCount: 1 },
        });
        return;
      }
      // refetch for all mentioned data views
      await Promise.all(
        params.dataViews.map((dataView) =>
          fetchFieldsExistenceInfo({
            ...options,
            dataViewId: dataView.id,
          })
        )
      );
      reportPerformanceMetricEvent(params.services.core.analytics, {
        eventName: metricEventName,
        duration: window.performance.now() - startTime,
        meta: { dataViewsCount: params.dataViews.length },
      });
      if (!params.dataViews.length && latestInitialExistingFieldsInfoRef.current?.dataViewId) {
        // after switching to ES|QL mode, reset the initial info
        onInitialExistingFieldsInfoChangeRef.current?.(undefined);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      fetchFieldsExistenceInfo,
      dataViewsHash,
      params.query,
      params.filters,
      params.fromDate,
      params.toDate,
      params.services.core,
    ]
  );

  useEffect(() => {
    if (!params.disableAutoFetching) {
      refetchFieldsExistenceInfo();
    }
  }, [refetchFieldsExistenceInfo, params.disableAutoFetching]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      globalMap$.next({}); // reset the cache (readers will continue using their own data slice until they are unmounted too)
    };
  }, [mountedRef]);

  return useMemo(
    () => ({
      refetchFieldsExistenceInfo,
      isProcessing,
    }),
    [refetchFieldsExistenceInfo, isProcessing]
  );
};

export const useExistingFieldsReader: () => ExistingFieldsReader = () => {
  const mountedRef = useRef<boolean>(true);
  const [existingFieldsByDataViewMap, setExistingFieldsByDataViewMap] =
    useState<ExistingFieldsByDataViewMap>(globalMap$.getValue());

  useEffect(() => {
    const subscription = globalMap$.subscribe((data) => {
      if (mountedRef.current && Object.keys(data).length > 0) {
        setExistingFieldsByDataViewMap((savedData) => ({
          ...savedData,
          ...data,
        }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setExistingFieldsByDataViewMap, mountedRef]);

  const hasFieldData = useCallback(
    (dataViewId: string, fieldName: string) => {
      const info = existingFieldsByDataViewMap[dataViewId];

      if (info?.fetchStatus === ExistenceFetchStatus.succeeded) {
        return (
          info?.hasDataViewRestrictions || Boolean(info?.existingFieldsByFieldNameMap[fieldName])
        );
      }

      return true;
    },
    [existingFieldsByDataViewMap]
  );

  const getNewFields = useCallback(
    (dataViewId: string) => {
      const info = existingFieldsByDataViewMap[dataViewId];

      if (info?.fetchStatus === ExistenceFetchStatus.succeeded) {
        return info?.newFields ?? DEFAULT_EMPTY_NEW_FIELDS;
      }

      return DEFAULT_EMPTY_NEW_FIELDS;
    },
    [existingFieldsByDataViewMap]
  );

  const getFieldsExistenceInfo = useCallback(
    (dataViewId: string) => {
      return dataViewId ? existingFieldsByDataViewMap[dataViewId] : unknownInfo;
    },
    [existingFieldsByDataViewMap]
  );

  const getFieldsExistenceStatus = useCallback(
    (dataViewId: string): ExistenceFetchStatus => {
      return getFieldsExistenceInfo(dataViewId)?.fetchStatus || ExistenceFetchStatus.unknown;
    },
    [getFieldsExistenceInfo]
  );

  const isFieldsExistenceInfoUnavailable = useCallback(
    (dataViewId: string): boolean => {
      const info = getFieldsExistenceInfo(dataViewId);
      return Boolean(
        info?.fetchStatus === ExistenceFetchStatus.failed || info?.hasDataViewRestrictions
      );
    },
    [getFieldsExistenceInfo]
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, [mountedRef]);

  return useMemo(
    () => ({
      hasFieldData,
      getFieldsExistenceStatus,
      isFieldsExistenceInfoUnavailable,
      getNewFields,
    }),
    [hasFieldData, getFieldsExistenceStatus, isFieldsExistenceInfoUnavailable, getNewFields]
  );
};

export const resetExistingFieldsCache = () => {
  globalMap$.next(initialData);
};

function getDataViewsHash(dataViews: DataView[]): string {
  return (
    dataViews
      // From Lens it's coming as IndexPattern type and not the real DataView type
      .map(
        (dataView) =>
          `${dataView.id}:${dataView.title}:${dataView.timeFieldName || 'no-timefield'}:${Boolean(
            dataView.getAggregationRestrictions?.()
          )}:${
            dataView.fields?.length ?? 0 // adding a field will also trigger a refetch of fields existence data
          }`
      )
      .join(',')
  );
}

// Wrapper around buildEsQuery, handling errors (e.g. because a query can't be parsed) by
// returning a query dsl object not matching anything
async function buildSafeEsQuery(
  dataView: DataView,
  query: Query | AggregateQuery,
  filters: Filter[],
  queryConfig: EsQueryConfig
) {
  const buildEsQuery = await getBuildEsQueryAsync();
  try {
    return buildEsQuery(dataView, query, filters, queryConfig);
  } catch (e) {
    return {
      bool: {
        must_not: {
          match_all: {},
        },
      },
    };
  }
}

function booleanMap(keys: string[]) {
  return keys.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {} as Record<string, boolean>);
}
