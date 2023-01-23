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
import { VIEW_MODE } from '../../../../../common/constants';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DataTableRecord } from '../../../../types';
import { DocumentViewModeToggle } from '../../../../components/view_mode_toggle';
import { DocViewFilterFn } from '../../../../services/doc_views/doc_views_types';
import { DataRefetch$, SavedSearchData } from '../../hooks/use_saved_search';
import { DiscoverStateContainer } from '../../services/discover_state';
import { FieldStatisticsTab } from '../field_stats_table';
import { DiscoverDocuments } from './discover_documents';
import { DOCUMENTS_VIEW_CLICK, FIELD_STATISTICS_VIEW_CLICK } from '../field_stats_table/constants';

export interface DiscoverMainContentProps {
  dataView: DataView;
  savedSearch: SavedSearch;
  isPlainRecord: boolean;
  navigateTo: (url: string) => void;
  savedSearchData$: SavedSearchData;
  savedSearchRefetch$: DataRefetch$;
  stateContainer: DiscoverStateContainer;
  expandedDoc?: DataTableRecord;
  setExpandedDoc: (doc?: DataTableRecord) => void;
  viewMode: VIEW_MODE;
  onAddFilter: DocViewFilterFn | undefined;
  onFieldEdited: () => Promise<void>;
  columns: string[];
}

export const DiscoverMainContent = ({
  dataView,
  isPlainRecord,
  navigateTo,
  savedSearchData$,
  savedSearchRefetch$,
  expandedDoc,
  setExpandedDoc,
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

  return (
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
          stateContainer={stateContainer}
          onFieldEdited={!isPlainRecord ? onFieldEdited : undefined}
        />
      ) : (
        <FieldStatisticsTab
          availableFields$={savedSearchData$.availableFields$}
          savedSearch={savedSearch}
          dataView={dataView}
          columns={columns}
          stateContainer={stateContainer}
          onAddFilter={!isPlainRecord ? onAddFilter : undefined}
          trackUiMetric={trackUiMetric}
          savedSearchRefetch$={savedSearchRefetch$}
          savedSearchDataTotalHits$={savedSearchData$.totalHits$}
        />
      )}
    </EuiFlexGroup>
  );
};
