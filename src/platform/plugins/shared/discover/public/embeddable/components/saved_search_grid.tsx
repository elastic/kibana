/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { AggregateQuery, Query, Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
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
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { DocViewerApi } from '@kbn/unified-doc-viewer';
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
  tabs: DiscoverSessionTab[];
  isSelectedTabDeleted: boolean;
  onTabChange: (tabId: string) => void;
  selectedTabId: string | undefined;
  showTabSelector: boolean;
}

export const DiscoverGridMemoized = React.memo(DiscoverGrid);

const DELETED_TAB_VALUE = '__deleted_tab__';

export function DiscoverGridEmbeddable(props: DiscoverGridEmbeddableProps) {
  const {
    tabs,
    enableDocumentViewer,
    interceptedWarnings,
    isSelectedTabDeleted,
    onTabChange,
    selectedTabId,
    showTabSelector,
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

  const handleTabChange = useCallback(
    (tabId: string) => {
      if (tabId !== DELETED_TAB_VALUE) onTabChange(tabId);
    },
    [onTabChange]
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

  const tabOptions = useMemo(() => {
    const options: Array<{ disabled?: boolean; inputDisplay: string; value: string }> = tabs.map(
      (tab) => ({ inputDisplay: tab.label, value: tab.id })
    );

    if (isSelectedTabDeleted) {
      options.unshift({
        value: DELETED_TAB_VALUE,
        inputDisplay: i18n.translate('discover.embeddable.tabSelector.deletedTabOption', {
          defaultMessage: '(Deleted tab)',
        }),
        disabled: true,
      });
    }

    return options;
  }, [tabs, isSelectedTabDeleted]);

  const gridContent = (
    <SavedSearchEmbeddableBase
      totalHitCount={undefined} // it will be rendered inside the custom grid toolbar instead
      isLoading={props.loadingState === DiscoverGridLoadingState.loading}
      dataTestSubj="embeddedSavedSearchDocTable"
      interceptedWarnings={props.interceptedWarnings}
    >
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

  if (!showTabSelector) return gridContent;

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
      <EuiFlexItem grow={false}>
        <EuiPanel paddingSize="s" hasShadow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
            {isSelectedTabDeleted && (
              <EuiFlexItem grow={false}>
                <EuiCallOut
                  announceOnMount
                  color="warning"
                  data-test-subj="discoverEmbeddableDeletedTabCallout"
                  iconType="warning"
                  size="s"
                  title={i18n.translate('discover.embeddable.tabSelector.deletedTabWarning', {
                    defaultMessage: 'The previously selected tab no longer exists',
                  })}
                >
                  <EuiText component="p" size="s">
                    {i18n.translate('discover.embeddable.search.tabNotFoundDescription', {
                      defaultMessage:
                        'The tab that was saved with this panel has been deleted from the Discover session. Showing the first available tab instead. Select a different tab to dismiss this warning.',
                    })}
                  </EuiText>
                </EuiCallOut>
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiSuperSelect
                aria-label={i18n.translate('discover.embeddable.tabSelector.ariaLabel', {
                  defaultMessage: 'Select displayed tab',
                })}
                compressed
                data-test-subj="discoverEmbeddableTabSelector"
                fullWidth
                isInvalid={isSelectedTabDeleted}
                prepend={i18n.translate('discover.embeddable.tabSelector.label', {
                  defaultMessage: 'Displayed tab',
                })}
                onChange={handleTabChange}
                options={tabOptions}
                valueOfSelected={
                  isSelectedTabDeleted ? DELETED_TAB_VALUE : selectedTabId ?? tabs[0]?.id
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>{gridContent}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
