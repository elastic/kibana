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
import type { FieldRow } from './field_row';
import { getUnifiedDocViewerServices } from '../../plugin';

interface TableCellProps {
  searchTerm: string;
  rows: FieldRow[];
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

    const { flattenedValue, name, dataViewField, ignoredReason, fieldType } = row;
    const displayName = dataViewField?.displayName ?? name;

    if (columnId === 'name') {
      return (
        <div>
          <FieldName
            fieldName={displayName}
            fieldType={fieldType}
            fieldMapping={dataViewField}
            scripted={dataViewField?.scripted}
            highlight={getFieldSearchMatchingHighlight(displayName, searchTerm)}
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
        />
      );
    }

    return null;
  }
);
