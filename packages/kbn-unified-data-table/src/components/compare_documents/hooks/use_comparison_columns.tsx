/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiDataGridColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiListGroupItemProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useMemo } from 'react';

export interface UseComparisonColumnsProps {
  wrapper: HTMLElement | null;
  isPlainRecord: boolean;
  fieldColumnId: string;
  selectedDocs: string[];
  setSelectedDocs: (selectedDocs: string[]) => void;
}

export const DEFAULT_COLUMN_WIDTH = 300;
export const FIELD_COLUMN_WIDTH = 200;
export const FIELD_COLUMN_NAME = i18n.translate('unifiedDataTable.fieldColumnTitle', {
  defaultMessage: 'Field',
});

export const useComparisonColumns = ({
  wrapper,
  isPlainRecord,
  fieldColumnId,
  selectedDocs,
  setSelectedDocs,
}: UseComparisonColumnsProps) => {
  const comparisonColumns = useMemo<EuiDataGridColumn[]>(() => {
    const fieldsColumn: EuiDataGridColumn = {
      id: fieldColumnId,
      displayAsText: FIELD_COLUMN_NAME,
      initialWidth: FIELD_COLUMN_WIDTH,
      isSortable: false,
      isExpandable: false,
      actions: false,
    };

    const currentColumns = [fieldsColumn];
    const wrapperWidth = wrapper?.offsetWidth ?? 0;
    const columnWidth =
      DEFAULT_COLUMN_WIDTH * selectedDocs.length + FIELD_COLUMN_WIDTH > wrapperWidth
        ? DEFAULT_COLUMN_WIDTH
        : undefined;

    selectedDocs.forEach((docId, docIndex) => {
      const additional: EuiListGroupItemProps[] = [];

      if (docIndex !== 0) {
        additional.push({
          iconType: 'pin',
          label: i18n.translate('unifiedDataTable.pinForComparison', {
            defaultMessage: 'Pin for comparison',
          }),
          size: 'xs',
          onClick: () => {
            const newSelectedDocs = [...selectedDocs];
            const index = newSelectedDocs.indexOf(docId);
            const [baseDocId] = newSelectedDocs;

            newSelectedDocs[0] = docId;
            newSelectedDocs[index] = baseDocId;

            setSelectedDocs(newSelectedDocs);
          },
        });
      }

      if (selectedDocs.length > 2) {
        additional.push({
          iconType: 'cross',
          label: i18n.translate('unifiedDataTable.removeFromComparison', {
            defaultMessage: 'Remove from comparison',
          }),
          size: 'xs',
          onClick: () => {
            setSelectedDocs(selectedDocs.filter((id) => id !== docId));
          },
        });
      }

      const columnDisplay = isPlainRecord
        ? i18n.translate('unifiedDataTable.comparisonColumnResultDisplay', {
            defaultMessage: 'Result {resultNumber}',
            values: { resultNumber: Number(docId || 0) + 1 },
          })
        : docId;

      currentColumns.push({
        id: docId,
        display:
          docIndex === 0 ? (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="pinFilled" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{columnDisplay}</EuiFlexItem>
            </EuiFlexGroup>
          ) : undefined,
        displayAsText: columnDisplay,
        initialWidth: columnWidth,
        isSortable: false,
        isExpandable: false,
        actions: {
          showHide: false,
          showMoveLeft: docIndex > 1,
          showMoveRight: docIndex > 0 && docIndex < selectedDocs.length - 1,
          showSortAsc: false,
          showSortDesc: false,
          additional,
        },
      });
    });

    return currentColumns;
  }, [fieldColumnId, isPlainRecord, selectedDocs, setSelectedDocs, wrapper?.offsetWidth]);

  return comparisonColumns;
};
