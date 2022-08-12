/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSelector } from '@xstate/react';
import React, { memo, useCallback, useMemo } from 'react';
import { SAMPLE_SIZE_SETTING } from '../../../../../common';
import { DiscoverGrid } from '../../../../components/discover_grid/discover_grid';
import { SortPairArr } from '../../../../components/doc_table/utils/get_sort';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DocViewFilterFn } from '../../../../services/doc_views/doc_views_types';
import { SavedSearch } from '../../../../services/saved_searches';
import { DataTableRecord } from '../../../../types';
import { AppState, GetStateReturn } from '../../../main/services/discover_state';
import {
  DataAccessService,
  selectIsLoading,
  selectIsReloading,
} from '../../state_machines/data_access_state_machine';
import { LogExplorerGrid } from '../log_explorer_grid';

const DataGridMemoized = React.memo(DiscoverGrid);
const LogExplorerGridMemoized = React.memo(LogExplorerGrid);

function LogExplorerComponent({
  expandedDoc,
  dataView,
  onAddFilter,
  savedSearch,
  setExpandedDoc,
  state,
  stateContainer,
  stateMachine,
}: {
  expandedDoc?: DataTableRecord;
  dataView: DataView;
  navigateTo: (url: string) => void;
  onAddFilter: DocViewFilterFn;
  savedSearch: SavedSearch;
  setExpandedDoc: (doc?: DataTableRecord) => void;
  state: AppState;
  stateContainer: GetStateReturn;
  stateMachine: DataAccessService;
}) {
  const { fieldFormats, uiSettings } = useDiscoverServices();
  const sampleSize = useMemo(() => uiSettings.get(SAMPLE_SIZE_SETTING), [uiSettings]);

  const isLoading = useSelector(stateMachine, selectIsLoading);
  const isReloading = useSelector(stateMachine, selectIsReloading);

  const onSort = useCallback(
    (sort: string[][]) => {
      stateContainer.setAppState({ sort });
    },
    [stateContainer]
  );

  const onUpdateRowHeight = useCallback(
    (newRowHeight: number) => {
      stateContainer.setAppState({ rowHeight: newRowHeight });
    },
    [stateContainer]
  );

  if (isReloading) {
    return (
      <div className="dscDocuments__loading">
        <EuiText size="xs" color="subdued">
          <EuiLoadingSpinner />
          <EuiSpacer size="s" />
          <FormattedMessage id="discover.loadingDocuments" defaultMessage="Loading documents" />
        </EuiText>
      </div>
    );
  }

  return (
    <EuiFlexItem className="dscTable" aria-labelledby="documentsAriaLabel">
      <EuiScreenReaderOnly>
        <h2 id="documentsAriaLabel">
          <FormattedMessage id="discover.documentsAriaLabel" defaultMessage="Documents" />
        </h2>
      </EuiScreenReaderOnly>
      <div className="dscDiscoverGrid">
        <LogExplorerGridMemoized fieldFormats={fieldFormats} />
      </div>
    </EuiFlexItem>
  );

  return (
    <EuiFlexItem className="dscTable" aria-labelledby="documentsAriaLabel">
      <EuiScreenReaderOnly>
        <h2 id="documentsAriaLabel">
          <FormattedMessage id="discover.documentsAriaLabel" defaultMessage="Documents" />
        </h2>
      </EuiScreenReaderOnly>
      <div className="dscDiscoverGrid">
        <DataGridMemoized
          ariaLabelledBy="documentsAriaLabel"
          columns={columns}
          expandedDoc={expandedDoc}
          dataView={dataView}
          isLoading={isLoading}
          rows={rows}
          sort={(state.sort as SortPairArr[]) || []}
          sampleSize={sampleSize}
          searchDescription={savedSearch.description}
          searchTitle={savedSearch.title}
          setExpandedDoc={setExpandedDoc}
          showTimeCol={showTimeCol}
          settings={state.grid}
          onAddColumn={onAddColumn}
          onFilter={onAddFilter as DocViewFilterFn}
          onRemoveColumn={onRemoveColumn}
          onSetColumns={onSetColumns}
          onSort={onSort}
          onResize={onResize}
          useNewFieldsApi={true}
          rowHeightState={state.rowHeight}
          onUpdateRowHeight={onUpdateRowHeight}
        />
      </div>
    </EuiFlexItem>
  );
}

export const LogExplorer = memo(LogExplorerComponent);
