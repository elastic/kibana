/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  EuiCheckbox,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
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
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { UseSelectedDocsState } from '../hooks/use_selected_docs';
import { UnifiedDataTableContext } from '../table_context';

export const SelectButton = ({ rowIndex, setCellProps }: EuiDataGridCellValueElementProps) => {
  const { euiTheme } = useEuiTheme();
  const { selectedDocsState, expanded, rows, isDarkMode } = useContext(UnifiedDataTableContext);
  const { isDocSelected, toggleDocSelection } = selectedDocsState;
  const doc = useMemo(() => rows[rowIndex], [rows, rowIndex]);

  const toggleDocumentSelectionLabel = i18n.translate('unifiedDataTable.grid.selectDoc', {
    defaultMessage: `Select document ''{rowNumber}''`,
    values: { rowNumber: rowIndex + 1 },
  });

  useEffect(() => {
    if (expanded && doc && expanded.id === doc.id) {
      setCellProps({
        className: 'unifiedDataTable__cell--selected',
      });
    } else {
      setCellProps({ className: '' });
    }
  }, [expanded, doc, setCellProps, isDarkMode]);

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
          id={doc.id}
          aria-label={toggleDocumentSelectionLabel}
          checked={isDocSelected(doc.id)}
          data-test-subj={`dscGridSelectDoc-${doc.id}`}
          onChange={() => {
            toggleDocSelection(doc.id);
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const SelectAllButton = () => {
  const { selectedDocsState, pageIndex, pageSize, rows } = useContext(UnifiedDataTableContext);
  const { getCountOfSelectedDocs, deselectSomeDocs, selectMoreDocs } = selectedDocsState;

  const docIdsFromCurrentPage = useMemo(() => {
    if (typeof pageIndex === 'number' && typeof pageSize === 'number') {
      const start = pageIndex * pageSize;
      const end = start + pageSize;
      return rows.slice(start, end).map((row) => row.id);
    }
    return undefined; // pagination is disabled
  }, [rows, pageIndex, pageSize]);

  const countOfSelectedDocs = useMemo(() => {
    return docIdsFromCurrentPage?.length ? getCountOfSelectedDocs(docIdsFromCurrentPage) : 0;
  }, [docIdsFromCurrentPage, getCountOfSelectedDocs]);

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
          defaultMessage: 'Deselect all rows on the page',
        })
      : i18n.translate('unifiedDataTable.selectAllRowsOnPageColumnHeader', {
          defaultMessage: 'Select all rows on the page',
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
}: {
  isPlainRecord: boolean;
  isFilterActive: boolean;
  rows: DataTableRecord[];
  setIsFilterActive: (value: boolean) => void;
  selectedDocsState: UseSelectedDocsState;
}) {
  const [isSelectionPopoverOpen, setIsSelectionPopoverOpen] = useState(false);
  const { selectAllDocs, clearAllSelectedDocs, isDocSelected, usedSelectedDocs } =
    selectedDocsState;

  const getMenuItems = useCallback(() => {
    return [
      isFilterActive ? (
        <EuiContextMenuItem
          data-test-subj="dscGridShowAllDocuments"
          key="showAllDocuments"
          icon="eye"
          onClick={() => {
            setIsSelectionPopoverOpen(false);
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
        <EuiContextMenuItem
          data-test-subj="dscGridShowSelectedDocuments"
          key="showSelectedDocuments"
          icon="eye"
          onClick={() => {
            setIsSelectionPopoverOpen(false);
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
      <EuiCopy
        key="copyJsonWrapper"
        data-test-subj="dscGridCopySelectedDocumentsJSON"
        textToCopy={
          rows
            ? JSON.stringify(rows.filter((row) => isDocSelected(row.id)).map((row) => row.raw))
            : ''
        }
      >
        {(copy) => (
          <EuiContextMenuItem key="copyJSON" icon="copyClipboard" onClick={copy}>
            {isPlainRecord ? (
              <FormattedMessage
                id="unifiedDataTable.copyResultsToClipboardJSON"
                defaultMessage="Copy results to clipboard (JSON)"
              />
            ) : (
              <FormattedMessage
                id="unifiedDataTable.copyToClipboardJSON"
                defaultMessage="Copy documents to clipboard (JSON)"
              />
            )}
          </EuiContextMenuItem>
        )}
      </EuiCopy>,
      ...(!isFilterActive && usedSelectedDocs.length < rows.length && rows.length > 1
        ? [
            <EuiContextMenuItem
              data-test-subj="dscGridSelectAllDocs"
              key="selectRowsOnAllPages"
              icon="check"
              onClick={() => {
                setIsSelectionPopoverOpen(false);
                selectAllDocs();
              }}
            >
              <FormattedMessage
                id="unifiedDataTable.selectAllDocs"
                defaultMessage="Select all {rowsCount} rows"
                values={{
                  rowsCount: rows.length,
                }}
              />
            </EuiContextMenuItem>,
          ]
        : []),
      <EuiContextMenuItem
        data-test-subj="dscGridClearSelectedDocuments"
        key="clearSelection"
        icon="cross"
        onClick={() => {
          setIsSelectionPopoverOpen(false);
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
    rows,
    setIsFilterActive,
    isDocSelected,
    clearAllSelectedDocs,
    selectAllDocs,
    usedSelectedDocs,
  ]);

  const toggleSelectionToolbar = useCallback(
    () => setIsSelectionPopoverOpen((prevIsOpen) => !prevIsOpen),
    []
  );

  return (
    <EuiPopover
      closePopover={() => setIsSelectionPopoverOpen(false)}
      isOpen={isSelectionPopoverOpen}
      panelPaddingSize="none"
      button={
        <EuiDataGridToolbarControl
          iconType="documents"
          onClick={toggleSelectionToolbar}
          data-selected-documents={usedSelectedDocs.length}
          data-test-subj="unifiedDataTableSelectionBtn"
          isSelected={isFilterActive}
          badgeContent={usedSelectedDocs.length}
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
}

const MAX_SELECTED_DOCS_FOR_COMPARE = 100;

export const DataTableCompareToolbarBtn = ({
  selectedDocs,
  setIsCompareActive,
}: {
  selectedDocs: string[];
  setIsCompareActive: (value: boolean) => void;
}) => {
  const isDisabled = selectedDocs.length > MAX_SELECTED_DOCS_FOR_COMPARE;
  const button = (
    <EuiDataGridToolbarControl
      disabled={isDisabled}
      iconType="diff"
      badgeContent={selectedDocs.length}
      data-test-subj="unifiedDataTableCompareSelectedDocuments"
      onClick={() => {
        setIsCompareActive(true);
      }}
    >
      <FormattedMessage
        id="unifiedDataTable.compareSelectedRowsButtonLabel"
        defaultMessage="Compare"
      />
    </EuiDataGridToolbarControl>
  );

  if (isDisabled) {
    return (
      <EuiToolTip
        content={i18n.translate('unifiedDataTable.compareSelectedRowsButtonDisabledTooltip', {
          defaultMessage: 'Select not more than {limit} rows to compare',
          values: { limit: MAX_SELECTED_DOCS_FOR_COMPARE },
        })}
      >
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
