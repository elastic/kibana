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
import { IndexPattern } from '../../../../../data/public';
import {
  ContextFetchState,
  FailureReason,
  getInitialContextQueryState,
  LoadingStatus,
} from '../../angular/context_query_state';
import { AppState } from '../../angular/context_state';
import { getFirstSortableField } from '../../angular/context/api/utils/sorting';

const createUnknownError = (statusKey: string, error: Error) => ({
  [statusKey]: { status: LoadingStatus.FAILED, reason: FailureReason.UNKNOWN, error },
});

export function useContextAppFetch({
  anchorId,
  indexPatternId,
  indexPattern,
  appState,
  useNewFieldsApi,
  services,
}: {
  anchorId: string;
  indexPatternId: string;
  indexPattern: IndexPattern;
  appState: AppState;
  useNewFieldsApi: boolean;
  services: DiscoverServices;
}) {
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

    try {
      const anchor = await fetchAnchor(indexPatternId, anchorId, [
        fromPairs(sort),
        { [tieBreakerField]: sortDir },
      ]);
      setState({ anchor, anchorStatus: LoadingStatus.LOADED });
      return anchor;
    } catch (error) {
      setState({
        anchorStatus: { status: LoadingStatus.FAILED, reason: FailureReason.UNKNOWN, error },
      });
      toastNotifications.addDanger({
        title: i18n.translate('discover.context.unableToLoadAnchorDocumentDescription', {
          defaultMessage: 'Unable to load the anchor document',
        }),
        text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
      });
    }
  }, [
    appState,
    fetchAnchor,
    indexPatternId,
    anchorId,
    tieBreakerField,
    setState,
    toastNotifications,
  ]);

  const fetchSurroundingRows = useCallback(
    async (type: SurrDocType, fetchedAnchor?: EsHitRecord) => {
      const filters = filterManager.getFilters();
      const { sort } = appState;
      const [[sortField, sortDir]] = sort;

      const count = type === 'predecessors' ? appState.predecessorCount : appState.successorCount;
      const anchor = fetchedAnchor || fetchedState.anchor;

      try {
        return await fetchSurroundingDocs(
          type,
          indexPatternId,
          anchor as EsHitRecord,
          sortField,
          tieBreakerField,
          sortDir,
          count,
          filters
        );
      } catch (error) {
        toastNotifications.addDanger({
          title: i18n.translate('discover.context.unableToLoadDocumentDescription', {
            defaultMessage: 'Unable to load documents',
          }),
          text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
        });
      }
    },
    [
      filterManager,
      appState,
      fetchedState.anchor,
      fetchSurroundingDocs,
      indexPatternId,
      tieBreakerField,
      toastNotifications,
    ]
  );

  const fetchContextRows = useCallback(
    async (anchor?: EsHitRecord) => {
      setState({
        predecessorsStatus: LoadingStatus.LOADING,
        successorsStatus: LoadingStatus.LOADING,
      });

      const [predecessors, successors] = await Promise.allSettled([
        fetchSurroundingRows('predecessors', anchor),
        fetchSurroundingRows('successors', anchor),
      ]);

      const predecessorsStatus =
        predecessors.status === 'fulfilled'
          ? LoadingStatus.LOADED
          : createUnknownError('predecessorsStatus', predecessors.reason);
      const successorsStatus =
        successors.status === 'fulfilled'
          ? LoadingStatus.LOADED
          : createUnknownError('successorsStatus', successors.reason);

      setState({
        predecessorsStatus,
        successorsStatus,
        successors: successors.status === 'fulfilled' ? successors.value : [],
        predecessors: predecessors.status === 'fulfilled' ? predecessors.value : [],
      });
    },
    [fetchSurroundingRows, setState]
  );

  const fetchAllRows = useCallback(
    () => fetchAnchorRow().then((anchor) => anchor && fetchContextRows(anchor)),
    [fetchAnchorRow, fetchContextRows]
  );

  const fetchMoreRows = useCallback(
    async (type) => {
      const statusKey = `${type}Status`;
      setState({ [statusKey]: LoadingStatus.LOADING });

      try {
        const rows = await fetchSurroundingRows(type);
        setState({ [type]: rows, [statusKey]: LoadingStatus.LOADED });
      } catch (error) {
        setState(createUnknownError(statusKey, error));
      }
    },
    [fetchSurroundingRows, setState]
  );

  return {
    fetchedState,
    fetchMoreRows,
    fetchContextRows,
    fetchAllRows,
  };
}
