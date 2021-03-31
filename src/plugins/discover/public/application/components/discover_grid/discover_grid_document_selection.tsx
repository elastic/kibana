/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiCopy,
  EuiPopover,
  EuiButtonEmpty,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import classNames from 'classnames';
import { getDocId } from './discover_grid_columns';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';

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

      <EuiContextMenuItem
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
      <EuiCopy
        key="copyJsonWrapper"
        textToCopy={
          !rows ? '' : JSON.stringify(rows.filter((row) => selectedDocs.includes(getDocId(row))))
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
    ];
  }, [
    isFilterActive,
    rows,
    selectedDocs,
    setIsFilterActive,
    setIsSelectionPopoverOpen,
    setSelectedDocs,
  ]);

  return (
    <EuiPopover
      closePopover={() => setIsSelectionPopoverOpen(false)}
      isOpen={isSelectionPopoverOpen}
      button={
        <EuiButtonEmpty
          size="xs"
          color="text"
          iconType="documents"
          onClick={() => setIsSelectionPopoverOpen(true)}
          data-selected-documents={selectedDocs.length}
          data-test-subj="dscGridSelectionBtn"
          isSelected={isFilterActive}
          className={classNames({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            euiDataGrid__controlBtn: true,
            // eslint-disable-next-line @typescript-eslint/naming-convention
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
      <EuiContextMenuPanel items={getMenuItems()} />
    </EuiPopover>
  );
}
