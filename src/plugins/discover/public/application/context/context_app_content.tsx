/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiText, useEuiPaddingSize } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { SortDirection } from '@kbn/data-plugin/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { CellActionsProvider } from '@kbn/cell-actions';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import {
  type SearchResponseWarning,
  SearchResponseWarningsCallout,
} from '@kbn/search-response-warnings';
import {
  CONTEXT_STEP_SETTING,
  DOC_HIDE_TIME_COLUMN_SETTING,
  MAX_DOC_FIELDS_DISPLAYED,
  ROW_HEIGHT_OPTION,
  SHOW_MULTIFIELDS,
} from '@kbn/discover-utils';
import { DataLoadingState } from '@kbn/unified-data-table';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { DiscoverGrid } from '../../components/discover_grid';
import { getDefaultRowsPerPage } from '../../../common/constants';
import { LoadingStatus } from './services/context_query_state';
import { ActionBar } from './components/action_bar/action_bar';
import { AppState } from './services/context_state';
import { SurrDocType } from './services/context';
import { MAX_CONTEXT_SIZE, MIN_CONTEXT_SIZE } from './services/constants';
import { DocTableContext } from '../../components/doc_table/doc_table_context';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { DiscoverGridFlyout } from '../../components/discover_grid_flyout';
import { onResizeGridColumn } from '../../utils/on_resize_grid_column';

export interface ContextAppContentProps {
  columns: string[];
  onAddColumn: (columnsName: string) => void;
  onRemoveColumn: (columnsName: string) => void;
  onSetColumns: (columnsNames: string[], hideTimeColumn: boolean) => void;
  dataView: DataView;
  predecessorCount: number;
  successorCount: number;
  rows: DataTableRecord[];
  predecessors: DataTableRecord[];
  successors: DataTableRecord[];
  anchorStatus: LoadingStatus;
  predecessorsStatus: LoadingStatus;
  successorsStatus: LoadingStatus;
  interceptedWarnings: SearchResponseWarning[];
  useNewFieldsApi: boolean;
  isLegacy: boolean;
  setAppState: (newState: Partial<AppState>) => void;
  addFilter: DocViewFilterFn;
}

const controlColumnIds = ['openDetails'];

export function clamp(value: number) {
  return Math.max(Math.min(MAX_CONTEXT_SIZE, value), MIN_CONTEXT_SIZE);
}

const DiscoverGridMemoized = React.memo(DiscoverGrid);
const DocTableContextMemoized = React.memo(DocTableContext);
const ActionBarMemoized = React.memo(ActionBar);

