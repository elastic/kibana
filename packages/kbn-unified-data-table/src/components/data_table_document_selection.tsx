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
  EuiDataGridCellValueElementProps,
  EuiDataGridToolbarControl,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { UnifiedDataTableContext } from '../table_context';
import { DataTableCopyRowsAsText } from './data_table_copy_rows_as_text';
import { DataTableCopyRowsAsJson } from './data_table_copy_rows_as_json';

export const SelectButton = ({ rowIndex, setCellProps }: EuiDataGridCellValueElementProps) => {
  const { euiTheme } = useEuiTheme();
  const { selectedDocs, expanded, rows, isDarkMode, setSelectedDocs } =
    useContext(UnifiedDataTableContext);
  const doc = useMemo(() => rows[rowIndex], [rows, rowIndex]);
  const checked = useMemo(() => selectedDocs.includes(doc.id), [selectedDocs, doc.id]);

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
      setCellProps({ style: undefined });
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
          checked={checked}
          data-test-subj={`dscGridSelectDoc-${doc.id}`}
          onChange={() => {
            if (checked) {
              const newSelection = selectedDocs.filter((docId) => docId !== doc.id);
              setSelectedDocs(newSelection);
            } else {
              setSelectedDocs([...selectedDocs, doc.id]);
            }
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export function DataTableDocumentToolbarBtn({
  isPlainRecord,
  isFilterActive,
  selectedDocs,
  setIsFilterActive,
  setSelectedDocs,
  toastNotifications,
  columns,
}: {
  isPlainRecord: boolean;
  isFilterActive: boolean;
  selectedDocs: string[];
  setIsFilterActive: (value: boolean) => void;
  setSelectedDocs: (value: string[]) => void;
  toastNotifications: ToastsStart;
  columns: string[];
}) {
  const [isSelectionPopoverOpen, setIsSelectionPopoverOpen] = useState(false);

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
      <DataTableCopyRowsAsText
        key="copyRowsAsText"
        toastNotifications={toastNotifications}
        columns={columns}
      />,
      <DataTableCopyRowsAsJson key="copyRowsAsJson" toastNotifications={toastNotifications} />,
      <EuiContextMenuItem
        data-test-subj="dscGridClearSelectedDocuments"
        key="clearSelection"
        icon="cross"
        onClick={() => {
          setIsSelectionPopoverOpen(false);
          setSelectedDocs([]);
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
    setSelectedDocs,
    toastNotifications,
    columns,
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
          data-selected-documents={selectedDocs.length}
          data-test-subj="unifiedDataTableSelectionBtn"
          isSelected={isFilterActive}
          badgeContent={selectedDocs.length}
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

export const DataTableCompareToolbarBtn = ({
  selectedDocs,
  setIsCompareActive,
}: {
  selectedDocs: string[];
  setIsCompareActive: (value: boolean) => void;
}) => {
  return (
    <EuiDataGridToolbarControl
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
};
