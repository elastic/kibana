/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import React, { RefObject, useCallback, useEffect, useMemo, useState } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { METRIC_TYPE } from '@kbn/analytics';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { css } from '@emotion/css';
import { Panels, PANELS_MODE, UnifiedHistogramLayout } from '@kbn/unified-histogram-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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
import {
  getVisualizeInformation,
  triggerVisualizeActions,
} from '../sidebar/lib/visualize_trigger_utils';
import { useDataState } from '../../hooks/use_data_state';

const DiscoverChartMemoized = React.memo(DiscoverChart);
const FieldStatisticsTableMemoized = React.memo(FieldStatisticsTable);

export const HISTOGRAM_HEIGHT_KEY = 'discover:histogramHeight';

export interface DiscoverMainContentProps {
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
  onFieldEdited: () => Promise<void>;
  columns: string[];
  resizeRef: RefObject<HTMLDivElement>;
}

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
}: DiscoverMainContentProps) => {
  const { trackUiMetric, storage, data, theme, uiSettings, fieldFormats } = useDiscoverServices();

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

  const topPanelNode = useMemo(
    () => createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } }),
    []
  );

  const mainPanelNode = useMemo(
    () => createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } }),
    []
  );

  const hideChart = state.hideChart || !isTimeBased;
  const showFixedPanels = useIsWithinBreakpoints(['xs', 's']) || isPlainRecord || hideChart;
  const { euiTheme } = useEuiTheme();
  const defaultTopPanelHeight = euiTheme.base * 12;
  const minTopPanelHeight = euiTheme.base * 8;
  const minMainPanelHeight = euiTheme.base * 10;

  const [topPanelHeight, setTopPanelHeight] = useState(() => {
    const storedHeight = storage.get(HISTOGRAM_HEIGHT_KEY);
    return storedHeight ? Number(storedHeight) : undefined;
  });

  const storeTopPanelHeight = useCallback(
    (newTopPanelHeight: number) => {
      storage.set(HISTOGRAM_HEIGHT_KEY, newTopPanelHeight);
      setTopPanelHeight(newTopPanelHeight);
    },
    [storage]
  );

  const resetTopPanelHeight = useCallback(
    () => storeTopPanelHeight(defaultTopPanelHeight),
    [storeTopPanelHeight, defaultTopPanelHeight]
  );

  const onTopPanelHeightChange = useCallback(
    (newTopPanelHeight: number) => storeTopPanelHeight(newTopPanelHeight),
    [storeTopPanelHeight]
  );

  const chartClassName =
    showFixedPanels && !hideChart
      ? css`
          height: ${defaultTopPanelHeight}px;
        `
      : 'eui-fullHeight';

  const panelsMode = isPlainRecord
    ? PANELS_MODE.SINGLE
    : showFixedPanels
    ? PANELS_MODE.FIXED
    : PANELS_MODE.RESIZABLE;

  const timeField = dataView.timeFieldName && dataView.getFieldByName(dataView.timeFieldName);
  const [canVisualize, setCanVisualize] = useState(false);

  useEffect(() => {
    if (!timeField) return;
    getVisualizeInformation(timeField, dataView, savedSearch.columns || []).then((info) => {
      setCanVisualize(Boolean(info));
    });
  }, [dataView, savedSearch.columns, timeField]);

  const onEditVisualization = useCallback(() => {
    if (!timeField) {
      return;
    }
    triggerVisualizeActions(timeField, savedSearch.columns || [], dataView);
  }, [dataView, savedSearch.columns, timeField]);

  const {
    chartData,
    bucketInterval,
    fetchStatus: chartFetchStatus,
    error,
  } = useDataState(savedSearchData$.charts$);

  const { result: hits, fetchStatus: hitsFetchStatus } = useDataState(savedSearchData$.totalHits$);

  const histogram = {
    hidden: hideChart,
    timeInterval: state.interval,
    bucketInterval,
    chart: chartData,
    error,
  };

  return (
    <UnifiedHistogramLayout
      className="dscPageContent__inner"
      services={{ data, theme, uiSettings, fieldFormats }}
      status={}
      hits={hits}
      histogram={histogram}
      resizeRef={resizeRef}
      topPanelHeight={topPanelHeight}
      appendHitsCounter={
        savedSearch?.id ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="refresh"
              data-test-subj="resetSavedSearch"
              onClick={resetSavedSearch}
              size="s"
              aria-label={i18n.translate('discover.reloadSavedSearchButton', {
                defaultMessage: 'Reset search',
              })}
            >
              <FormattedMessage
                id="discover.reloadSavedSearchButton"
                defaultMessage="Reset search"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : undefined
      }
      onTopPanelHeightChange={onTopPanelHeightChange}
      onEditVisualization={canVisualize ? onEditVisualization : undefined}
      onResetChartHeight={resetTopPanelHeight}
      onHideChartChange={(newHideChart) => stateContainer.setAppState({ hideChart: newHideChart })}
      onIntervalChange={(newInterval) => stateContainer.setAppState({ interval: newInterval })}
    >
      <EuiFlexGroup
        className="eui-fullHeight"
        direction="column"
        gutterSize="none"
        responsive={false}
      >
        {!isPlainRecord && (
          <EuiFlexItem grow={false}>
            {!showFixedPanels && <EuiSpacer size="s" />}
            <EuiHorizontalRule margin="none" />
            <DocumentViewModeToggle viewMode={viewMode} setDiscoverViewMode={setDiscoverViewMode} />
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
            savedSearchDataTotalHits$={savedSearchData$.totalHits$}
          />
        )}
      </EuiFlexGroup>
    </UnifiedHistogramLayout>
  );

  return (
    <>
      <InPortal node={topPanelNode}>
        <DiscoverChartMemoized
          className={chartClassName}
          resetSavedSearch={resetSavedSearch}
          savedSearch={savedSearch}
          savedSearchDataChart$={savedSearchData$.charts$}
          savedSearchDataTotalHits$={savedSearchData$.totalHits$}
          stateContainer={stateContainer}
          dataView={dataView}
          hideChart={state.hideChart}
          interval={state.interval}
          isTimeBased={isTimeBased}
          appendHistogram={showFixedPanels ? <EuiSpacer size="s" /> : <EuiSpacer size="m" />}
          onResetChartHeight={
            topPanelHeight !== defaultTopPanelHeight &&
            panelsMode === PANELS_MODE.RESIZABLE
              ? resetTopPanelHeight
              : undefined
          }
        />
      </InPortal>
      <InPortal node={mainPanelNode}>
        <EuiFlexGroup
          className="eui-fullHeight"
          direction="column"
          gutterSize="none"
          responsive={false}
        >
          {!isPlainRecord && (
            <EuiFlexItem grow={false}>
              {!showFixedPanels && <EuiSpacer size="s" />}
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
              savedSearchDataTotalHits$={savedSearchData$.totalHits$}
            />
          )}
        </EuiFlexGroup>
      </InPortal>
      <Panels
        className="dscPageContent__inner"
        mode={panelsMode}
        resizeRef={resizeRef}
        topPanelHeight={topPanelHeight}
        minTopPanelHeight={minTopPanelHeight}
        minMainPanelHeight={minMainPanelHeight}
        topPanel={<OutPortal node={topPanelNode} />}
        mainPanel={<OutPortal node={mainPanelNode} />}
        onTopPanelHeightChange={onTopPanelHeightChange}
      />
    </>
  );
};
