/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import { UnifiedHistogramContainer } from '@kbn/unified-histogram-plugin/public';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import { ESQL_TABLE_TYPE } from '@kbn/data-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { useDiscoverHistogram } from './use_discover_histogram';
import { type DiscoverMainContentProps, DiscoverMainContent } from './discover_main_content';
import { useAppStateSelector } from '../../state_management/discover_app_state_container';
import { FetchStatus } from '../../../types';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';

export interface DiscoverHistogramLayoutProps extends DiscoverMainContentProps {
  container: HTMLElement | null;
}

const histogramLayoutCss = css`
  height: 100%;
`;

export const DiscoverHistogramLayout = ({
  dataView,
  stateContainer,
  container,
  panelsToggle,
  ...mainContentProps
}: DiscoverHistogramLayoutProps) => {
  const { dataState } = stateContainer;
  const searchSessionId = useObservable(stateContainer.searchSessionManager.searchSessionId$);
  const hideChart = useAppStateSelector((state) => state.hideChart);
  const isEsqlMode = useIsEsqlMode();
  const unifiedHistogramProps = useDiscoverHistogram({
    stateContainer,
    inspectorAdapters: dataState.inspectorAdapters,
    hideChart,
  });

  const datatable = useObservable(dataState.data$.documents$);
  const renderCustomChartToggleActions = useCallback(
    () =>
      React.isValidElement(panelsToggle)
        ? React.cloneElement(panelsToggle, { renderedFor: 'histogram' })
        : panelsToggle,
    [panelsToggle]
  );

  const table: Datatable | undefined = useMemo(() => {
    if (
      isEsqlMode &&
      datatable &&
      [FetchStatus.PARTIAL, FetchStatus.COMPLETE].includes(datatable.fetchStatus)
    ) {
      return {
        type: 'datatable' as 'datatable',
        rows: datatable.result!.map((r) => r.raw),
        columns: datatable.esqlQueryColumns || [],
        meta: {
          type: ESQL_TABLE_TYPE,
        },
      };
    }
  }, [datatable, isEsqlMode]);

  // Initialized when the first search has been requested or
  // when in ES|QL mode since search sessions are not supported
  if (!searchSessionId && !isEsqlMode) {
    return null;
  }

  return (
    <UnifiedHistogramContainer
      {...unifiedHistogramProps}
      searchSessionId={searchSessionId}
      requestAdapter={dataState.inspectorAdapters.requests}
      table={table}
      container={container}
      css={histogramLayoutCss}
      renderCustomChartToggleActions={renderCustomChartToggleActions}
      abortController={stateContainer.dataState.getAbortController()}
    >
      <DiscoverMainContent
        {...mainContentProps}
        stateContainer={stateContainer}
        dataView={dataView}
        panelsToggle={panelsToggle}
      />
    </UnifiedHistogramContainer>
  );
};
