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
  useResizeObserver,
} from '@elastic/eui';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import React, { RefObject, useCallback, useEffect, useState } from 'react';
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

const percentToPixels = (containerHeight: number, percentage: number) =>
  Math.round(containerHeight * (percentage / 100));

const pixelsToPercent = (containerHeight: number, pixels: number) =>
  +((pixels / containerHeight) * 100).toFixed(4);

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
  resizeRef,
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
  resizeRef: RefObject<HTMLDivElement>;
}) => {
  /**
   * View mode
   */

  const { trackUiMetric } = useDiscoverServices();

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

  /**
   * Panel resizing
   */

  const { euiTheme } = useEuiTheme();
  const preferredHistogramHeight = euiTheme.base * 12;
  const minHistogramHeight = euiTheme.base * 8;
  const minMainHeight = euiTheme.base * 10;
  const histogramPanelId = 'dscHistogramPanel';
  const { height: containerHeight } = useResizeObserver(resizeRef.current);
  const [histogramHeight, setHistogramHeight] = useState<number>(preferredHistogramHeight);
  const [panelSizes, setPanelSizes] = useState({ histogramSize: 0, mainSize: 0 });

  // Instead of setting the panel sizes directly, we convert the histogram height
  // from a percentage of the container height to a pixel value. This will trigger
  // the effect below to update the panel sizes.
  const onPanelSizeChange = useCallback(
    ({ [histogramPanelId]: histogramSize }: { [key: string]: number }) => {
      setHistogramHeight(percentToPixels(containerHeight, histogramSize));
    },
    [containerHeight]
  );

  // This effect will update the panel sizes based on the histogram height whenever
  // it or the container height changes. This allows us to keep the height of the
  // histogram panel fixed when the window is resized.
  useEffect(() => {
    if (!containerHeight) {
      return;
    }

    let histogramSize: number;

    // If the container height is less than the minimum main content height
    // plus the current histogram height, then we need to make some adjustments.
    if (containerHeight < minMainHeight + histogramHeight) {
      const newHistogramHeight = containerHeight - minMainHeight;

      // Try to make the histogram height fit within the container, but if it
      // doesn't then just use the minimum height.
      if (newHistogramHeight < minHistogramHeight) {
        histogramSize = pixelsToPercent(containerHeight, minHistogramHeight);
      } else {
        histogramSize = pixelsToPercent(containerHeight, newHistogramHeight);
      }
    } else {
      histogramSize = pixelsToPercent(containerHeight, histogramHeight);
    }

    setPanelSizes({ histogramSize, mainSize: 100 - histogramSize });
  }, [containerHeight, histogramHeight, minHistogramHeight, minMainHeight]);

  return (
    <EuiResizableContainer
      className="dscPageContent__inner"
      direction="vertical"
      onPanelWidthChange={onPanelSizeChange}
    >
      {(EuiResizablePanel, EuiResizableButton) => (
        <>
          {!isPlainRecord && (
            <>
              <EuiResizablePanel
                id={histogramPanelId}
                minSize={`${minHistogramHeight}px`}
                size={panelSizes.histogramSize}
                paddingSize="none"
              >
                <DiscoverChartMemoized
                  resetSavedSearch={resetSavedSearch}
                  savedSearch={savedSearch}
                  savedSearchDataChart$={savedSearchData$.charts$}
                  savedSearchDataTotalHits$={savedSearchData$.totalHits$}
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
            minSize={`${minMainHeight}px`}
            size={panelSizes.mainSize}
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
