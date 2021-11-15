/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { CONTEXT_TIE_BREAKER_FIELDS_SETTING } from '../../../../common';
import { DiscoverServices } from '../../../build_services';
import { fetchAnchor } from '../services/anchor';
import { fetchSurroundingDocs, SurrDocType } from '../services/context';
import { MarkdownSimple, toMountPoint } from '../../../../../kibana_react/public';
import { IndexPattern, SortDirection } from '../../../../../data/public';
import {
  ContextFetchState,
  FailureReason,
  getInitialContextQueryState,
  LoadingStatus,
} from '../services/context_query_state';
import { AppState } from '../services/context_state';
import { getFirstSortableField } from './sorting';
import { EsHitRecord } from '../../types';

const createError = (statusKey: string, reason: FailureReason, error?: Error) => ({
  [statusKey]: { value: LoadingStatus.FAILED, error, reason },
});

export interface ContextAppFetchProps {
  anchorId: string;
  indexPattern: IndexPattern;
  appState: AppState;
  useNewFieldsApi: boolean;
  services: DiscoverServices;
}

export function useContextAppFetch({
  anchorId,
  indexPattern,
  appState,
  useNewFieldsApi,
  services,
}: ContextAppFetchProps) {
  const { uiSettings: config, data, toastNotifications, filterManager } = services;

  const searchSource = useMemo(() => {
    return data.search.searchSource.createEmpty();
  }, [data.search.searchSource]);
  const tieBreakerField = useMemo(
    () => getFirstSortableField(indexPattern, config.get(CONTEXT_TIE_BREAKER_FIELDS_SETTING)),
    [config, indexPattern]
  );

  const [fetchedState, setFetchedState] = useState<ContextFetchState>(
    getInitialContextQueryState()
  );

  const setState = useCallback((values: Partial<ContextFetchState>) => {
    setFetchedState((prevState) => ({ ...prevState, ...values }));
  }, []);

  const fetchAnchorRow = useCallback(async () => {
    const errorTitle = i18n.translate('discover.context.unableToLoadAnchorDocumentDescription', {
      defaultMessage: 'Unable to load the anchor document',
    });

    if (!tieBreakerField) {
      setState(createError('anchorStatus', FailureReason.INVALID_TIEBREAKER));
      toastNotifications.addDanger({
        title: errorTitle,
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
      const sort = [
        { [indexPattern.timeFieldName!]: SortDirection.desc },
        { [tieBreakerField]: SortDirection.desc },
      ];
      const anchor = await fetchAnchor(anchorId, indexPattern, searchSource, sort, useNewFieldsApi);
      setState({ anchor, anchorStatus: { value: LoadingStatus.LOADED } });
      return anchor;
    } catch (error) {
      setState(createError('anchorStatus', FailureReason.UNKNOWN, error));
      toastNotifications.addDanger({
        title: errorTitle,
        text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
      });
    }
  }, [
    tieBreakerField,
    setState,
    toastNotifications,
    indexPattern,
    anchorId,
    searchSource,
    useNewFieldsApi,
  ]);

  const fetchSurroundingRows = useCallback(
    async (type: SurrDocType, fetchedAnchor?: EsHitRecord) => {
      const filters = filterManager.getFilters();

      const count =
        type === SurrDocType.PREDECESSORS ? appState.predecessorCount : appState.successorCount;
      const anchor = fetchedAnchor || fetchedState.anchor;
      const statusKey = `${type}Status`;
      const errorTitle = i18n.translate('discover.context.unableToLoadDocumentDescription', {
        defaultMessage: 'Unable to load documents',
      });

      try {
        setState({ [statusKey]: { value: LoadingStatus.LOADING } });
        const rows = await fetchSurroundingDocs(
          type,
          indexPattern,
          anchor as EsHitRecord,
          tieBreakerField,
          SortDirection.desc,
          count,
          filters,
          useNewFieldsApi
        );
        setState({ [type]: rows, [statusKey]: { value: LoadingStatus.LOADED } });
      } catch (error) {
        setState(createError(statusKey, FailureReason.UNKNOWN, error));
        toastNotifications.addDanger({
          title: errorTitle,
          text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
        });
      }
    },
    [
      filterManager,
      appState,
      fetchedState.anchor,
      tieBreakerField,
      setState,
      indexPattern,
      toastNotifications,
      useNewFieldsApi,
    ]
  );

  const fetchContextRows = useCallback(
    (anchor?: EsHitRecord) =>
      Promise.allSettled([
        fetchSurroundingRows(SurrDocType.PREDECESSORS, anchor),
        fetchSurroundingRows(SurrDocType.SUCCESSORS, anchor),
      ]),
    [fetchSurroundingRows]
  );

  const fetchAllRows = useCallback(() => {
    fetchAnchorRow().then((anchor) => anchor && fetchContextRows(anchor));
  }, [fetchAnchorRow, fetchContextRows]);

  const resetFetchedState = useCallback(() => {
    setFetchedState(getInitialContextQueryState());
  }, []);

  return {
    fetchedState,
    fetchAllRows,
    fetchContextRows,
    fetchSurroundingRows,
    resetFetchedState,
  };
}
