/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { fromPairs } from 'lodash';
import { Subject } from 'rxjs';
import { DiscoverServices } from '../../../build_services';
import { AppState, getState } from '../../angular/context_state';
import { fetchAnchorProvider } from '../../angular/context/api/anchor';
import {
  EsHitRecord,
  EsHitRecordList,
  fetchContextProvider,
  SurrDocType,
} from '../../angular/context/api/context';
import { MarkdownSimple, toMountPoint } from '../../../../../kibana_react/public';
import { Filter, SortDirection } from '../../../../../data/public';
import {
  ContextRows,
  FailureReason,
  LoadingState,
  LoadingStatus,
} from '../../angular/context_query_state';

export type ContextAppMessage = Partial<AppState>;

interface ContextDocsMessage {
  successors?: EsHitRecordList;
  predecessors?: EsHitRecordList;
  anchor?: EsHitRecord;
  all?: EsHitRecordList;
  anchorStatus?: LoadingState;
  predecessorsStatus?: LoadingState;
  successorsStatus?: LoadingState;
}

interface FetchAllRowsParams {
  anchorId: string;
  indexPatternId: string;
  tieBreakerField: string;
  sort: [[string, SortDirection]];
}
interface FetchSurrDocsParams {
  indexPatternId: string;
  anchor: EsHitRecord;
  tieBreakerField: string;
  sort: [[string, SortDirection]];
}

export function useContextAppQuery({
  services,
  useNewFieldsApi,
}: {
  services: DiscoverServices;
  useNewFieldsApi: boolean;
}) {
  const { data, indexPatterns, toastNotifications, filterManager } = services;

  const searchSource = useMemo(() => {
    return data.search.searchSource.createEmpty();
  }, [data.search.searchSource]);

  const fetchAnchor = useMemo(() => {
    return fetchAnchorProvider(indexPatterns, searchSource, useNewFieldsApi);
  }, [indexPatterns, searchSource, useNewFieldsApi]);

  const { fetchSurroundingDocs } = useMemo(
    () => fetchContextProvider(indexPatterns, useNewFieldsApi),
    [indexPatterns, useNewFieldsApi]
  );

  const context$ = useMemo(() => new Subject<ContextDocsMessage>(), []);

  const fetchAnchorRow = useCallback(
    ({
      indexPatternId,
      anchorId,
      tieBreakerField,
      sort,
    }: {
      indexPatternId: string;
      anchorId: string;
      tieBreakerField: string;
      sort: [[string, SortDirection]];
    }) => {
      const [[, sortDir]] = sort;

      context$.next({ anchorStatus: LoadingStatus.LOADING });
      return fetchAnchor(indexPatternId, anchorId, [
        fromPairs(sort),
        { [tieBreakerField]: sortDir },
      ])
        .then(
          (anchor: EsHitRecord): EsHitRecord => {
            context$.next({ anchor, anchorStatus: LoadingStatus.LOADED });
            return anchor;
          }
        )
        .catch((error) => {
          context$.next({
            anchorStatus: { reason: FailureReason.INVALID_TIEBREAKER },
          });
          toastNotifications.addDanger({
            title: i18n.translate('discover.context.unableToLoadAnchorDocumentDescription', {
              defaultMessage: 'Unable to load the anchor document',
            }),
            text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
          });
          throw error;
        });
    },
    [context$, fetchAnchor, toastNotifications]
  );

  const fetchSurroundingRows = useCallback(
    (type, count, { indexPatternId, anchor, tieBreakerField, sort }: FetchSurrDocsParams) => {
      const filters = filterManager.getFilters();
      const [[sortField, sortDir]] = sort;

      context$.next({ [`${type}Status`]: LoadingStatus.LOADING });
      return fetchSurroundingDocs(
        type,
        indexPatternId,
        anchor,
        sortField,
        tieBreakerField,
        sortDir,
        count,
        filters
      ).then(
        (hits: EsHitRecordList) =>
          context$.next({ [type]: hits, [`${type}Status`]: LoadingStatus.LOADED }),
        (error) => {
          context$.next({ [`${type}Status`]: { reason: LoadingStatus.FAILED } });
          toastNotifications.addDanger({
            title: i18n.translate('discover.context.unableToLoadDocumentDescription', {
              defaultMessage: 'Unable to load documents',
            }),
            text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
          });
          throw error;
        }
      );
    },
    [context$, fetchSurroundingDocs, filterManager, toastNotifications]
  );

  const fetchContextRows = useCallback(
    (predecessorCount: number, successorCount: number, params: FetchSurrDocsParams) => {
      return Promise.all([
        fetchSurroundingRows('predecessors', predecessorCount, params),
        fetchSurroundingRows('successors', successorCount, params),
      ]);
    },
    [fetchSurroundingRows]
  );

  const fetchAllRows = useCallback(
    (
      predecessorCount: number,
      successorCount: number,
      { anchorId, ...restParams }: FetchAllRowsParams
    ) => {
      fetchAnchorRow({
        anchorId,
        ...restParams,
      }).then((anchor: EsHitRecord) => {
        return fetchContextRows(predecessorCount, successorCount, {
          anchor,
          ...restParams,
        });
      });
    },
    [fetchAnchorRow, fetchContextRows]
  );

  return { context$, fetchContextRows, fetchAllRows };
}
