/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { fromPairs } from 'lodash';
import { CONTEXT_TIE_BREAKER_FIELDS_SETTING } from '../../../../common';
import { DiscoverServices } from '../../../build_services';
import { fetchAnchorProvider } from '../../angular/context/api/anchor';
import { EsHitRecord, fetchContextProvider, SurrDocType } from '../../angular/context/api/context';
import { MarkdownSimple, toMountPoint } from '../../../../../kibana_react/public';
import { IndexPattern, SortDirection } from '../../../../../data/public';
import {
  ContextFetchState,
  FailureReason,
  getInitialContextQueryState,
  LoadingStatus,
} from '../../angular/context_query_state';
import { AppState } from '../../angular/context_state';
import { getFirstSortableField } from '../../angular/context/api/utils/sorting';

const createError = (statusKey: string, reason: FailureReason, error?: Error) => ({
  [statusKey]: { value: LoadingStatus.FAILED, error, reason },
});

export interface ContextAppFetchProps {
  anchorId: string;
  indexPatternId: string;
  indexPattern: IndexPattern;
  appState: AppState;
  useNewFieldsApi: boolean;
  services: DiscoverServices;
}

export function useContextAppFetch({
  anchorId,
  indexPatternId,
  indexPattern,
  appState,
  useNewFieldsApi,
  services,
}: ContextAppFetchProps) {
  const { uiSettings: config, data, indexPatterns, toastNotifications, filterManager } = services;

  const searchSource = useMemo(() => {
    return data.search.searchSource.createEmpty();
  }, [data.search.searchSource]);
  const tieBreakerField = useMemo(
    () => getFirstSortableField(indexPattern, config.get(CONTEXT_TIE_BREAKER_FIELDS_SETTING)),
    [config, indexPattern]
  );
  const fetchAnchor = useMemo(() => {
    return fetchAnchorProvider(indexPatterns, searchSource, useNewFieldsApi);
  }, [indexPatterns, searchSource, useNewFieldsApi]);
  const { fetchSurroundingDocs } = useMemo(
    () => fetchContextProvider(indexPatterns, useNewFieldsApi),
    [indexPatterns, useNewFieldsApi]
  );

  const [fetchedState, setFetchedState] = useState<ContextFetchState>(
    getInitialContextQueryState()
  );

  const setState = useCallback((values: Partial<ContextFetchState>) => {
    setFetchedState((prevState) => ({ ...prevState, ...values }));
  }, []);

  const fetchAnchorRow = useCallback(async () => {
    const { sort } = appState;
    const [[, sortDir]] = sort;
    const anchorError = i18n.translate('discover.context.unableToLoadAnchorDocumentDescription', {
      defaultMessage: 'Unable to load the anchor document',
    });

    if (!tieBreakerField) {
      setState(createError('anchorStatus', FailureReason.INVALID_TIEBREAKER));
      toastNotifications.addDanger({
        title: anchorError,
        text: toMountPoint(
          <MarkdownSimple>
            {i18n.translate('discover.context.invalidTieBreakerFiledSetting', {
              defaultMessage: 'Invalid tie breaker field setting',
            })}
          </MarkdownSimple>
        ),
      });
      return;
    }

    try {
      setState({ anchorStatus: { value: LoadingStatus.LOADING } });
      const anchor = await fetchAnchor(indexPatternId, anchorId, [
        fromPairs(sort),
        { [tieBreakerField]: sortDir },
      ]);
      setState({ anchor, anchorStatus: { value: LoadingStatus.LOADED } });
      return anchor;
    } catch (error) {
      toastNotifications.addDanger({
        title: anchorError,
        text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
      });
      setState(createError('anchorStatus', FailureReason.UNKNOWN, error));
    }
  }, [
    appState,
    tieBreakerField,
    setState,
    toastNotifications,
    fetchAnchor,
    indexPatternId,
    anchorId,
  ]);

  const fetchSurroundingRows = useCallback(
    async (type: SurrDocType, fetchedAnchor?: EsHitRecord) => {
      const filters = filterManager.getFilters();
      const { sort } = appState;
      const [[sortField, sortDir]] = sort;

      const count = type === 'predecessors' ? appState.predecessorCount : appState.successorCount;
      const anchor = fetchedAnchor || fetchedState.anchor;
      const statusKey = `${type}Status`;

      try {
        setState({ [statusKey]: { value: LoadingStatus.LOADING } });
        const rows = await fetchSurroundingDocs(
          type,
          indexPatternId,
          anchor as EsHitRecord,
          sortField,
          tieBreakerField,
          sortDir as SortDirection,
          count,
          filters
        );
        setState({ [type]: rows, [statusKey]: { value: LoadingStatus.LOADED } });
      } catch (error) {
        toastNotifications.addDanger({
          title: i18n.translate('discover.context.unableToLoadDocumentDescription', {
            defaultMessage: 'Unable to load documents',
          }),
          text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
        });
        setState(createError(statusKey, FailureReason.UNKNOWN, error));
      }
    },
    [
      filterManager,
      appState,
      fetchedState.anchor,
      tieBreakerField,
      setState,
      fetchSurroundingDocs,
      indexPatternId,
      toastNotifications,
    ]
  );

  const fetchContextRows = useCallback(
    (anchor?: EsHitRecord) =>
      Promise.allSettled([
        fetchSurroundingRows('predecessors', anchor),
        fetchSurroundingRows('successors', anchor),
      ]),
    [fetchSurroundingRows]
  );

  const fetchAllRows = useCallback(
    () => fetchAnchorRow().then((anchor) => anchor && fetchContextRows(anchor)),
    [fetchAnchorRow, fetchContextRows]
  );

  return {
    fetchedState,
    fetchAllRows,
    fetchContextRows,
    fetchSurroundingRows,
  };
}
