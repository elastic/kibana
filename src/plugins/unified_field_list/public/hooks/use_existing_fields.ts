/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { CoreStart } from '@kbn/core/public';
import type { AggregateQuery, EsQueryConfig, Filter, Query } from '@kbn/es-query';
import {
  DataPublicPluginStart,
  DataViewsContract,
  getEsQueryConfig,
} from '@kbn/data-plugin/public';
import { type DataView } from '@kbn/data-plugin/common';
import { loadFieldExisting } from '../services/field_existing';
import { ExistenceFetchStatus } from '../types';

const getBuildEsQueryAsync = async () => (await import('@kbn/es-query')).buildEsQuery;

export interface ExistingFieldsInfo {
  fetchStatus: ExistenceFetchStatus;
  existingFieldsByFieldNameMap: Record<string, boolean>;
  numberOfFetches: number;
  hasDataViewRestrictions?: boolean;
}

export interface FetchExistenceInfoParams {
  dataViews: DataView[];
  fromDate: string;
  toDate: string;
  query: Query | AggregateQuery;
  filters: Filter[];
  services: {
    core: Pick<CoreStart, 'uiSettings'>;
    data: DataPublicPluginStart;
    dataViews: DataViewsContract;
  };
  onNoData?: (dataViewId: string) => unknown;
}

type ExistingFieldsByDataViewMap = Record<string, ExistingFieldsInfo>;

export interface ExistingFieldsReader {
  hasFieldData: (dataViewId: string, fieldName: string) => boolean;
  getFieldsExistenceStatus: (dataViewId: string) => ExistenceFetchStatus;
  isFieldsExistenceInfoUnavailable: (dataViewId: string) => boolean;
}

const initialData: ExistingFieldsByDataViewMap = {};
const unknownInfo: ExistingFieldsInfo = {
  fetchStatus: ExistenceFetchStatus.unknown,
  existingFieldsByFieldNameMap: {},
  numberOfFetches: 0,
};

const globalMap$ = new BehaviorSubject<ExistingFieldsByDataViewMap>(initialData); // for syncing between hooks
let lastFetchRequestedAtTimestamp: number = 0; // persist last fetching time to skip older handlers if any

export const useExistingFieldsFetcher = (
  params: FetchExistenceInfoParams
): {
  refetchFieldsExistenceInfo: (dataViewId?: string) => Promise<void>;
  isProcessing: boolean;
} => {
  const mountedRef = useRef<boolean>(true);
  const [activeRequests, setActiveRequests] = useState<number>(0);
  const isProcessing = activeRequests > 0;
  // const prevParamsRef = useRef<any[]>([]);

  const fetchFieldsExistenceInfo = useCallback(
    async ({
      dataViewId,
      query,
      filters,
      fromDate,
      toDate,
      services: { dataViews, data, core },
      onNoData,
    }: FetchExistenceInfoParams & { dataViewId: string | undefined }): Promise<void> => {
      if (!dataViewId) {
        return;
      }

      const currentInfo = globalMap$.getValue()?.[dataViewId];

      if (!mountedRef.current) {
        return;
      }

      const numberOfFetches = (currentInfo?.numberOfFetches ?? 0) + 1;
      const dataView = await dataViews.get(dataViewId);

      // console.log('fetching', dataViewId);

      if (!dataView?.title) {
        return;
      }

      setActiveRequests((value) => value + 1);

      const hasRestrictions = Boolean(dataView?.typeMeta?.aggs);
      const info: ExistingFieldsInfo = {
        ...unknownInfo,
        numberOfFetches,
      };

      try {
        if (hasRestrictions) {
          info.fetchStatus = ExistenceFetchStatus.succeeded;
          info.hasDataViewRestrictions = true;
        } else {
          // console.log('requesting data');
          const result = await loadFieldExisting({
            dslQuery: await buildSafeEsQuery(
              dataView,
              query,
              filters,
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

          // console.log({ result });
          const existingFieldNames = result?.existingFieldNames || [];

          if (
            !existingFieldNames.length &&
            numberOfFetches === 1 &&
            typeof onNoData === 'function'
          ) {
            onNoData(dataViewId);
          }

          info.existingFieldsByFieldNameMap = booleanMap(existingFieldNames);
          info.fetchStatus = ExistenceFetchStatus.succeeded;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        info.fetchStatus = ExistenceFetchStatus.failed;
      }

      // skip redundant results
      if (mountedRef.current && Date.now() >= lastFetchRequestedAtTimestamp) {
        // console.log('finished', info);
        globalMap$.next({
          ...globalMap$.getValue(),
          [dataViewId]: info,
        });
      }

      setActiveRequests((value) => value - 1);
    },
    [mountedRef, setActiveRequests]
  );

  const dataViewsHash = getDataViewsHash(params.dataViews);
  const refetchFieldsExistenceInfo = useCallback(
    async (dataViewId?: string) => {
      // const currentParams = [
      //   fetchFieldsExistenceInfo,
      //   dataViewsHash,
      //   params.query,
      //   params.filters,
      //   params.fromDate,
      //   params.toDate,
      // ];
      //
      // currentParams.forEach((param, index) => {
      //   if (param !== prevParamsRef.current[index]) {
      //     console.log('different param', param, prevParamsRef.current[index]);
      //   }
      // });
      //
      // prevParamsRef.current = currentParams;
      // console.log('refetch triggered', { dataViewId });
      lastFetchRequestedAtTimestamp = Date.now();
      // refetch only for the specified data view
      if (dataViewId) {
        await fetchFieldsExistenceInfo({
          dataViewId,
          ...params,
        });
        return;
      }
      // refetch for all mentioned data views
      await Promise.all(
        params.dataViews.map((dataView) =>
          fetchFieldsExistenceInfo({
            dataViewId: dataView.id,
            ...params,
          })
        )
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      fetchFieldsExistenceInfo,
      dataViewsHash,
      params.query,
      params.filters,
      params.fromDate,
      params.toDate,
    ]
  );

  useEffect(() => {
    refetchFieldsExistenceInfo();
  }, [refetchFieldsExistenceInfo]);

  useEffect(() => {
    return () => {
      // console.log('resetting the cache');
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
      // console.log('received', data);
      if (mountedRef.current) {
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
        return info?.hasDataViewRestrictions
          ? true
          : Boolean(info?.existingFieldsByFieldNameMap[fieldName]);
      }

      return true; // TODO: double check `true` returns
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
        info?.fetchStatus !== ExistenceFetchStatus.succeeded || info?.hasDataViewRestrictions
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
    }),
    [hasFieldData, getFieldsExistenceStatus, isFieldsExistenceInfoUnavailable]
  );
};

export const resetFieldsExistenceCache = () => {
  globalMap$.next(initialData);
};

function getDataViewsHash(dataViews: DataView[]): string {
  return (
    dataViews
      // From Lens it's coming as IndexPattern type and not the real DataView type
      .map(
        (dataView) =>
          `${dataView.id}:${dataView.title}:${dataView.timeFieldName}:${
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
