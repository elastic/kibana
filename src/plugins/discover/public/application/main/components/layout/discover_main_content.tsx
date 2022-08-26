/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiResizableContainer,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import React, { useCallback, useMemo, useState } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { METRIC_TYPE } from '@kbn/analytics';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DataTableRecord } from '../../../../types';
import { DocumentViewModeToggle, VIEW_MODE } from '../../../../components/view_mode_toggle';
import { DocViewFilterFn } from '../../../../services/doc_views/doc_views_types';
import { DataRefetch$, SavedSearchData } from '../../hooks/use_saved_search';
import { AppState, GetStateReturn } from '../../services/discover_state';
import { DiscoverChart } from '../chart';
import { FieldStatisticsTable } from '../field_stats_table';
import { DiscoverDocuments } from './discover_documents';
import { DOCUMENTS_VIEW_CLICK, FIELD_STATISTICS_VIEW_CLICK } from '../field_stats_table/constants';

const DiscoverChartMemoized = React.memo(DiscoverChart);
const FieldStatisticsTableMemoized = React.memo(FieldStatisticsTable);

export const DiscoverMainContent = ({
  isPlainRecord,
  dataView,
  navigateTo,
  resetSavedSearch,
  expandedDoc,
  setExpandedDoc,
  savedSearch,
  savedSearchData$,
  savedSearchRefetch$,
  state,
  stateContainer,
  isTimeBased,
  viewMode,
  onAddFilter,
  onFieldEdited,
  columns,
}: {
  isPlainRecord: boolean;
  dataView: DataView;
  navigateTo: (url: string) => void;
  resetSavedSearch: () => void;
  expandedDoc?: DataTableRecord;
  setExpandedDoc: (doc?: DataTableRecord) => void;
  savedSearch: SavedSearch;
  savedSearchData$: SavedSearchData;
  savedSearchRefetch$: DataRefetch$;
  state: AppState;
  stateContainer: GetStateReturn;
  isTimeBased: boolean;
  viewMode: VIEW_MODE;
  onAddFilter: DocViewFilterFn | undefined;
  onFieldEdited: () => void;
  columns: string[];
}) => {
  const { trackUiMetric } = useDiscoverServices();
  const { charts$, totalHits$ } = savedSearchData$;
  const { euiTheme } = useEuiTheme();
  const [mainPanel, setMainPanel] = useState<HTMLDivElement>();

  const setDiscoverViewMode = useCallback(
    (mode: VIEW_MODE) => {
      stateContainer.setAppState({ viewMode: mode });

      if (trackUiMetric) {
        if (mode === VIEW_MODE.AGGREGATED_LEVEL) {
          trackUiMetric(METRIC_TYPE.CLICK, FIELD_STATISTICS_VIEW_CLICK);
        } else {
          trackUiMetric(METRIC_TYPE.CLICK, DOCUMENTS_VIEW_CLICK);
        }
      }
    },
    [trackUiMetric, stateContainer]
  );

  const { minHistogramSize, minMainSize, histogramSize, mainSize } = useMemo(() => {
    const preferredHistogramSize = euiTheme.base * 12;
    const resizableContainer = mainPanel?.closest('.dscPageContent__inner');
    const resizableHeight = resizableContainer?.getBoundingClientRect()?.height;
    const histogramHeight = resizableHeight
      ? Math.round((preferredHistogramSize / resizableHeight) * 100)
      : 0;

    return {
      minHistogramSize: `${euiTheme.base * 8}px`,
      minMainSize: `${euiTheme.base * 15}px`,
      histogramSize: histogramHeight,
      mainSize: 100 - histogramHeight,
    };
  }, [euiTheme.base, mainPanel]);

  return (
    <EuiResizableContainer className="dscPageContent__inner" direction="vertical">
      {(EuiResizablePanel, EuiResizableButton) => (
        <>
          {!isPlainRecord && (
            <>
              <EuiResizablePanel
                minSize={minHistogramSize}
                initialSize={histogramSize}
                paddingSize="none"
              >
                <DiscoverChartMemoized
                  resetSavedSearch={resetSavedSearch}
                  savedSearch={savedSearch}
                  savedSearchDataChart$={charts$}
                  savedSearchDataTotalHits$={totalHits$}
                  stateContainer={stateContainer}
                  dataView={dataView}
                  hideChart={state.hideChart}
                  interval={state.interval}
                  isTimeBased={isTimeBased}
                />
              </EuiResizablePanel>
              <EuiResizableButton />
            </>
          )}
          <EuiResizablePanel
            panelRef={(panel) => {
              if (panel) {
                setMainPanel(panel);
              }
            }}
            minSize={minMainSize}
            initialSize={mainSize}
            paddingSize="none"
          >
            <EuiFlexGroup
              className="eui-fullHeight"
              direction="column"
              gutterSize="none"
              responsive={false}
            >
              {!isPlainRecord && (
                <EuiFlexItem grow={false}>
                  <EuiSpacer size="s" />
                  <EuiHorizontalRule margin="none" />
                  <DocumentViewModeToggle
                    viewMode={viewMode}
                    setDiscoverViewMode={setDiscoverViewMode}
                  />
                </EuiFlexItem>
              )}
              {viewMode === VIEW_MODE.DOCUMENT_LEVEL ? (
                <DiscoverDocuments
                  documents$={savedSearchData$.documents$}
                  expandedDoc={expandedDoc}
                  dataView={dataView}
                  navigateTo={navigateTo}
                  onAddFilter={!isPlainRecord ? onAddFilter : undefined}
                  savedSearch={savedSearch}
                  setExpandedDoc={setExpandedDoc}
                  state={state}
                  stateContainer={stateContainer}
                  onFieldEdited={!isPlainRecord ? onFieldEdited : undefined}
                />
              ) : (
                <FieldStatisticsTableMemoized
                  availableFields$={savedSearchData$.availableFields$}
                  savedSearch={savedSearch}
                  dataView={dataView}
                  query={state.query}
                  filters={state.filters}
                  columns={columns}
                  stateContainer={stateContainer}
                  onAddFilter={!isPlainRecord ? onAddFilter : undefined}
                  trackUiMetric={trackUiMetric}
                  savedSearchRefetch$={savedSearchRefetch$}
                />
              )}
            </EuiFlexGroup>
          </EuiResizablePanel>
        </>
      )}
    </EuiResizableContainer>
  );
};
