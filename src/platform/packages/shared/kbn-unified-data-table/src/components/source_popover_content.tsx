/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils/src/types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import JsonCodeEditor from './json_code_editor/json_code_editor';
import { defaultMonacoEditorWidth } from '../constants';
import { getInnerColumns } from '../utils/columns';

export const SourcePopoverContent = ({
  closeButton,
  columnId,
  row,
  useTopLevelObjectColumns,
  dataTestSubj = 'dataTableExpandCellActionJsonPopover',
}: {
  closeButton: JSX.Element;
  columnId: string;
  row: DataTableRecord;
  useTopLevelObjectColumns: boolean;
  dataTestSubj?: string;
}) => {
  return (
    <EuiFlexGroup
      gutterSize="none"
      direction="column"
      justifyContent="flexEnd"
      className="unifiedDataTable__cellPopover"
      data-test-subj={dataTestSubj}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>{closeButton}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <JsonCodeEditor
          json={getJSON(columnId, row, useTopLevelObjectColumns)}
          width={defaultMonacoEditorWidth}
          height={200}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

function getJSON(columnId: string, row: DataTableRecord, useTopLevelObjectColumns: boolean) {
  const json = useTopLevelObjectColumns
    ? getInnerColumns(row.raw.fields as Record<string, unknown[]>, columnId)
    : row.raw;
  return json as Record<string, unknown>;
}

// eslint-disable-next-line import/no-default-export
export default SourcePopoverContent;
