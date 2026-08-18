/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { CSSObject } from '@emotion/react';
import { css } from '@emotion/react';
import { EuiIconTip, useEuiTheme } from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { FieldIcon } from '@kbn/field-utils';
import { isNestedFieldParent } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { type DataSource, IndexPatternSource } from '@kbn/data-source';
import ColumnHeaderTruncateContainer from './column_header_truncate_container';

interface DataTableColumnHeaderProps {
  dataSource: DataSource | undefined;
  columnName: string | null;
  columnDisplayName: string;
  headerRowHeight?: number;
  showColumnTokens?: boolean;
}

export const DataTableColumnHeader: React.FC<DataTableColumnHeaderProps> = ({
  columnDisplayName,
  showColumnTokens,
  columnName,
  dataSource,
  headerRowHeight,
}) => {
  return (
    <ColumnHeaderTruncateContainer headerRowHeight={headerRowHeight}>
      {showColumnTokens && <DataTableColumnToken columnName={columnName} dataSource={dataSource} />}
      <DataTableColumnTitle columnDisplayName={columnDisplayName} />
    </ColumnHeaderTruncateContainer>
  );
};

const DataTableColumnToken: React.FC<
  Pick<DataTableColumnHeaderProps, 'columnName' | 'dataSource'>
> = (props) => {
  const { euiTheme } = useEuiTheme();
  const { columnName, dataSource } = props;
  const columnToken = useMemo(
    () => getRenderedToken({ columnName, dataSource }),
    [columnName, dataSource]
  );

  return columnToken ? <span css={{ paddingRight: euiTheme.size.xs }}>{columnToken}</span> : null;
};

const DataTableColumnTitle: React.FC<Pick<DataTableColumnHeaderProps, 'columnDisplayName'>> = ({
  columnDisplayName,
}) => {
  return <span data-test-subj="unifiedDataTableColumnTitle">{columnDisplayName}</span>;
};

const fieldIconCss: CSSObject = { verticalAlign: 'bottom' };

function getRenderedToken({
  dataSource,
  columnName,
}: Pick<DataTableColumnHeaderProps, 'dataSource' | 'columnName'>) {
  if (!columnName || columnName === '_source' || !dataSource) {
    return null;
  }

  const iconType = dataSource.getColumnIconType(columnName);
  if (iconType) {
    // DSL-only: decorate scripted fields. `scripted` has no ES|QL equivalent,
    // so it's not part of the polymorphic `getColumnIconType` contract.
    const scripted =
      dataSource instanceof IndexPatternSource &&
      dataSource.getDataView().getFieldByName(columnName)?.scripted;
    return <FieldIcon type={iconType} scripted={scripted} css={fieldIconCss} />;
  }

  // DSL-only fallback: a "nested" token for the parent of a nested field group,
  // which isn't a column in its own right so it has no icon type of its own.
  if (
    dataSource instanceof IndexPatternSource &&
    isNestedFieldParent(columnName, dataSource.getDataView())
  ) {
    return <FieldIcon type="nested" css={fieldIconCss} />;
  }

  return null;
}

export const DataTableTimeColumnHeader = ({
  dataView,
  dataViewField,
  headerRowHeight = 1,
  columnLabel,
}: {
  dataView: DataView;
  dataViewField?: DataViewField;
  headerRowHeight?: number;
  columnLabel?: string;
}) => {
  const timeFieldName = columnLabel || (dataViewField?.customLabel ?? dataView.timeFieldName);
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
    <div
      aria-label={primaryTimeAriaLabel}
      css={css`
        text-align: left;
      `}
    >
      <ColumnHeaderTruncateContainer headerRowHeight={headerRowHeight}>
        {timeFieldName} <EuiIconTip type="clock" content={primaryTimeTooltip} />
      </ColumnHeaderTruncateContainer>
    </div>
  );
};

export const DataTableScoreColumnHeader = ({
  isSorted,
  showColumnTokens,
  columnName,
  dataSource,
  headerRowHeight,
  columnDisplayName,
}: DataTableColumnHeaderProps & { isSorted?: boolean }) => {
  const tooltipContent = i18n.translate('unifiedDataTable.tableHeader.scoreFieldIconTooltip', {
    defaultMessage: 'In order to retrieve values for _score, you must sort by it.',
  });
  const { euiTheme } = useEuiTheme();

  return (
    <ColumnHeaderTruncateContainer headerRowHeight={headerRowHeight}>
      {showColumnTokens && isSorted && (
        <DataTableColumnToken columnName={columnName} dataSource={dataSource} />
      )}
      {!isSorted && (
        <span css={{ paddingRight: euiTheme.size.xs }}>
          <EuiIconTip
            content={tooltipContent}
            color="warning"
            size="s"
            type="warning"
            position="left"
          />
        </span>
      )}
      <DataTableColumnTitle columnDisplayName={columnDisplayName} />
    </ColumnHeaderTruncateContainer>
  );
};
