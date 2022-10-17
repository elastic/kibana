/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import React, { RefObject, useCallback } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { METRIC_TYPE } from '@kbn/analytics';
import { UnifiedHistogramLayout } from '@kbn/unified-histogram-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DataTableRecord } from '../../../../types';
import { DocumentViewModeToggle, VIEW_MODE } from '../../../../components/view_mode_toggle';
import { DocViewFilterFn } from '../../../../services/doc_views/doc_views_types';
import { DataRefetch$, SavedSearchData } from '../../hooks/use_saved_search';
import { AppState, GetStateReturn } from '../../services/discover_state';
import { FieldStatisticsTable } from '../field_stats_table';
import { DiscoverDocuments } from './discover_documents';
import { DOCUMENTS_VIEW_CLICK, FIELD_STATISTICS_VIEW_CLICK } from '../field_stats_table/constants';
import { useDiscoverHistogram } from './use_discover_histogram';

const FieldStatisticsTableMemoized = React.memo(FieldStatisticsTable);

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
  const services = useDiscoverServices();
  const { trackUiMetric } = services;

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

  const {
    topPanelHeight,
    hits,
    chart,
    onEditVisualization,
    onTopPanelHeightChange,
    onChartHiddenChange,
    onTimeIntervalChange,
  } = useDiscoverHistogram({
    stateContainer,
    state,
    savedSearchData$,
    dataView,
    savedSearch,
    isTimeBased,
    isPlainRecord,
  });

  return (
    <UnifiedHistogramLayout
      className="dscPageContent__inner"
      services={services}
      dataView={dataView}
      hits={hits}
      chart={chart}
      breakdown={{ field: dataView.fields.getByName('DestWeather') }}
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
      onEditVisualization={onEditVisualization}
      onChartHiddenChange={onChartHiddenChange}
      onTimeIntervalChange={onTimeIntervalChange}
    >
      <EuiFlexGroup
        className="eui-fullHeight"
        direction="column"
        gutterSize="none"
        responsive={false}
      >
        {!isPlainRecord && (
          <EuiFlexItem grow={false}>
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
};