export function ContextAppContent({
  columns,
  onAddColumn,
  onRemoveColumn,
  onSetColumns,
  dataView,
  predecessorCount,
  successorCount,
  rows,
  predecessors,
  successors,
  anchorStatus,
  predecessorsStatus,
  successorsStatus,
  interceptedWarnings,
  useNewFieldsApi,
  isLegacy,
  setAppState,
  addFilter,
}: ContextAppContentProps) {
  const { uiSettings: config, uiActions } = useDiscoverServices();
  const services = useDiscoverServices();
  const [gridSettings, setGridSettings] = useState<DiscoverGridSettings>();

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>();
  const isAnchorLoading =
    anchorStatus === LoadingStatus.LOADING || anchorStatus === LoadingStatus.UNINITIALIZED;
  const arePredecessorsLoading =
    predecessorsStatus === LoadingStatus.LOADING ||
    predecessorsStatus === LoadingStatus.UNINITIALIZED;
  const areSuccessorsLoading =
    successorsStatus === LoadingStatus.LOADING || successorsStatus === LoadingStatus.UNINITIALIZED;

  const showTimeCol = useMemo(
    () => !config.get(DOC_HIDE_TIME_COLUMN_SETTING, false) && !!dataView.timeFieldName,
    [config, dataView]
  );
  const defaultStepSize = useMemo(() => parseInt(config.get(CONTEXT_STEP_SETTING), 10), [config]);

  const loadingFeedback = () => {
    if (isLegacy && isAnchorLoading) {
      return (
        <EuiText textAlign="center" data-test-subj="contextApp_loadingIndicator">
          <FormattedMessage id="discover.context.loadingDescription" defaultMessage="Loading..." />
        </EuiText>
      );
    }
    return null;
  };

  const onChangeCount = useCallback(
    (type: SurrDocType, count: number) => {
      const countKey = type === SurrDocType.SUCCESSORS ? 'successorCount' : 'predecessorCount';
      setAppState({ [countKey]: clamp(count) });
    },
    [setAppState]
  );
  const sort = useMemo(() => {
    return [[dataView.timeFieldName!, SortDirection.desc]];
  }, [dataView]);

  const renderDocumentView = useCallback(
    (hit: DataTableRecord, displayedRows: DataTableRecord[], displayedColumns: string[]) => (
      <DiscoverGridFlyout
        dataView={dataView}
        hit={hit}
        hits={displayedRows}
        // if default columns are used, dont make them part of the URL - the context state handling will take care to restore them
        columns={displayedColumns}
        onFilter={addFilter}
        onRemoveColumn={onRemoveColumn}
        onAddColumn={onAddColumn}
        onClose={() => setExpandedDoc(undefined)}
        setExpandedDoc={setExpandedDoc}
      />
    ),
    [addFilter, dataView, onAddColumn, onRemoveColumn]
  );

  const onResize = useCallback(
    (colSettings) => {
      setGridSettings((currentGridSettings) =>
        onResizeGridColumn(colSettings, currentGridSettings)
      );
    },
    [setGridSettings]
  );

  useEffect(() => {
    console.log(`discover columns chnaged`, { columns });
  }, [columns]);

  return (
    <Fragment>
      <WrapperWithPadding>
        {Boolean(interceptedWarnings.length) && (
          <>
            <SearchResponseWarningsCallout warnings={interceptedWarnings} />
            <EuiSpacer size="s" />
          </>
        )}
        <ActionBarMemoized
          type={SurrDocType.PREDECESSORS}
          defaultStepSize={defaultStepSize}
          docCount={predecessorCount}
          docCountAvailable={predecessors.length}
          onChangeCount={onChangeCount}
          isLoading={arePredecessorsLoading}
          isDisabled={isAnchorLoading}
        />
        {loadingFeedback()}
      </WrapperWithPadding>
      {isLegacy && rows && rows.length !== 0 && (
        <DocTableContextMemoized
          columns={columns}
          dataView={dataView}
          rows={rows}
          isLoading={isAnchorLoading}
          onFilter={addFilter}
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
          sort={sort}
          useNewFieldsApi={useNewFieldsApi}
          dataTestSubj="contextDocTable"
        />
      )}
      {!isLegacy && (
        <div className="dscDocsGrid">
          <CellActionsProvider getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}>
            <DiscoverGridMemoized
              ariaLabelledBy="surDocumentsAriaLabel"
              columns={columns}
              rows={rows}
              dataView={dataView}
              expandedDoc={expandedDoc}
              loadingState={isAnchorLoading ? DataLoadingState.loading : DataLoadingState.loaded}
              sampleSizeState={0}
              sort={sort as SortOrder[]}
              isSortEnabled={false}
              showTimeCol={showTimeCol}
              useNewFieldsApi={useNewFieldsApi}
              isPaginationEnabled={false}
              rowsPerPageState={getDefaultRowsPerPage(services.uiSettings)}
              controlColumnIds={controlColumnIds}
              setExpandedDoc={setExpandedDoc}
              onFilter={addFilter}
              onSetColumns={onSetColumns}
              configRowHeight={services.uiSettings.get(ROW_HEIGHT_OPTION)}
              showMultiFields={services.uiSettings.get(SHOW_MULTIFIELDS)}
              maxDocFieldsDisplayed={services.uiSettings.get(MAX_DOC_FIELDS_DISPLAYED)}
              renderDocumentView={renderDocumentView}
              services={services}
              configHeaderRowHeight={3}
              settings={gridSettings}
              onResize={onResize}
            />
          </CellActionsProvider>
        </div>
      )}
      <WrapperWithPadding>
        <ActionBarMemoized
          type={SurrDocType.SUCCESSORS}
          defaultStepSize={defaultStepSize}
          docCount={successorCount}
          docCountAvailable={successors.length}
          onChangeCount={onChangeCount}
          isLoading={areSuccessorsLoading}
          isDisabled={isAnchorLoading}
        />
      </WrapperWithPadding>
    </Fragment>
  );
}

const WrapperWithPadding: React.FC = ({ children }) => {
  const padding = useEuiPaddingSize('s');

  return (
    <div
      css={css`
        padding: 0 ${padding};
      `}
    >
      {children}
    </div>
  );
};
