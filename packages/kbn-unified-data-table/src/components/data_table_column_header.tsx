/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { css, CSSObject } from '@emotion/react';
import { EuiIconTip } from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { FieldIcon, getFieldIconProps, getTextBasedColumnIconType } from '@kbn/field-utils';
import { isNestedFieldParent } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import type { DataTableColumnsMeta } from '../types';
import ColumnHeaderTruncateContainer from './column_header_truncate_container';

interface DataTableColumnHeaderProps {
  dataView: DataView;
  columnName: string | null;
  columnDisplayName: string;
  columnsMeta?: DataTableColumnsMeta;
  headerRowHeight?: number;
  showColumnTokens?: boolean;
}

export const DataTableColumnHeader: React.FC<DataTableColumnHeaderProps> = ({
  columnDisplayName,
  showColumnTokens,
  columnName,
  columnsMeta,
  dataView,
  headerRowHeight,
}) => {
  return (
    <ColumnHeaderTruncateContainer headerRowHeight={headerRowHeight}>
      {showColumnTokens && (
        <DataTableColumnToken
          columnName={columnName}
          columnsMeta={columnsMeta}
          dataView={dataView}
        />
      )}
      <DataTableColumnTitle columnDisplayName={columnDisplayName} />
    </ColumnHeaderTruncateContainer>
  );
};

const DataTableColumnToken: React.FC<
  Pick<DataTableColumnHeaderProps, 'columnName' | 'columnsMeta' | 'dataView'>
> = (props) => {
  const { columnName, columnsMeta, dataView } = props;
  const columnToken = useMemo(
    () => getRenderedToken({ columnName, columnsMeta, dataView }),
    [columnName, columnsMeta, dataView]
  );

  return columnToken ? (
    <span css={{ paddingRight: euiThemeVars.euiSizeXS }}>{columnToken}</span>
  ) : null;
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
