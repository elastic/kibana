/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiIcon, EuiTextBlockTruncate, EuiToolTip } from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { FieldIcon, getFieldIconProps } from '@kbn/field-utils';
import { isNestedFieldParent } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
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
    <ColumnHeaderTruncateContainer headerRowHeight={headerRowHeight}>
      {showColumnTokens && (
        <DataTableColumnToken
          columnName={columnName}
          columnTypes={columnTypes}
          dataView={dataView}
        />
      )}
      <DataTableColumnTitle columnDisplayName={columnDisplayName} />
    </ColumnHeaderTruncateContainer>
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

const ColumnHeaderTruncateContainer = ({
  headerRowHeight = 1,
  children,
}: {
  headerRowHeight: number;
  children: React.ReactNode;
}) => {
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
          text-align: right;
        }
      `}
    >
      {children}
    </EuiTextBlockTruncate>
  );
};

export const DataTableTimeColumnHeader = ({
  dataView,
  dataViewField,
  headerRowHeight = 1,
}: {
  dataView: DataView;
  dataViewField?: DataViewField;
  headerRowHeight?: number;
}) => {
  const timeFieldName = dataViewField?.customLabel ?? dataView.timeFieldName;
  const primaryTimeAriaLabel = i18n.translate(
    'unifiedDataTable.tableHeader.timeFieldIconTooltipAriaLabel',
    {
      defaultMessage: '{timeFieldName} - this field represents the time that events occurred.',
      values: { timeFieldName },
    }
  );
  const primaryTimeTooltip = i18n.translate('unifiedDataTable.tableHeader.timeFieldIconTooltip', {
    defaultMessage: 'This field represents the time that events occurred.',
  });

  return (
    <div aria-label={primaryTimeAriaLabel}>
      <EuiToolTip content={primaryTimeTooltip}>
        <ColumnHeaderTruncateContainer headerRowHeight={headerRowHeight}>
          {timeFieldName} <EuiIcon type="clock" />
        </ColumnHeaderTruncateContainer>
      </EuiToolTip>
    </div>
  );
};
