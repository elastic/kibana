/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { FieldIcon, getFieldIconProps } from '@kbn/field-utils';
import { isNestedFieldParent } from '@kbn/discover-utils';
import type { DataTableColumnTypes } from '../types';

interface DataTableColumnHeaderProps {
  dataView: DataView;
  columnName: string | null;
  columnDisplayName: string;
  columnTypes?: DataTableColumnTypes;
}

export const DataTableColumnHeader: React.FC<DataTableColumnHeaderProps> = (props) => {
  const { columnDisplayName, columnName, columnTypes, dataView } = props;
  const columnToken = useMemo(
    () => getRenderedToken({ columnName, columnTypes, dataView }),
    [columnName, columnTypes, dataView]
  );

  return (
    <EuiFlexGroup
      direction="row"
      wrap={false}
      responsive={false}
      alignItems="center"
      gutterSize="xs"
      css={css`
        .euiDataGridHeaderCell--numeric & {
          justify-content: flex-end;
        }
      `}
    >
      {columnToken && <EuiFlexItem grow={false}>{columnToken}</EuiFlexItem>}
      <EuiFlexItem
        grow={false}
        className="eui-displayInline eui-textTruncate"
        data-test-subj="unifiedDataTableColumnTitle"
      >
        {columnDisplayName}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

function getRenderedToken({
  dataView,
  columnName,
  columnTypes,
}: Pick<DataTableColumnHeaderProps, 'dataView' | 'columnName' | 'columnTypes'>) {
  if (!columnName || columnName === '_source') {
    return null;
  }

  // for text-based searches
  if (columnTypes) {
    return columnTypes[columnName] && columnTypes[columnName] !== 'unknown' ? ( // renders an icon or nothing
      <FieldIcon type={columnTypes[columnName]} />
    ) : null;
  }

  const dataViewField = dataView.getFieldByName(columnName);

  if (dataViewField) {
    return <FieldIcon {...getFieldIconProps(dataViewField)} />;
  }

  if (isNestedFieldParent(columnName, dataView)) {
    return <FieldIcon type="nested" />;
  }

  return null;
}
