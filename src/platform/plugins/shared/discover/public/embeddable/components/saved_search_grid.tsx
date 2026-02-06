/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { AggregateQuery, Query, Filter } from '@kbn/es-query';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import { MAX_DOC_FIELDS_DISPLAYED, SHOW_MULTIFIELDS } from '@kbn/discover-utils';
import {
  type UnifiedDataTableProps,
  type DataTableColumnsMeta,
  DataLoadingState as DiscoverGridLoadingState,
  getRenderCustomToolbarWithElements,
  getDataGridDensity,
  getRowHeight,
} from '@kbn/unified-data-table';
import type { DocViewerApi } from '@kbn/unified-doc-viewer';
import { EuiCallOut, EuiFormRow, EuiSuperSelect, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { DiscoverGrid } from '../../components/discover_grid';
import { DiscoverGridFlyout } from '../../components/discover_grid_flyout';
import { SavedSearchEmbeddableBase } from './saved_search_embeddable_base';
import { TotalDocuments } from '../../application/main/components/total_documents/total_documents';
import { useProfileAccessor } from '../../context_awareness';

interface DiscoverGridEmbeddableProps extends Omit<UnifiedDataTableProps, 'sampleSizeState'> {
  sampleSizeState: number; // a required prop
  totalHitCount?: number;
  query: AggregateQuery | Query | undefined;
  filters: Filter[] | undefined;
  interceptedWarnings?: SearchResponseWarning[];
  onAddColumn: (column: string) => void;
  onRemoveColumn: (column: string) => void;
  savedSearchId?: string;
  enableDocumentViewer: boolean;
  isEditMode?: boolean;
  tabs: DiscoverSessionTab[];
  selectedTabId?: string;
  selectedTabNotFound?: boolean;
  onTabChange: (tabId: string) => Promise<void>;
}

export const DiscoverGridMemoized = React.memo(DiscoverGrid);

const DELETED_TAB_ID = '__deleted_tab__';

export function DiscoverGridEmbeddable(props: DiscoverGridEmbeddableProps) {
  const {
    interceptedWarnings,
    isEditMode,
    enableDocumentViewer,
    onTabChange,
    selectedTabId,
    selectedTabNotFound,
    tabs,
    ...gridProps
  } = props;
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);
  const [initialTabId, setInitialTabId] = useState<string | undefined>(undefined);
  const docViewerRef = useRef<DocViewerApi>(null);

  const setExpandedDocWithInitialTab = useCallback(
    (doc: DataTableRecord | undefined, options?: { initialTabId?: string }) => {
      setExpandedDoc(doc);
      setInitialTabId(options?.initialTabId);
      if (options?.initialTabId) {
        docViewerRef.current?.setSelectedTabId(options.initialTabId);
      }
    },
    []
  );

  const renderDocumentView = useCallback(
    (
      hit: DataTableRecord,
      displayedRows: DataTableRecord[],
      displayedColumns: string[],
      customColumnsMeta?: DataTableColumnsMeta
    ) => (
      <DiscoverGridFlyout
        dataView={props.dataView}
        hit={hit}
        hits={displayedRows}
        // if default columns are used, dont make them part of the URL - the context state handling will take care to restore them
        columns={displayedColumns}
        columnsMeta={customColumnsMeta}
        savedSearchId={props.savedSearchId}
        onFilter={props.onFilter}
        onRemoveColumn={props.onRemoveColumn}
        onAddColumn={props.onAddColumn}
        onClose={() => setExpandedDoc(undefined)}
        setExpandedDoc={setExpandedDocWithInitialTab}
        initialTabId={initialTabId}
        query={props.query}
        filters={props.filters}
        docViewerRef={docViewerRef}
      />
    ),
    [
      props.dataView,
      props.savedSearchId,
      props.onFilter,
      props.onRemoveColumn,
      props.onAddColumn,
      props.query,
      props.filters,
      setExpandedDocWithInitialTab,
      initialTabId,
    ]
  );

  const renderCustomToolbarWithElements = useMemo(
    () =>
      getRenderCustomToolbarWithElements({
        leftSide:
          typeof props.totalHitCount === 'number' ? (
            <TotalDocuments totalHitCount={props.totalHitCount} isEsqlMode={props.isPlainRecord} />
          ) : undefined,
      }),
    [props.totalHitCount, props.isPlainRecord]
  );

  const getCellRenderersAccessor = useProfileAccessor('getCellRenderers');
  const cellRenderers = useMemo(() => {
    const getCellRenderers = getCellRenderersAccessor(() => ({}));
    return getCellRenderers({
      actions: { addFilter: props.onFilter },
      dataView: props.dataView,
      density:
        gridProps.dataGridDensityState ?? getDataGridDensity(props.services.storage, 'discover'),
      rowHeight: getRowHeight({
        storage: props.services.storage,
        consumer: 'discover',
        rowHeightState: gridProps.rowHeightState,
        configRowHeight: props.configRowHeight,
      }),
    });
  }, [
    getCellRenderersAccessor,
    props.onFilter,
    props.dataView,
    props.services.storage,
    props.configRowHeight,
    gridProps.dataGridDensityState,
    gridProps.rowHeightState,
  ]);

  const tabSelectorOptions = useMemo(() => {
    const options = tabs.map((tab) => ({
      inputDisplay: tab.label,
      value: tab.id,
    }));

    // Add a disabled "deleted tab" entry when the saved tab is no longer found
    if (selectedTabNotFound) {
      options.unshift({
        inputDisplay: i18n.translate('discover.embeddable.search.deletedTab', {
          defaultMessage: '(Deleted tab)',
        }),
        value: DELETED_TAB_ID,
      });
    }

    return options;
  }, [tabs, selectedTabNotFound]);

  const handleTabChange = useCallback(
    (value: string) => {
      if (value !== DELETED_TAB_ID) {
        onTabChange(value);
      }
    },
    [onTabChange]
  );

  const tabSelectorValue = selectedTabNotFound ? DELETED_TAB_ID : selectedTabId ?? tabs[0]?.id;

  return (
    <SavedSearchEmbeddableBase
      totalHitCount={undefined} // it will be rendered inside the custom grid toolbar instead
      isLoading={props.loadingState === DiscoverGridLoadingState.loading}
      dataTestSubj="embeddedSavedSearchDocTable"
      interceptedWarnings={props.interceptedWarnings}
    >
      {isEditMode && selectedTabNotFound && (
        <EuiPanel hasShadow={false} paddingSize="s">
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="warning"
            size="s"
            title={i18n.translate('discover.embeddable.search.tabNotFoundTitle', {
              defaultMessage: 'The previously selected tab no longer exists',
            })}
          >
            <p>
              {i18n.translate('discover.embeddable.search.tabNotFoundDescription', {
                defaultMessage:
                  'The tab that was saved with this panel has been deleted from the Discover session. Showing the first available tab instead. Select a different tab to dismiss this warning.',
              })}
            </p>
          </EuiCallOut>
        </EuiPanel>
      )}
      {isEditMode && tabs.length > 1 && (
        <EuiPanel hasShadow={false} paddingSize="s">
          <EuiFormRow
            helpText={i18n.translate('discover.embeddable.search.tabSelectorHelp', {
              defaultMessage: 'This select determines the data that is displayed in the grid',
            })}
            label={i18n.translate('discover.embeddable.search.tabSelectorLabel', {
              defaultMessage: 'Discover session tab',
            })}
            isInvalid={selectedTabNotFound}
            error={
              selectedTabNotFound
                ? i18n.translate('discover.embeddable.search.tabSelectorError', {
                    defaultMessage: 'The saved tab was deleted. Please select a valid tab.',
                  })
                : undefined
            }
          >
            <EuiSuperSelect
              aria-label={i18n.translate('discover.embeddable.search.tabSelectorAriaLabel', {
                defaultMessage: 'Select discover tab you want to explore',
              })}
              compressed={true}
              onChange={handleTabChange}
              options={tabSelectorOptions}
              valueOfSelected={tabSelectorValue}
              isInvalid={selectedTabNotFound}
            />
          </EuiFormRow>
        </EuiPanel>
      )}
      <DiscoverGridMemoized
        {...gridProps}
        isPaginationEnabled={!gridProps.isPlainRecord}
        totalHits={props.totalHitCount}
        setExpandedDoc={setExpandedDocWithInitialTab}
        expandedDoc={expandedDoc}
        showMultiFields={props.services.uiSettings.get(SHOW_MULTIFIELDS)}
        maxDocFieldsDisplayed={props.services.uiSettings.get(MAX_DOC_FIELDS_DISPLAYED)}
        renderDocumentView={enableDocumentViewer ? renderDocumentView : undefined}
        renderCustomToolbar={renderCustomToolbarWithElements}
        externalCustomRenderers={cellRenderers}
        enableComparisonMode
        showColumnTokens
        showFullScreenButton={false}
        className="unifiedDataTable"
      />
    </SavedSearchEmbeddableBase>
  );
}
