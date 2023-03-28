/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import React, { useCallback } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { VIEW_MODE } from '../../../../../common/constants';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DocumentViewModeToggle } from '../../../../components/view_mode_toggle';
import { DocViewFilterFn } from '../../../../services/doc_views/doc_views_types';
import { DiscoverStateContainer } from '../../services/discover_state';
import { FieldStatisticsTab } from '../field_stats_table';
import { DiscoverDocuments } from './discover_documents';
import { DOCUMENTS_VIEW_CLICK, FIELD_STATISTICS_VIEW_CLICK } from '../field_stats_table/constants';
import { ErrorCallout } from '../../../../components/common/error_callout';
import { useDataState } from '../../hooks/use_data_state';

export interface DiscoverMainContentProps {
  dataView: DataView;
  savedSearch: SavedSearch;
  isPlainRecord: boolean;
  navigateTo: (url: string) => void;
  stateContainer: DiscoverStateContainer;
  viewMode: VIEW_MODE;
  onAddFilter: DocViewFilterFn | undefined;
  onFieldEdited: () => Promise<void>;
  columns: string[];
}

export const DiscoverMainContent = ({
  dataView,
  isPlainRecord,
  navigateTo,
  viewMode,
  onAddFilter,
  onFieldEdited,
  columns,
  stateContainer,
  savedSearch,
}: DiscoverMainContentProps) => {
  const { trackUiMetric } = useDiscoverServices();

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

  const dataState = useDataState(stateContainer.dataState.data$.main$);

  return (
    <EuiFlexGroup
      className="eui-fullHeight"
      direction="column"
      gutterSize="none"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
        {!isPlainRecord && (
          <DocumentViewModeToggle viewMode={viewMode} setDiscoverViewMode={setDiscoverViewMode} />
        )}
      </EuiFlexItem>
      {dataState.error && (
        <ErrorCallout
          title={i18n.translate('discover.documentsErrorTitle', {
            defaultMessage: 'Search error',
          })}
          error={dataState.error}
          inline
          data-test-subj="discoverMainError"
        />
      )}
      {viewMode === VIEW_MODE.DOCUMENT_LEVEL ? (
        <DiscoverDocuments
          dataView={dataView}
          navigateTo={navigateTo}
          onAddFilter={!isPlainRecord ? onAddFilter : undefined}
          savedSearch={savedSearch}
          stateContainer={stateContainer}
          onFieldEdited={!isPlainRecord ? onFieldEdited : undefined}
        />
      ) : (
        <FieldStatisticsTab
          savedSearch={savedSearch}
          dataView={dataView}
          columns={columns}
          stateContainer={stateContainer}
          onAddFilter={!isPlainRecord ? onAddFilter : undefined}
          trackUiMetric={trackUiMetric}
        />
      )}
    </EuiFlexGroup>
  );
};
