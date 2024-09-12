/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { FieldName } from '@kbn/unified-doc-viewer';
import { FieldDescription, getFieldSearchMatchingHighlight } from '@kbn/field-utils';
import { TableFieldValue } from './table_cell_value';
import type { FieldRow } from './field_row';
import type { UseTableFiltersReturn } from './table_filters';
import { getUnifiedDocViewerServices } from '../../plugin';

interface TableCellProps {
  searchTerm: string;
  rows: FieldRow[];
  rowIndex: number;
  columnId: string;
  isDetails: boolean;
  onFindSearchTermMatch?: UseTableFiltersReturn['onFindSearchTermMatch'];
}

export const TableCell: React.FC<TableCellProps> = React.memo(
  ({ searchTerm, rows, rowIndex, columnId, isDetails, onFindSearchTermMatch }) => {
    const { fieldsMetadata } = getUnifiedDocViewerServices();

    const row = rows[rowIndex];

    const searchTermMatch = useMemo(() => {
      if (row && onFindSearchTermMatch && searchTerm?.trim()) {
        return onFindSearchTermMatch(row, searchTerm);
      }
      return null;
    }, [onFindSearchTermMatch, row, searchTerm]);

    const nameHighlight = useMemo(
      () =>
        row && searchTermMatch === 'name'
          ? getFieldSearchMatchingHighlight(row.dataViewField?.displayName || row.name, searchTerm)
          : undefined,
      [searchTerm, searchTermMatch, row]
    );

    if (!row) {
      return null;
    }

    const { flattenedValue, name, dataViewField, ignoredReason, fieldType } = row;

    if (columnId === 'name') {
      return (
        <div>
          <FieldName
            fieldName={name}
            fieldType={fieldType}
            fieldMapping={dataViewField}
            scripted={dataViewField?.scripted}
            highlight={nameHighlight}
          />

          {isDetails && !!dataViewField ? (
            <div>
              <FieldDescription
                fieldsMetadataService={fieldsMetadata}
                field={dataViewField}
                truncate={false}
              />
            </div>
          ) : null}
        </div>
      );
    }

    if (columnId === 'value') {
      return (
        <TableFieldValue
          field={name}
          formattedValue={row.formattedAsHtml ?? ''}
          rawValue={flattenedValue}
          ignoreReason={ignoredReason}
          isDetails={isDetails}
          isHighLighted={searchTermMatch === 'value'}
        />
      );
    }

    return null;
  }
);
