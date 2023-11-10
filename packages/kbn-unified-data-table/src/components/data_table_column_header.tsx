/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { FieldIcon, getFieldIconProps } from '@kbn/field-utils';
import { isNestedFieldParent } from '@kbn/discover-utils';
import { euiThemeVars } from '@kbn/ui-theme';
import type { DataTableColumnTypes } from '../types';

interface DataTableColumnHeaderProps {
  dataView: DataView;
  columnName: string | null;
  columnDisplayName: string;
  columnTypes?: DataTableColumnTypes;
  rowHeight: number | undefined;
}

export const DataTableColumnHeader: React.FC<DataTableColumnHeaderProps> = (props) => {
  const { columnDisplayName, columnName, columnTypes, dataView, rowHeight } = props;
  const columnToken = useMemo(
    () => getRenderedToken({ columnName, columnTypes, dataView }),
    [columnName, columnTypes, dataView]
  );

  const multilineCss = useMemo(() => {
    if (!rowHeight) {
      return;
    }

    const baseCss: CSSObject = { whiteSpace: 'normal', wordBreak: 'break-all' };

    if (rowHeight < 0) {
      return baseCss;
    }

    if (rowHeight < 2) {
      return;
    }

    return {
      ...baseCss,
      display: '-webkit-box',
      '-webkit-box-orient': 'vertical',
      '-webkit-line-clamp': rowHeight.toString(),
    };
  }, [rowHeight]);

  return (
    <div
      className={multilineCss ? undefined : 'eui-textTruncate'}
      css={[
        {
          '.euiDataGridHeaderCell--numeric &': {
            float: 'right',
          },
        },
        multilineCss,
      ]}
    >
      {columnToken && <span css={{ verticalAlign: 'text-top' }}>{columnToken}</span>}
      <span
        css={columnToken && { marginLeft: euiThemeVars.euiSizeXS }}
        data-test-subj="unifiedDataTableColumnTitle"
      >
        {columnDisplayName}
      </span>
    </div>
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
