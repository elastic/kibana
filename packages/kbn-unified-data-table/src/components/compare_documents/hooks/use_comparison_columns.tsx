/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiDataGridColumn, EuiListGroupItemProps } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';

export interface UseComparisonColumnsProps {
  fieldColumnId: string;
  selectedDocs: string[];
  getDocById: (docId: string) => DataTableRecord | undefined;
  setSelectedDocs: (selectedDocs: string[]) => void;
}

const fieldColumnName = i18n.translate('unifiedDataTable.fieldColumnTitle', {
  defaultMessage: 'Field',
});

export const useComparisonColumns = ({
  fieldColumnId,
  selectedDocs,
  getDocById,
  setSelectedDocs,
}: UseComparisonColumnsProps) => {
  const comparisonColumns: EuiDataGridColumn[] = useMemo(() => {
    const fieldsColumn: EuiDataGridColumn = {
      id: fieldColumnId,
      displayAsText: fieldColumnName,
      isSortable: false,
      actions: false,
      initialWidth: 200,
      isExpandable: false,
    };

    const currentColumns = [fieldsColumn];

    selectedDocs.forEach((docId, docIndex) => {
      const doc = getDocById(docId);

      if (!doc) {
        return;
      }

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

      currentColumns.push({
        id: docId,
        displayAsText: doc.raw._id,
        isSortable: false,
        isExpandable: false,
        actions: {
          showHide: false,
          showMoveLeft: false,
          showMoveRight: false,
          showSortAsc: false,
          showSortDesc: false,
          additional,
        },
      });
    });

    return currentColumns;
  }, [fieldColumnId, getDocById, selectedDocs, setSelectedDocs]);

  return comparisonColumns;
};
