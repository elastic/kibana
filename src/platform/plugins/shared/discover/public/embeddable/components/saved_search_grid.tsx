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
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
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
import type { DocViewerApi } from '@kbn/unified-doc-viewer';
import { DiscoverGrid } from '../../components/discover_grid';
import { DiscoverGridFlyout } from '../../components/discover_grid_flyout';
import { SavedSearchEmbeddableBase } from './saved_search_embeddable_base';
import { TotalDocuments } from '../../application/main/components/total_documents/total_documents';
import { useProfileAccessor } from '../../context_awareness';

export type ViewModeDeletedTabAction =
  | { type: 'editPanel'; onClick: () => void }
  | { type: 'contactAdmin' };

export interface InlineEditingProps {
  isActive: boolean;
  hasPendingChanges: boolean;
  onApply: () => Promise<void>;
  onCancel: () => Promise<void>;
}

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
  isEditMode: boolean;
  isSelectedTabDeleted: boolean;
  inlineEditing: InlineEditingProps;
  viewModeDeletedTabAction: ViewModeDeletedTabAction;
}

export function DiscoverGridEmbeddable(props: DiscoverGridEmbeddableProps) {
  const {
    enableDocumentViewer,
    inlineEditing,
    interceptedWarnings,
    isEditMode,
    isSelectedTabDeleted,
    viewModeDeletedTabAction,
    ...gridProps
  } = props;

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);
  const [initialTabId, setInitialTabId] = useState<string | undefined>(undefined);
  const docViewerRef = useRef<DocViewerApi>(null);
  const { euiTheme } = useEuiTheme();

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
      expandedDocSetter: NonNullable<UnifiedDataTableProps['setExpandedDoc']>,
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
        onClose={() => expandedDocSetter(undefined)}
        setExpandedDoc={expandedDocSetter}
        initialTabId={initialTabId}
        query={props.query}
        filters={props.filters}
        docViewerRef={docViewerRef}
        hideFilteringOnComputedColumns={true}
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

  const deletedTabTitle = (
    <h2>
      <FormattedMessage
        id="discover.embeddable.deletedTab.warningTitle"
        defaultMessage="The Discover session tab saved with this panel no longer exists"
      />
    </h2>
  );

  const renderCenteredDeletedPrompt = (body: React.ReactNode) => (
    <EuiFlexGroup
      alignItems="center"
      css={{ height: '100%' }}
      gutterSize="none"
      justifyContent="center"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiEmptyPrompt
          data-test-subj="discoverEmbeddableDeletedTabCallout"
          icon={<EuiIcon aria-hidden={true} color="warning" size="xxl" type="warning" />}
          title={deletedTabTitle}
          body={body}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const renderInlineEditFooter = () => (
    <div
      css={{
        paddingInline: euiTheme.size.s,
        paddingBlockEnd: euiTheme.size.s,
      }}
    >
      <EuiFlexGroup responsive={false} gutterSize="xs" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            color="primary"
            data-test-subj="discoverEmbeddableInlineEditDiscardButton"
            css={{ minInlineSize: 'initial' }}
            onClick={() => {
              void inlineEditing.onCancel();
            }}
          >
            {i18n.translate('discover.embeddable.inlineEdit.discardButton', {
              defaultMessage: 'Discard',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size={'xs' as 's'}
            color="primary"
            fill
            data-test-subj="discoverEmbeddableInlineEditApplyButton"
            css={{ minInlineSize: 'initial' }}
            onClick={() => {
              void inlineEditing.onApply();
            }}
            disabled={!inlineEditing.hasPendingChanges}
          >
            {i18n.translate('discover.embeddable.inlineEdit.applyButton', {
              defaultMessage: 'Apply',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );

  if (!isEditMode && isSelectedTabDeleted) {
    return renderCenteredDeletedPrompt(
      viewModeDeletedTabAction.type === 'editPanel' ? (
        <p>
          <FormattedMessage
            id="discover.embeddable.deletedTab.viewModeWarningDescriptionEditable"
            defaultMessage="<EditPanelLink>Edit the panel</EditPanelLink> to fix it."
            values={{
              EditPanelLink: (chunks) => (
                <EuiLink
                  data-test-subj="discoverEmbeddableDeletedTabEditPanelLink"
                  onClick={viewModeDeletedTabAction.onClick}
                >
                  {chunks}
                </EuiLink>
              ),
            }}
          />
        </p>
      ) : (
        <p>
          <FormattedMessage
            id="discover.embeddable.deletedTab.viewModeWarningDescriptionReadOnly"
            defaultMessage="Contact one of the dashboard's authors to fix it."
          />
        </p>
      )
    );
  }

  return (
    <SavedSearchEmbeddableBase
      totalHitCount={undefined}
      isLoading={props.loadingState === DiscoverGridLoadingState.loading}
      dataTestSubj="embeddedSavedSearchDocTable"
      interceptedWarnings={props.interceptedWarnings}
      append={inlineEditing.isActive ? renderInlineEditFooter() : undefined}
    >
      {isEditMode && isSelectedTabDeleted ? (
        renderCenteredDeletedPrompt(
          <p>
            {inlineEditing.isActive ? (
              <FormattedMessage
                id="discover.embeddable.deletedTab.editModeWarningDescription"
                defaultMessage="Select a different tab"
              />
            ) : (
              <FormattedMessage
                id="discover.embeddable.deletedTab.editModePreEditWarningDescription"
                defaultMessage="Use Edit {editIcon} to choose a different tab"
                values={{
                  editIcon: <EuiIcon aria-hidden={true} type="pencil" size="m" />,
                }}
              />
            )}
          </p>
        )
      ) : (
        <DiscoverGrid
          {...gridProps}
          isPaginationEnabled={!gridProps.isPlainRecord}
          totalHits={props.totalHitCount}
          setExpandedDoc={setExpandedDocWithInitialTab}
          expandedDoc={expandedDoc}
          showMultiFields={props.services.uiSettings.get(SHOW_MULTIFIELDS)}
          hideFilteringOnComputedColumns={true}
          maxDocFieldsDisplayed={props.services.uiSettings.get(MAX_DOC_FIELDS_DISPLAYED)}
          renderDocumentView={enableDocumentViewer ? renderDocumentView : undefined}
          renderCustomToolbar={renderCustomToolbarWithElements}
          externalCustomRenderers={cellRenderers}
          enableComparisonMode
          showColumnTokens
          showFullScreenButton={false}
          className="unifiedDataTable"
        />
      )}
    </SavedSearchEmbeddableBase>
  );
}
