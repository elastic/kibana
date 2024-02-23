/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { Markdown } from '@kbn/shared-ux-markdown';
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
  const services = useDiscoverServices();
  const { uiSettings: config, data, toastNotifications, filterManager } = services;

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
        text: i18n.translate('discover.context.invalidTieBreakerFiledSetting', {
          defaultMessage: 'Invalid tie breaker field setting',
        }),
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
      const result = await fetchAnchor(
        anchorId,
        dataView,
        searchSource,
        sort,
        useNewFieldsApi,
        services
      );
      setState({
        anchor: result.anchorRow,
        anchorInterceptedWarnings: result.interceptedWarnings,
        anchorStatus: { value: LoadingStatus.LOADED },
      });
      return result.anchorRow;
    } catch (error) {
      setState(createError('anchorStatus', FailureReason.UNKNOWN, error));
      toastNotifications.addDanger({
        title: errorTitle,
        text: toMountPoint(<Markdown readOnly>{error.message}</Markdown>, {
          theme: services.core.theme,
          i18n: services.core.i18n,
        }),
      });
    }
  }, [
    services,
    tieBreakerFieldName,
    setState,
    toastNotifications,
    dataView,
    anchorId,
    searchSource,
    useNewFieldsApi,
  ]);

  const fetchSurroundingRows = useCallback(
    async (type: SurrDocType, fetchedAnchor?: DataTableRecord) => {
      const filters = filterManager.getFilters();

      const count =
        type === SurrDocType.PREDECESSORS ? appState.predecessorCount : appState.successorCount;
      const anchor = fetchedAnchor || fetchedState.anchor;
      const statusKey = `${type}Status`;
      const warningsKey = `${type}InterceptedWarnings`;
      const errorTitle = i18n.translate('discover.context.unableToLoadDocumentDescription', {
        defaultMessage: 'Unable to load documents',
      });

      try {
        setState({ [statusKey]: { value: LoadingStatus.LOADING } });
        const result = anchor.id
          ? await fetchSurroundingDocs(
              type,
              dataView,
              anchor,
              tieBreakerFieldName,
              SortDirection.desc,
              count,
              filters,
              data,
              useNewFieldsApi,
              services
            )
          : { rows: [], interceptedWarnings: undefined };
        setState({
          [type]: result.rows,
          [warningsKey]: result.interceptedWarnings,
          [statusKey]: { value: LoadingStatus.LOADED },
        });
      } catch (error) {
        setState(createError(statusKey, FailureReason.UNKNOWN, error));
        toastNotifications.addDanger({
          title: errorTitle,
          text: toMountPoint(<Markdown readOnly>{error.message}</Markdown>, {
            theme: services.core.theme,
            i18n: services.core.i18n,
          }),
        });
      }
    },
    [
      services,
      filterManager,
      appState,
      fetchedState.anchor,
      tieBreakerFieldName,
      setState,
      dataView,
      toastNotifications,
      useNewFieldsApi,
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
