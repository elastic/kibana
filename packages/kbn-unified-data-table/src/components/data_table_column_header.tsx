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
    headerRowHeight,
    showColumnTokens,
    columnName,
    columnTypes,
    dataView,
  } = props;

  return (
    <EuiFlexGroup
      direction="row"
      responsive={false}
      alignItems="flexStart"
      gutterSize="xs"
      css={css`
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
      <DataTableColumnTitle
        columnDisplayName={columnDisplayName}
        headerRowHeight={headerRowHeight}
      />
    </EuiFlexGroup>
  );
};

const DataTableColumnToken: React.FC<{
  columnName: DataTableColumnHeaderProps['columnName'];
  columnTypes?: DataTableColumnHeaderProps['columnTypes'];
  dataView: DataTableColumnHeaderProps['dataView'];
}> = (props) => {
  const { columnName, columnTypes, dataView } = props;
  const columnToken = useMemo(
    () => getRenderedToken({ columnName, columnTypes, dataView }),
    [columnName, columnTypes, dataView]
  );

  return columnToken ? <EuiFlexItem grow={false}>{columnToken}</EuiFlexItem> : null;
};

interface DataTableColumnTitleProps {
  columnDisplayName: DataTableColumnHeaderProps['columnDisplayName'];
  headerRowHeight?: DataTableColumnHeaderProps['headerRowHeight'];
}

const DataTableColumnTitle: React.FC<DataTableColumnTitleProps> = ({
  columnDisplayName,
  headerRowHeight = 1,
}) => {
  return (
    <EuiFlexItem
      grow={false}
      data-test-subj="unifiedDataTableColumnTitle"
      css={css`
        white-space: normal;
        overflow-wrap: anywhere;
      `}
    >
      <EuiTextBlockTruncate lines={headerRowHeight}>{columnDisplayName}</EuiTextBlockTruncate>
    </EuiFlexItem>
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
