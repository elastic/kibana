/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FieldName } from '@kbn/unified-doc-viewer';
import { FieldDescription, getFieldSearchMatchingHighlight } from '@kbn/field-utils';
import { TableFieldValue } from './table_cell_value';
import type { TableRow } from './table_cell_actions';
import { getUnifiedDocViewerServices } from '../../plugin';

interface TableCellProps {
  searchTerm: string;
  rows: TableRow[];
  rowIndex: number;
  columnId: string;
  isDetails: boolean;
}

export const TableCell: React.FC<TableCellProps> = React.memo(
  ({ searchTerm, rows, rowIndex, columnId, isDetails }) => {
    const { fieldsMetadata } = getUnifiedDocViewerServices();

    const row = rows[rowIndex];

    if (!row) {
      return null;
    }

    const {
      action: { flattenedField },
      field: { field, fieldMapping, fieldType, scripted, pinned },
      value: { formattedValue, ignored },
    } = row;

    if (columnId === 'name') {
      return (
        <div>
          <FieldName
            fieldName={field}
            fieldType={fieldType}
            fieldMapping={fieldMapping}
            scripted={scripted}
            highlight={getFieldSearchMatchingHighlight(
              fieldMapping?.displayName ?? field,
              searchTerm
            )}
            isPinned={pinned}
          />

          {isDetails && !!fieldMapping ? (
            <div>
              <FieldDescription
                fieldsMetadataService={fieldsMetadata}
                field={fieldMapping}
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
          field={field}
          formattedValue={formattedValue}
          rawValue={flattenedField}
          ignoreReason={ignored}
          isDetails={isDetails}
        />
      );
    }

    return null;
  }
);
