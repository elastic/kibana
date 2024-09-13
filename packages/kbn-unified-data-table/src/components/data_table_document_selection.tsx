/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useContext, useMemo, useState } from 'react';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import {
  EuiCheckbox,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDataGridCellValueElementProps,
  EuiDataGridToolbarControl,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { UseSelectedDocsState } from '../hooks/use_selected_docs';
import { UnifiedDataTableContext } from '../table_context';
import { DataTableCopyRowsAsText } from './data_table_copy_rows_as_text';
import { DataTableCopyRowsAsJson } from './data_table_copy_rows_as_json';
import { useControlColumn } from '../hooks/use_control_column';

export const SelectButton = (props: EuiDataGridCellValueElementProps) => {
  const { record, rowIndex } = useControlColumn(props);
  const { euiTheme } = useEuiTheme();
  const { selectedDocsState } = useContext(UnifiedDataTableContext);
  const { isDocSelected, toggleDocSelection } = selectedDocsState;

  const toggleDocumentSelectionLabel = i18n.translate('unifiedDataTable.grid.selectDoc', {
    defaultMessage: `Select document ''{rowNumber}''`,
    values: { rowNumber: rowIndex + 1 },
  });

  return (
    <EuiFlexGroup
      responsive={false}
      direction="column"
      justifyContent="center"
      className="unifiedDataTable__rowControl"
      css={css`
        padding-block: ${euiTheme.size.xs}; // to have the same height as "openDetails" control
        padding-left: ${euiTheme.size.xs}; // space between controls
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiCheckbox
          id={record.id}
          aria-label={toggleDocumentSelectionLabel}
          checked={isDocSelected(record.id)}
          data-test-subj={`dscGridSelectDoc-${record.id}`}
          onChange={() => {
            toggleDocSelection(record.id);
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const SelectAllButton = () => {
  const { selectedDocsState, pageIndex, pageSize, rows } = useContext(UnifiedDataTableContext);
  const { getCountOfFilteredSelectedDocs, deselectSomeDocs, selectMoreDocs } = selectedDocsState;

  const docIdsFromCurrentPage = useMemo(() => {
    return getDocIdsForCurrentPage(rows, pageIndex, pageSize);
  }, [rows, pageIndex, pageSize]);

  const countOfSelectedDocs = useMemo(() => {
    return docIdsFromCurrentPage?.length
      ? getCountOfFilteredSelectedDocs(docIdsFromCurrentPage)
      : 0;
  }, [docIdsFromCurrentPage, getCountOfFilteredSelectedDocs]);

  const isIndeterminateForCurrentPage = useMemo(() => {
    if (docIdsFromCurrentPage?.length) {
      return countOfSelectedDocs > 0 && countOfSelectedDocs < docIdsFromCurrentPage.length;
    }
    return false;
  }, [docIdsFromCurrentPage, countOfSelectedDocs]);

  const areDocsSelectedForCurrentPage = useMemo(() => {
    if (docIdsFromCurrentPage?.length) {
      return countOfSelectedDocs > 0;
    }
    return false;
  }, [docIdsFromCurrentPage, countOfSelectedDocs]);

  if (!docIdsFromCurrentPage) {
    return null;
  }

  const title =
    isIndeterminateForCurrentPage || areDocsSelectedForCurrentPage
      ? i18n.translate('unifiedDataTable.deselectAllRowsOnPageColumnHeader', {
          defaultMessage: 'Deselect all visible rows',
        })
      : i18n.translate('unifiedDataTable.selectAllRowsOnPageColumnHeader', {
          defaultMessage: 'Select all visible rows',
        });

  return (
    <>
      <EuiScreenReaderOnly>
        <span>
          {i18n.translate('unifiedDataTable.selectColumnHeader', {
            defaultMessage: 'Select column',
          })}
        </span>
      </EuiScreenReaderOnly>
      <EuiCheckbox
        data-test-subj="selectAllDocsOnPageToggle"
        id="select-all-docs-on-page-toggle"
        aria-label={title}
        title={title}
        indeterminate={isIndeterminateForCurrentPage}
        checked={areDocsSelectedForCurrentPage}
        onChange={(e) => {
          const shouldClearSelection = isIndeterminateForCurrentPage || !e.target.checked;

          if (shouldClearSelection) {
            deselectSomeDocs(docIdsFromCurrentPage);
          } else {
            selectMoreDocs(docIdsFromCurrentPage);
          }
        }}
      />
    </>
  );
};

export function DataTableDocumentToolbarBtn({
  isPlainRecord,
  isFilterActive,
  rows,
  setIsFilterActive,
  selectedDocsState,
  enableComparisonMode,
  setIsCompareActive,
  fieldFormats,
  pageIndex,
  pageSize,
  toastNotifications,
  columns,
}: {
  isPlainRecord: boolean;
  isFilterActive: boolean;
  rows: DataTableRecord[];
  setIsFilterActive: (value: boolean) => void;
  selectedDocsState: UseSelectedDocsState;
  enableComparisonMode: boolean | undefined;
  setIsCompareActive: (value: boolean) => void;
  fieldFormats: FieldFormatsStart;
  pageIndex: number | undefined;
  pageSize: number | undefined;
  toastNotifications: ToastsStart;
  columns: string[];
}) {
  const [isSelectionPopoverOpen, setIsSelectionPopoverOpen] = useState(false);
  const { selectAllDocs, clearAllSelectedDocs, selectedDocsCount, docIdsInSelectionOrder } =
    selectedDocsState;

  const closePopover = useCallback(() => {
    setIsSelectionPopoverOpen(false);
  }, [setIsSelectionPopoverOpen]);

  const shouldSuggestToSelectAll = useMemo(() => {
    const canSelectMore = selectedDocsCount < rows.length && rows.length > 1;
    if (typeof pageSize !== 'number' || isFilterActive || !canSelectMore) {
      return false;
    }
    return selectedDocsCount >= pageSize;
  }, [rows, pageSize, selectedDocsCount, isFilterActive]);

  const getMenuItems = useCallback(() => {
    return [
      // Compare selected documents
      ...(enableComparisonMode && selectedDocsCount > 1
        ? [
            <DataTableCompareToolbarBtn
              key="compareSelected"
              selectedDocIds={docIdsInSelectionOrder}
              setIsCompareActive={setIsCompareActive}
            />,
          ]
        : []),
      // Copy results to clipboard as text
      <DataTableCopyRowsAsText
        key="copyRowsAsText"
        toastNotifications={toastNotifications}
        columns={columns}
        onCompleted={closePopover}
      />,
      // Copy results to clipboard as JSON
      <DataTableCopyRowsAsJson
        key="copyRowsAsJson"
        toastNotifications={toastNotifications}
        onCompleted={closePopover}
      />,
      isFilterActive ? (
        // Show all documents
        <EuiContextMenuItem
          data-test-subj="dscGridShowAllDocuments"
          key="showAllDocuments"
          icon="eye"
          onClick={() => {
            closePopover();
            setIsFilterActive(false);
          }}
        >
          {isPlainRecord ? (
            <FormattedMessage
              id="unifiedDataTable.showAllResults"
              defaultMessage="Show all results"
            />
          ) : (
            <FormattedMessage
              id="unifiedDataTable.showAllDocuments"
              defaultMessage="Show all documents"
            />
          )}
        </EuiContextMenuItem>
      ) : (
        // Show selected documents only
        <EuiContextMenuItem
          data-test-subj="dscGridShowSelectedDocuments"
          key="showSelectedDocuments"
          icon="eye"
          onClick={() => {
            closePopover();
            setIsFilterActive(true);
          }}
        >
          {isPlainRecord ? (
            <FormattedMessage
              id="unifiedDataTable.showSelectedResultsOnly"
              defaultMessage="Show selected results only"
            />
          ) : (
            <FormattedMessage
              id="unifiedDataTable.showSelectedDocumentsOnly"
              defaultMessage="Show selected documents only"
            />
          )}
        </EuiContextMenuItem>
      ),
      // Clear selection
      <EuiContextMenuItem
        data-test-subj="dscGridClearSelectedDocuments"
        key="clearSelection"
        icon="cross"
        onClick={() => {
          closePopover();
          clearAllSelectedDocs();
          setIsFilterActive(false);
        }}
      >
        <FormattedMessage id="unifiedDataTable.clearSelection" defaultMessage="Clear selection" />
      </EuiContextMenuItem>,
    ];
  }, [
    isFilterActive,
    isPlainRecord,
    setIsFilterActive,
    clearAllSelectedDocs,
    selectedDocsCount,
    docIdsInSelectionOrder,
    enableComparisonMode,
    setIsCompareActive,
    toastNotifications,
    columns,
    closePopover,
  ]);

  const toggleSelectionToolbar = useCallback(
    () => setIsSelectionPopoverOpen((prevIsOpen) => !prevIsOpen),
    []
  );

  const selectedRowsMenuButton = (
    <EuiPopover
      closePopover={() => setIsSelectionPopoverOpen(false)}
      isOpen={isSelectionPopoverOpen}
      panelPaddingSize="none"
      button={
        <EuiDataGridToolbarControl
          iconSide="left"
          iconType="arrowDown"
          onClick={toggleSelectionToolbar}
          data-selected-documents={selectedDocsCount}
          data-test-subj="unifiedDataTableSelectionBtn"
          isSelected={isFilterActive}
          badgeContent={fieldFormats
            .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
            .convert(selectedDocsCount)}
          css={css`
            .euiButtonEmpty__content {
              flex-direction: row-reverse;
            }
          `}
        >
          {isPlainRecord ? (
            <FormattedMessage
              id="unifiedDataTable.selectedResultsButtonLabel"
              defaultMessage="Selected"
              description="Selected results"
            />
          ) : (
            <FormattedMessage
              id="unifiedDataTable.selectedRowsButtonLabel"
              defaultMessage="Selected"
              description="Selected documents"
            />
          )}
        </EuiDataGridToolbarControl>
      }
    >
      {isSelectionPopoverOpen && (
        <EuiContextMenuPanel
          items={getMenuItems()}
          data-test-subj="unifiedDataTableSelectionMenu"
        />
      )}
    </EuiPopover>
  );

  return (
    <EuiFlexGroup
      responsive={false}
      gutterSize="none"
      wrap={false}
      className="unifiedDataTableToolbarControlGroup"
    >
      <EuiFlexItem className="unifiedDataTableToolbarControlButton" grow={false}>
        {selectedRowsMenuButton}
      </EuiFlexItem>
      {shouldSuggestToSelectAll ? (
        <EuiFlexItem className="unifiedDataTableToolbarControlButton" grow={false}>
          <EuiDataGridToolbarControl
            data-test-subj="dscGridSelectAllDocs"
            onClick={() => {
              setIsSelectionPopoverOpen(false);
              selectAllDocs();
            }}
          >
            <FormattedMessage
              id="unifiedDataTable.selectAllDocs"
              defaultMessage="Select all {rowsCount}"
              values={{
                rowsCount: fieldFormats
                  .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
                  .convert(rows.length),
              }}
            />
          </EuiDataGridToolbarControl>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}

const MAX_SELECTED_DOCS_FOR_COMPARE = 100;

export const DataTableCompareToolbarBtn = ({
  selectedDocIds,
  setIsCompareActive,
}: {
  selectedDocIds: string[];
  setIsCompareActive: (value: boolean) => void;
}) => {
  const isDisabled = selectedDocIds.length > MAX_SELECTED_DOCS_FOR_COMPARE;
  const label = (
    <FormattedMessage
      id="unifiedDataTable.compareSelectedRowsButtonLabel"
      defaultMessage="Compare selected"
    />
  );
  return (
    <EuiContextMenuItem
      data-test-subj="unifiedDataTableCompareSelectedDocuments"
      disabled={isDisabled}
      icon="diff"
      onClick={() => {
        setIsCompareActive(true);
      }}
    >
      {isDisabled ? (
        <EuiToolTip
          content={i18n.translate('unifiedDataTable.compareSelectedRowsButtonDisabledTooltip', {
            defaultMessage: 'Comparison is limited to {limit} rows',
            values: { limit: MAX_SELECTED_DOCS_FOR_COMPARE },
          })}
        >
          {label}
        </EuiToolTip>
      ) : (
        label
      )}
    </EuiContextMenuItem>
  );
};

function getDocIdsForCurrentPage(
  rows: DataTableRecord[],
  pageIndex: number | undefined,
  pageSize: number | undefined
): string[] | undefined {
  if (typeof pageIndex === 'number' && typeof pageSize === 'number') {
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    return rows.slice(start, end).map((row) => row.id);
  }
  return undefined; // pagination is disabled
}
