/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, ReactElement } from 'react';
import { css, CSSObject } from '@emotion/react';
import { EuiIconTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { FieldIcon, getFieldIconProps, getTextBasedColumnIconType } from '@kbn/field-utils';
import { isNestedFieldParent } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import type { RenderCustomGridColumnInfoPopover, DataTableColumnsMeta } from '../types';
import ColumnHeaderTruncateContainer from './column_header_truncate_container';

export interface DataTableColumnHeaderProps {
  dataView: DataView;
  columnName: string | null;
  columnDisplayName: string;
  columnsMeta?: DataTableColumnsMeta;
  headerRowHeight?: number;
  showColumnTokens?: boolean;
  customColumnToken?: ReactElement;
  renderCustomGridColumnInfoPopover?: RenderCustomGridColumnInfoPopover;
}

export const DataTableColumnHeader: React.FC<DataTableColumnHeaderProps> = ({
  columnDisplayName,
  showColumnTokens,
  customColumnToken,
  columnName,
  columnsMeta,
  dataView,
  headerRowHeight,
  renderCustomGridColumnInfoPopover,
}) => {
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      direction="row"
      responsive={false}
      gutterSize="xs"
    >
      <EuiFlexItem grow={false}>
        <ColumnHeaderTruncateContainer headerRowHeight={headerRowHeight}>
          {showColumnTokens && (
            <DataTableColumnToken
              columnName={columnName}
              columnsMeta={columnsMeta}
              dataView={dataView}
              customColumnToken={customColumnToken}
            />
          )}
          <DataTableColumnTitle columnDisplayName={columnDisplayName} />
        </ColumnHeaderTruncateContainer>
      </EuiFlexItem>
      {typeof renderCustomGridColumnInfoPopover === 'function' && columnName ? (
        <EuiFlexItem grow={false} className="unifiedDataTable__columnHeaderInfoButton">
          {renderCustomGridColumnInfoPopover({ dataView, columnName, columnsMeta })}
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

const tokenCss = css`
  padding-right: ${euiThemeVars.euiSizeXS};
`;

const DataTableColumnToken: React.FC<
  Pick<DataTableColumnHeaderProps, 'columnName' | 'columnsMeta' | 'dataView' | 'customColumnToken'>
> = (props) => {
  const { columnName, columnsMeta, dataView, customColumnToken } = props;
  const columnToken = useMemo(
    () => getRenderedToken({ columnName, columnsMeta, dataView }),
    [columnName, columnsMeta, dataView]
  );

  if (customColumnToken) {
    return <span css={tokenCss}>{customColumnToken}</span>;
  }

  return columnToken ? <span css={tokenCss}>{columnToken}</span> : null;
};

const DataTableColumnTitle: React.FC<Pick<DataTableColumnHeaderProps, 'columnDisplayName'>> = ({
  columnDisplayName,
}) => {
  return <span data-test-subj="unifiedDataTableColumnTitle">{columnDisplayName}</span>;
};

const fieldIconCss: CSSObject = { verticalAlign: 'bottom' };

function getRenderedToken({
  dataView,
  columnName,
  columnsMeta,
}: Pick<DataTableColumnHeaderProps, 'dataView' | 'columnName' | 'columnsMeta'>) {
  if (!columnName || columnName === '_source') {
    return null;
  }

  // for text-based searches
  if (columnsMeta) {
    const columnMeta = columnsMeta[columnName];
    const columnIconType = getTextBasedColumnIconType(columnMeta);
    return columnIconType && columnIconType !== 'unknown' ? ( // renders an icon or nothing
      <FieldIcon type={columnIconType} css={fieldIconCss} />
    ) : null;
  }

  const dataViewField = dataView.getFieldByName(columnName);

  if (dataViewField) {
    return <FieldIcon {...getFieldIconProps(dataViewField)} css={fieldIconCss} />;
  }

  if (isNestedFieldParent(columnName, dataView)) {
    return <FieldIcon type="nested" css={fieldIconCss} />;
  }

  return null;
}

export const DataTableTimeColumnHeader: React.FC<DataTableColumnHeaderProps> = (props) => {
  const primaryTimeTooltip = i18n.translate('unifiedDataTable.tableHeader.timeFieldIconTooltip', {
    defaultMessage: 'This field represents the time that events occurred.',
  });

  return (
    <DataTableColumnHeader
      {...props}
      customColumnToken={
        <>
          <EuiIconTip type="clock" content={primaryTimeTooltip} />{' '}
        </>
      }
    />
  );
};
