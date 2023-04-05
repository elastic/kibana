/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  EuiDataGridSetCellProps,
} from '@elastic/eui';
import React, {
  JSXElementConstructor,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { euiDarkVars as themeDark, euiLightVars as themeLight } from '@kbn/ui-theme';
import { merge } from 'lodash';
import { DiscoverGridContext } from './discover_grid_context';

const wrapRowCellRenderer = (rowCellRender: EuiDataGridControlColumn['rowCellRender']) => {
  // React is more permissible than the TS types indicate
  const CellElement = rowCellRender as JSXElementConstructor<EuiDataGridCellValueElementProps>;

  return ({
    rowIndex,
    setCellProps: originalSetCellProps,
    ...props
  }: EuiDataGridCellValueElementProps) => {
    const { expanded, rows, isDarkMode } = useContext(DiscoverGridContext);
    const doc = useMemo(() => rows[rowIndex], [rows, rowIndex]);
    const wrapperCellProps = useRef<EuiDataGridSetCellProps>({});
    const customCellProps = useRef<EuiDataGridSetCellProps>({});

    const updateCellProps = useCallback(() => {
      originalSetCellProps(merge({}, customCellProps.current, wrapperCellProps.current));
    }, [originalSetCellProps]);

    const setCellProps = useCallback(
      (cellProps: EuiDataGridSetCellProps) => {
        customCellProps.current = cellProps;
        updateCellProps();
      },
      [updateCellProps]
    );

    useEffect(() => {
      if (expanded && doc && expanded.id === doc.id) {
        wrapperCellProps.current = {
          style: {
            backgroundColor: isDarkMode
              ? themeDark.euiColorHighlight
              : themeLight.euiColorHighlight,
          },
        };
      } else {
        wrapperCellProps.current = {};
      }

      updateCellProps();
    }, [doc, expanded, isDarkMode, updateCellProps]);

    return <CellElement {...props} rowIndex={rowIndex} setCellProps={setCellProps} />;
  };
};

export const createCustomControlColumn = (
  column: EuiDataGridControlColumn
): EuiDataGridControlColumn => {
  return {
    ...column,
    rowCellRender: wrapRowCellRenderer(column.rowCellRender),
  };
};
