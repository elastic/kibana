/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { type DropType, DropOverlayWrapper, Droppable } from '@kbn/dom-drag-drop';
import React, { ReactElement, useCallback, useMemo } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { VIEW_MODE } from '../../../../../common/constants';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DocumentViewModeToggle } from '../../../../components/view_mode_toggle';
import { DiscoverStateContainer } from '../../state_management/discover_state';
import { FieldStatisticsTab } from '../field_stats_table';
import { DiscoverDocuments } from './discover_documents';
import { DOCUMENTS_VIEW_CLICK, FIELD_STATISTICS_VIEW_CLICK } from '../field_stats_table/constants';
import { useAppStateSelector } from '../../state_management/discover_app_state_container';
import type { PanelsToggleProps } from '../../../../components/panels_toggle';
import { PatternAnalysisTab } from '../pattern_analysis/pattern_analysis_tab';
import { PATTERN_ANALYSIS_VIEW_CLICK } from '../pattern_analysis/constants';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';

const DROP_PROPS = {
  value: {
    id: 'dscDropZoneTable',
    humanData: {
      label: i18n.translate('discover.dropZoneTableLabel', {
        defaultMessage: 'Drop zone to add field as a column to the table',
      }),
    },
  },
  order: [1, 0, 0, 0],
  types: ['field_add'] as DropType[],
};

export interface DiscoverMainContentProps {
  dataView: DataView;
  stateContainer: DiscoverStateContainer;
  viewMode: VIEW_MODE;
  onAddFilter: DocViewFilterFn | undefined;
  onFieldEdited: () => Promise<void>;
  onDropFieldToTable?: () => void;
  columns: string[];
  panelsToggle: ReactElement<PanelsToggleProps>;
  isChartAvailable?: boolean; // it will be injected by UnifiedHistogram
}

export const DiscoverMainContent = ({
  dataView,
  viewMode,
  onAddFilter,
  onFieldEdited,
  columns,
  stateContainer,
  onDropFieldToTable,
  panelsToggle,
  isChartAvailable,
}: DiscoverMainContentProps) => {
  const { trackUiMetric } = useDiscoverServices();
  const isEsqlMode = useIsEsqlMode();

  const setDiscoverViewMode = useCallback(
    (mode: VIEW_MODE) => {
      stateContainer.appState.update({ viewMode: mode }, true);

      if (trackUiMetric) {
        if (mode === VIEW_MODE.AGGREGATED_LEVEL) {
          trackUiMetric(METRIC_TYPE.CLICK, FIELD_STATISTICS_VIEW_CLICK);
        } else if (mode === VIEW_MODE.PATTERN_LEVEL) {
          trackUiMetric(METRIC_TYPE.CLICK, PATTERN_ANALYSIS_VIEW_CLICK);
        } else {
          trackUiMetric(METRIC_TYPE.CLICK, DOCUMENTS_VIEW_CLICK);
        }
      }
    },
    [trackUiMetric, stateContainer]
  );

  const isDropAllowed = Boolean(onDropFieldToTable);

  const renderViewModeToggle = useCallback(
    (patternCount?: number) => {
      return (
        <DocumentViewModeToggle
          viewMode={viewMode}
          isEsqlMode={isEsqlMode}
          stateContainer={stateContainer}
          setDiscoverViewMode={setDiscoverViewMode}
          patternCount={patternCount}
          dataView={dataView}
          prepend={
            React.isValidElement(panelsToggle)
              ? React.cloneElement(panelsToggle, { renderedFor: 'tabs', isChartAvailable })
              : undefined
          }
        />
      );
    },
    [
      viewMode,
      isEsqlMode,
      stateContainer,
      setDiscoverViewMode,
      dataView,
      panelsToggle,
      isChartAvailable,
    ]
  );

  const viewModeToggle = useMemo(() => renderViewModeToggle(), [renderViewModeToggle]);

  const showChart = useAppStateSelector((state) => !state.hideChart);

  return (
    <Droppable
      dropTypes={isDropAllowed ? DROP_PROPS.types : undefined}
      value={DROP_PROPS.value}
      order={DROP_PROPS.order}
      onDrop={onDropFieldToTable}
    >
      <DropOverlayWrapper isVisible={isDropAllowed}>
        <EuiFlexGroup
          className="eui-fullHeight"
          direction="column"
          gutterSize="none"
          responsive={false}
          data-test-subj="dscMainContent"
        >
          {showChart && isChartAvailable && <EuiHorizontalRule margin="none" />}
          {viewMode === VIEW_MODE.DOCUMENT_LEVEL ? (
            <DiscoverDocuments
              viewModeToggle={viewModeToggle}
              dataView={dataView}
              onAddFilter={onAddFilter}
              stateContainer={stateContainer}
              onFieldEdited={!isEsqlMode ? onFieldEdited : undefined}
            />
          ) : null}
          {viewMode === VIEW_MODE.AGGREGATED_LEVEL ? (
            <>
              <EuiFlexItem grow={false}>{viewModeToggle}</EuiFlexItem>
              <FieldStatisticsTab
                dataView={dataView}
                columns={columns}
                stateContainer={stateContainer}
                onAddFilter={!isEsqlMode ? onAddFilter : undefined}
                trackUiMetric={trackUiMetric}
                isEsqlMode={isEsqlMode}
              />
            </>
          ) : null}
          {viewMode === VIEW_MODE.PATTERN_LEVEL ? (
            <PatternAnalysisTab
              dataView={dataView}
              stateContainer={stateContainer}
              switchToDocumentView={() => setDiscoverViewMode(VIEW_MODE.DOCUMENT_LEVEL)}
              trackUiMetric={trackUiMetric}
              renderViewModeToggle={renderViewModeToggle}
            />
          ) : null}
        </EuiFlexGroup>
      </DropOverlayWrapper>
    </Droppable>
  );
};
