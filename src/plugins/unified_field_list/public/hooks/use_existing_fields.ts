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
import { buildEsQuery, Query, Filter, AggregateQuery, EsQueryConfig } from '@kbn/es-query';
import {
  DataPublicPluginStart,
  DataViewsContract,
  getEsQueryConfig,
} from '@kbn/data-plugin/public';
import { type DataView } from '@kbn/data-plugin/common';
import { loadFieldExisting } from '../services/field_existing';

export enum ExistenceFetchStatus {
  dataViewHasRestrictions = 'dataViewHasRestrictions',
  failed = 'failed',
  succeeded = 'succeeded',
  unknown = 'unknown',
}

export interface ExistingFieldsInfo {
  fetchStatus: ExistenceFetchStatus;
  existingFieldsByFieldNameMap: Record<string, boolean>;
  numberOfFetches: number;
}

export interface FetchExistenceInfoParams {
  dataViewId: string; // TODO: switch to data view list?
  dataViewHash: string;
  fromDate: string;
  toDate: string;
  query: Query | AggregateQuery;
  filters: Filter[];
  services: {
    core: Pick<CoreStart, 'uiSettings'>;
    data: DataPublicPluginStart;
    dataViews: DataViewsContract;
  };
  onNoData?: () => unknown;
}

type ExistingFieldsByDataViewMap = Record<string, ExistingFieldsInfo>;

export interface ExistingFieldsReader {
  hasFieldData: (dataViewId: string, fieldName: string) => boolean;
  getFieldsExistenceStatus: (dataViewId: string) => ExistenceFetchStatus;
}

const initialData: ExistingFieldsByDataViewMap = {};
const unknownInfo: ExistingFieldsInfo = {
  fetchStatus: ExistenceFetchStatus.unknown,
  existingFieldsByFieldNameMap: {},
  numberOfFetches: 0,
};

// TODO: when should it be reset fully?
const globalMap$ = new BehaviorSubject<ExistingFieldsByDataViewMap>(initialData); // for syncing between hooks

export const useExistingFieldsFetcher = (
  params: FetchExistenceInfoParams
): {
  refetchFieldsExistenceInfo: () => Promise<void>;
} => {
  const mountedRef = useRef<boolean>(true);

  const fetchFieldsExistenceInfo = useCallback(
    async ({
      dataViewId,
      query,
      filters,
      fromDate,
      toDate,
      services: { dataViews, data, core },
      onNoData,
    }: FetchExistenceInfoParams): Promise<void> => {
      if (!dataViewId) {
        return;
      }

      const globalMap = globalMap$.getValue() ?? initialData;
      // console.log('fetching', globalMap);
      const currentInfo = globalMap[dataViewId];

      if (!mountedRef.current) {
        return;
      }

      const numberOfFetches = (currentInfo?.numberOfFetches ?? 0) + 1;
      const dataView = await dataViews.get(dataViewId);
      const hasRestrictions = Boolean(dataView?.typeMeta?.aggs);
      const info: ExistingFieldsInfo = {
        ...unknownInfo,
        numberOfFetches,
      };

      try {
        if (hasRestrictions) {
          info.fetchStatus = ExistenceFetchStatus.dataViewHasRestrictions;
        } else {
          // TODO: support aborting a request
          const result = await loadFieldExisting({
            dslQuery: buildSafeEsQuery(dataView, query, filters, getEsQueryConfig(core.uiSettings)),
            fromDate,
            toDate,
            timeFieldName: dataView.timeFieldName,
            data,
            uiSettingsClient: core.uiSettings,
            dataViewsService: dataViews,
            dataView,
          });

          const existingFieldNames = result?.existingFieldNames || [];

          if (!existingFieldNames.length && numberOfFetches === 1 && onNoData) {
            onNoData();
          }

          info.existingFieldsByFieldNameMap = booleanMap(existingFieldNames);
          info.fetchStatus = ExistenceFetchStatus.succeeded;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        info.fetchStatus = ExistenceFetchStatus.failed;
      }

      if (mountedRef.current) {
        const newState = {
          ...globalMap,
          [dataViewId]: info, // TODO: switch to map by title instead of id?
        };

        globalMap$.next(newState);
      }
    },
    [mountedRef]
  );

  // TODO: accept dataViewId as a parameter here
  const refetchFieldsExistenceInfo = useCallback(async () => {
    return await fetchFieldsExistenceInfo(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fetchFieldsExistenceInfo,
    params.dataViewHash,
    params.query,
    params.filters,
    params.fromDate,
    params.toDate,
    params.services.core,
    params.services.data,
    params.services.dataViews,
  ]);

  useEffect(() => {
    refetchFieldsExistenceInfo();
  }, [refetchFieldsExistenceInfo]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, [mountedRef]);

  return useMemo(
    () => ({
      refetchFieldsExistenceInfo,
    }),
    [refetchFieldsExistenceInfo]
  );
};

export const useExistingFieldsReader: () => ExistingFieldsReader = () => {
  const [existingFieldsByDataViewMap, setExistingFieldsByDataViewMap] =
    useState<ExistingFieldsByDataViewMap>(initialData);

  useEffect(() => {
    const subscription = globalMap$.subscribe((data) => {
      // console.log('received', data);
      setExistingFieldsByDataViewMap(data);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setExistingFieldsByDataViewMap]);

  const hasFieldData = useCallback(
    (dataViewId: string, fieldName: string) => {
      const info = existingFieldsByDataViewMap[dataViewId];

      if (info?.fetchStatus === ExistenceFetchStatus.succeeded) {
        return Boolean(info?.existingFieldsByFieldNameMap[fieldName]);
      }

      return true; // TODO: double check this including for `dataViewHasRestrictions` case
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
    (dataViewId: string) => {
      return getFieldsExistenceInfo(dataViewId)?.fetchStatus || ExistenceFetchStatus.unknown;
    },
    [getFieldsExistenceInfo]
  );

  return useMemo(
    () => ({
      hasFieldData,
      getFieldsExistenceStatus,
    }),
    [hasFieldData, getFieldsExistenceStatus]
  );
};

export const getDataViewHash = (dataView: DataView) =>
  `${dataView.id}-${dataView.title}-${dataView.timeFieldName}`;

// Wrapper around buildEsQuery, handling errors (e.g. because a query can't be parsed) by
// returning a query dsl object not matching anything
function buildSafeEsQuery(
  dataView: DataView,
  query: Query | AggregateQuery,
  filters: Filter[],
  queryConfig: EsQueryConfig
) {
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
