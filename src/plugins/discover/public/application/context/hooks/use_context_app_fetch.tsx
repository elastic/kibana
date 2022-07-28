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
import { CONTEXT_TIE_BREAKER_FIELDS_SETTING } from '../../../../common';
import { fetchAnchor } from '../services/anchor';
import { fetchSurroundingDocs, SurrDocType } from '../services/context';
import {
  ContextFetchState,
  FailureReason,
  getInitialContextQueryState,
  LoadingStatus,
} from '../services/context_query_state';
import { AppState } from '../services/context_state';
import { getFirstSortableField } from '../utils/sorting';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import type { DataTableRecord } from '../../../types';

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
  const tieBreakerField = useMemo(
    () => getFirstSortableField(dataView, config.get(CONTEXT_TIE_BREAKER_FIELDS_SETTING)),
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

    if (!tieBreakerField) {
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
      const sort = [
        { [dataView.timeFieldName!]: SortDirection.desc },
        { [tieBreakerField]: SortDirection.desc },
      ];
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
    tieBreakerField,
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
              tieBreakerField,
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
      tieBreakerField,
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
