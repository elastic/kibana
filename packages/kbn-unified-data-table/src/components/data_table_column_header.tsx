/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiTextBlockTruncate } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { FieldIcon, getFieldIconProps } from '@kbn/field-utils';
import { isNestedFieldParent } from '@kbn/discover-utils';
import type { DataTableColumnTypes } from '../types';

interface DataTableColumnHeaderProps {
  dataView: DataView;
  columnName: string | null;
  columnDisplayName: string;
  columnTypes?: DataTableColumnTypes;
  headerRowHeight?: number;
  showColumnTokens?: boolean;
}

export const DataTableColumnHeader: React.FC<DataTableColumnHeaderProps> = (props) => {
  const {
    columnDisplayName,
    showColumnTokens,
    columnName,
    columnTypes,
    dataView,
    headerRowHeight = 1,
  } = props;

  return (
    <EuiTextBlockTruncate
      lines={headerRowHeight}
      css={css`
        overflow-wrap: anywhere;
        overflow: auto;
        white-space: normal;
        word-break: break-all;
        line-height: 16px;
        .euiDataGridHeaderCell--numeric & {
          justify-content: flex-end;
        }
      `}
    >
      {showColumnTokens && (
        <DataTableColumnToken
          columnName={columnName}
          columnTypes={columnTypes}
          dataView={dataView}
        />
      )}
      <DataTableColumnTitle columnDisplayName={columnDisplayName} />
    </EuiTextBlockTruncate>
  );
};

const DataTableColumnToken: React.FC<
  Pick<DataTableColumnHeaderProps, 'columnName' | 'columnTypes' | 'dataView'>
> = (props) => {
  const { columnName, columnTypes, dataView } = props;
  const columnToken = useMemo(
    () => getRenderedToken({ columnName, columnTypes, dataView }),
    [columnName, columnTypes, dataView]
  );

  return columnToken ? (
    <span
      css={css`
        vertical-align: middle;
        line-height: 0.8;
        padding-right: 4px;
      `}
    >
      {columnToken}
    </span>
  ) : null;
};

const DataTableColumnTitle: React.FC<Pick<DataTableColumnHeaderProps, 'columnDisplayName'>> = ({
  columnDisplayName,
}) => {
  return <span data-test-subj="unifiedDataTableColumnTitle">{columnDisplayName}</span>;
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
