/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';

import type { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/common';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { type UseEuiTheme } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { TableGroup, TableVisConfig, TableVisUseUiStateProps } from '../types';
import { TableVisBasic } from './table_vis_basic';

const tableVisSplitStyles = {
  base: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.s,
      marginBottom: euiTheme.size.l,
      display: 'flex',
      flexDirection: 'column',
      flex: '1 0 0',
      '> h3': {
        textAlign: 'center',
      },
    }),
};

interface TableVisSplitProps {
  fireEvent: IInterpreterRenderHandlers['event'];
  tables: TableGroup[];
  visConfig: TableVisConfig;
  uiStateProps: TableVisUseUiStateProps;
  enforceMinWidth?: boolean;
}

export const TableVisSplit = memo(
  ({ fireEvent, tables, visConfig, uiStateProps, enforceMinWidth }: TableVisSplitProps) => {
    const styles = useMemoCss(tableVisSplitStyles);

    return (
      <>
        {tables.map(({ table, title }) => {
          // reserve minimum size per table
          const minTableWidth = table.columns.reduce((sum, column, index) => {
            return (
              sum +
              (uiStateProps.columnsWidth.find((width) => width.colIndex === index)?.width ?? 25)
            );
          }, 0);
          return (
            <div
              key={title}
              className="tbvChart__split"
              css={[
                styles.base,
                enforceMinWidth
                  ? {
                      minWidth: `calc(${minTableWidth}px + 2 * ${euiThemeVars.euiSizeS})`,
                    }
                  : {},
              ]}
            >
              <TableVisBasic
                fireEvent={fireEvent}
                table={table}
                visConfig={visConfig}
                title={title}
                uiStateProps={uiStateProps}
              />
            </div>
          );
        })}
      </>
    );
  }
);
