/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useState, useContext, useMemo, useEffect } from 'react';
import classNames from 'classnames';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiPopover,
  EuiCheckbox,
  EuiDataGridCellValueElementProps,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiLightVars as themeLight, euiDarkVars as themeDark } from '@kbn/ui-theme';
import { DiscoverGridContext } from './discover_grid_context';
import { ElasticSearchHit } from '../../types';

/**
 * Returning a generated id of a given ES document, since `_id` can be the same
 * when using different indices and shard routing
 */
export const getDocId = (doc: ElasticSearchHit & { _routing?: string }) => {
  const routing = doc._routing ? doc._routing : '';
  return [doc._index, doc._id, routing].join('::');
};
export const SelectButton = ({ rowIndex, setCellProps }: EuiDataGridCellValueElementProps) => {
  const { selectedDocs, expanded, rows, isDarkMode, setSelectedDocs } =
    useContext(DiscoverGridContext);
  const doc = useMemo(() => rows[rowIndex], [rows, rowIndex]);
  const id = useMemo(() => getDocId(doc), [doc]);
  const checked = useMemo(() => selectedDocs.includes(id), [selectedDocs, id]);

  useEffect(() => {
    if (expanded && doc && expanded._id === doc._id) {
      setCellProps({
        style: {
          backgroundColor: isDarkMode ? themeDark.euiColorHighlight : themeLight.euiColorHighlight,
        },
      });
    } else {
      setCellProps({ style: undefined });
    }
  }, [expanded, doc, setCellProps, isDarkMode]);

  return (
    <EuiCheckbox
      id={id}
      label=""
      checked={checked}
      data-test-subj={`dscGridSelectDoc-${id}`}
      onChange={() => {
        if (checked) {
          const newSelection = selectedDocs.filter((docId) => docId !== id);
          setSelectedDocs(newSelection);
        } else {
          setSelectedDocs([...selectedDocs, id]);
        }
      }}
    />
  );
};

export function DiscoverGridDocumentToolbarBtn({
  isFilterActive,
  rows,
  selectedDocs,
  setIsFilterActive,
  setSelectedDocs,
}: {
  isFilterActive: boolean;
  rows: ElasticSearchHit[];
  selectedDocs: string[];
  setIsFilterActive: (value: boolean) => void;
  setSelectedDocs: (value: string[]) => void;
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
          <FormattedMessage id="discover.showAllDocuments" defaultMessage="Show all documents" />
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
          <FormattedMessage
            id="discover.showSelectedDocumentsOnly"
            defaultMessage="Show selected documents only"
          />
        </EuiContextMenuItem>
      ),
      <EuiCopy
        key="copyJsonWrapper"
        data-test-subj="dscGridCopySelectedDocumentsJSON"
        textToCopy={
          rows ? JSON.stringify(rows.filter((row) => selectedDocs.includes(getDocId(row)))) : ''
        }
      >
        {(copy) => (
          <EuiContextMenuItem key="copyJSON" icon="copyClipboard" onClick={copy}>
            <FormattedMessage
              id="discover.copyToClipboardJSON"
              defaultMessage="Copy documents to clipboard (JSON)"
            />
          </EuiContextMenuItem>
        )}
      </EuiCopy>,
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
        <FormattedMessage id="discover.clearSelection" defaultMessage="Clear selection" />
      </EuiContextMenuItem>,
    ];
  }, [
    isFilterActive,
    rows,
    selectedDocs,
    setIsFilterActive,
    setIsSelectionPopoverOpen,
    setSelectedDocs,
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
        <EuiButtonEmpty
          size="xs"
          color="text"
          iconType="documents"
          onClick={toggleSelectionToolbar}
          data-selected-documents={selectedDocs.length}
          data-test-subj="dscGridSelectionBtn"
          isSelected={isFilterActive}
          className={classNames({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            euiDataGrid__controlBtn: true,
            'euiDataGrid__controlBtn--active': isFilterActive,
          })}
        >
          <FormattedMessage
            id="discover.selectedDocumentsNumber"
            defaultMessage="{nr} documents selected"
            values={{ nr: selectedDocs.length }}
          />
        </EuiButtonEmpty>
      }
    >
      {isSelectionPopoverOpen && <EuiContextMenuPanel items={getMenuItems()} />}
    </EuiPopover>
  );
}
