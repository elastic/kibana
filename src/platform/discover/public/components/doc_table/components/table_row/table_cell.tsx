/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import classNames from 'classnames';
import { TableCellActions } from './table_cell_actions';
export interface CellProps {
  timefield: boolean;
  sourcefield?: boolean;
  formatted: JSX.Element;
  filterable: boolean;
  column: string;
  inlineFilter: (column: string, type: '+' | '-') => void;
}

export const TableCell = (props: CellProps) => {
  const classes = classNames({
    ['eui-textNoWrap kbnDocTableCell--extraWidth']: props.timefield,
    ['eui-textBreakAll eui-textBreakWord']: props.sourcefield,
    ['kbnDocTableCell__dataField eui-textBreakAll eui-textBreakWord']:
      !props.timefield && !props.sourcefield,
  });

  const handleFilterFor = () => props.inlineFilter(props.column, '+');
  const handleFilterOut = () => props.inlineFilter(props.column, '-');

  return (
    <td className={classes} data-test-subj="docTableField">
      {props.formatted}
      {props.filterable ? (
        <TableCellActions handleFilterOut={handleFilterOut} handleFilterFor={handleFilterFor} />
      ) : (
        <span className="kbnDocTableCell__filter" />
      )}
    </td>
  );
};
