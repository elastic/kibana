/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { MarkdownSimple, toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { SortDirection } from '@kbn/data-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { fetchAnchor } from '../services/anchor';
import { fetchSurroundingDocs, SurrDocType } from '../services/context';
import {
  ContextFetchState,
  FailureReason,
  getInitialContextQueryState,
  LoadingStatus,
} from '../services/context_query_state';
import { AppState } from '../services/context_state';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import {
  getTieBreakerFieldName,
  getEsQuerySort,
} from '../../../../common/utils/sorting/get_es_query_sort';

const createError = (statusKey: string, reason: FailureReason, error?: Error) => ({
  [statusKey]: { value: LoadingStatus.FAILED, error, reason },
});

export interface ContextAppFetchProps {
  anchorId: string;
  dataView: DataView;
  appState: AppState;
  useNewFieldsApi: boolean;
}

export function useContextAppFetch({
  anchorId,
  dataView,
  appState,
  useNewFieldsApi,
}: ContextAppFetchProps) {
  const {
    uiSettings: config,
    data,
    toastNotifications,
    filterManager,
    core,
  } = useDiscoverServices();
  const { theme$ } = core.theme;

  const searchSource = useMemo(() => {
    return data.search.searchSource.createEmpty();
  }, [data.search.searchSource]);
  const tieBreakerFieldName = useMemo(
    () => getTieBreakerFieldName(dataView, config),
    [config, dataView]
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

    if (!tieBreakerFieldName) {
      setState(createError('anchorStatus', FailureReason.INVALID_TIEBREAKER));
      toastNotifications.addDanger({
        title: errorTitle,
        text: toMountPoint(
          wrapWithTheme(
            <MarkdownSimple>
              {i18n.translate('discover.context.invalidTieBreakerFiledSetting', {
                defaultMessage: 'Invalid tie breaker field setting',
              })}
            </MarkdownSimple>,
            theme$
          )
        ),
      });
      return;
    }

    try {
      setState({ anchorStatus: { value: LoadingStatus.LOADING } });
      const sort = getEsQuerySort({
        sortDir: SortDirection.desc,
        timeFieldName: dataView.timeFieldName!,
        tieBreakerFieldName,
        isTimeNanosBased: dataView.isTimeNanosBased(),
      });
      const anchor = await fetchAnchor(anchorId, dataView, searchSource, sort, useNewFieldsApi);
      setState({ anchor, anchorStatus: { value: LoadingStatus.LOADED } });
      return anchor;
    } catch (error) {
      setState(createError('anchorStatus', FailureReason.UNKNOWN, error));
      toastNotifications.addDanger({
        title: errorTitle,
        text: toMountPoint(wrapWithTheme(<MarkdownSimple>{error.message}</MarkdownSimple>, theme$)),
      });
    }
  }, [
    tieBreakerFieldName,
    setState,
    toastNotifications,
    dataView,
    anchorId,
    searchSource,
    useNewFieldsApi,
    theme$,
  ]);

  const fetchSurroundingRows = useCallback(
    async (type: SurrDocType, fetchedAnchor?: DataTableRecord) => {
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
        const rows = anchor.id
          ? await fetchSurroundingDocs(
              type,
              dataView,
              anchor,
              tieBreakerFieldName,
              SortDirection.desc,
              count,
              filters,
              data,
              useNewFieldsApi
            )
          : [];
        setState({ [type]: rows, [statusKey]: { value: LoadingStatus.LOADED } });
      } catch (error) {
        setState(createError(statusKey, FailureReason.UNKNOWN, error));
        toastNotifications.addDanger({
          title: errorTitle,
          text: toMountPoint(
            wrapWithTheme(<MarkdownSimple>{error.message}</MarkdownSimple>, theme$)
          ),
        });
      }
    },
    [
      filterManager,
      appState,
      fetchedState.anchor,
      tieBreakerFieldName,
      setState,
      dataView,
      toastNotifications,
      useNewFieldsApi,
      theme$,
      data,
    ]
  );

  const fetchContextRows = useCallback(
    (anchor?: DataTableRecord) =>
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
