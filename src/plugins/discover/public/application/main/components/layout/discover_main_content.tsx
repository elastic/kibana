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
import { DiscoverStateContainer } from '../../services/discover_state';
import { FieldStatisticsTab } from '../field_stats_table';
import { DiscoverDocuments } from './discover_documents';
import { DOCUMENTS_VIEW_CLICK, FIELD_STATISTICS_VIEW_CLICK } from '../field_stats_table/constants';
import { useAppStateSelector } from '../../services/discover_app_state_container';
import type { PanelsToggleProps } from '../../../../components/panels_toggle';
import { LogCategorizationTab } from '../log_categorization/log_categorization_tab';

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
  isPlainRecord: boolean;
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
  isPlainRecord,
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
  const [patternCount, setPatternCount] = React.useState<number | undefined>(undefined);

  const setDiscoverViewMode = useCallback(
    (mode: VIEW_MODE) => {
      stateContainer.appState.update({ viewMode: mode });

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

  const isDropAllowed = Boolean(onDropFieldToTable);

  const viewModeToggle = useMemo(() => {
    return (
      <DocumentViewModeToggle
        viewMode={viewMode}
        isTextBasedQuery={isPlainRecord}
        stateContainer={stateContainer}
        setDiscoverViewMode={setDiscoverViewMode}
        patternCount={patternCount}
        prepend={
          React.isValidElement(panelsToggle)
            ? React.cloneElement(panelsToggle, { renderedFor: 'tabs', isChartAvailable })
            : undefined
        }
      />
    );
  }, [
    viewMode,
    setDiscoverViewMode,
    isPlainRecord,
    stateContainer,
    panelsToggle,
    isChartAvailable,
    patternCount,
  ]);

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
              onAddFilter={!isPlainRecord ? onAddFilter : undefined}
              stateContainer={stateContainer}
              onFieldEdited={!isPlainRecord ? onFieldEdited : undefined}
            />
          ) : null}
          {viewMode === VIEW_MODE.AGGREGATED_LEVEL ? (
            <>
              <EuiFlexItem grow={false}>{viewModeToggle}</EuiFlexItem>
              <FieldStatisticsTab
                dataView={dataView}
                columns={columns}
                stateContainer={stateContainer}
                onAddFilter={!isPlainRecord ? onAddFilter : undefined}
                trackUiMetric={trackUiMetric}
              />
            </>
          ) : null}
          {viewMode === VIEW_MODE.PATTERN_LEVEL ? (
            <>
              <LogCategorizationTab
                dataView={dataView}
                stateContainer={stateContainer}
                onAddFilter={() => setDiscoverViewMode(VIEW_MODE.DOCUMENT_LEVEL)}
                trackUiMetric={trackUiMetric}
                setPatternCount={setPatternCount}
                viewModeToggle={viewModeToggle}
              />
            </>
          ) : null}
        </EuiFlexGroup>
      </DropOverlayWrapper>
    </Droppable>
  );
};
