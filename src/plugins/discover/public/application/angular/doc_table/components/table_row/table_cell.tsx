/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface CellProps {
  timefield: boolean;
  sourcefield?: boolean;
  formatted: JSX.Element;
  filterable: boolean;
  column: string;
  inlineFilter: (column: string, type: '+' | '-') => void;
}

export const Cell = (props: CellProps) => {
  let classes = '';
  let extraWidth;
  if (props.timefield) {
    classes = 'eui-textNoWrap';
    extraWidth = '1%';
  } else if (props.sourcefield) {
    classes = 'eui-textBreakAll eui-textBreakWord';
  } else {
    classes = 'kbnDocTableCell__dataField eui-textBreakAll eui-textBreakWord';
  }

  const handleFilterFor = () => props.inlineFilter(props.column, '+');
  const handleFilterOut = () => props.inlineFilter(props.column, '-');

  if (props.filterable) {
    return (
      <td className={classes} style={{ width: extraWidth }} data-test-subj="docTableField">
        {props.formatted}
        <span className="kbnDocTableCell__filter">
          <EuiToolTip
            className="kbnDocTableCell__filterButton"
            position="bottom"
            content={i18n.translate('discover.docTable.tableRow.filterForValueButtonTooltip', {
              defaultMessage: 'Filter for value',
            })}
          >
            <button
              className="kbnDocTableRowFilterButton"
              data-test-subj="docTableCellFilter"
              aria-label={i18n.translate(
                'discover.docTable.tableRow.filterForValueButtonAriaLabel',
                {
                  defaultMessage: 'Filter for value',
                }
              )}
              onClick={handleFilterFor}
            >
              <EuiIcon type="plusInCircle" size="s" color="primary" />
            </button>
          </EuiToolTip>

          <EuiToolTip
            className="kbnDocTableCell__filterButton"
            position="bottom"
            content={i18n.translate('discover.docTable.tableRow.filterOutValueButtonTooltip', {
              defaultMessage: 'Filter out value',
            })}
          >
            <button
              className="kbnDocTableRowFilterButton"
              data-test-subj="docTableCellFilterNegate"
              aria-label={i18n.translate(
                'discover.docTable.tableRow.filterOutValueButtonAriaLabel',
                {
                  defaultMessage: 'Filter out value',
                }
              )}
              onClick={handleFilterOut}
            >
              <EuiIcon type="minusInCircle" size="s" color="primary" />
            </button>
          </EuiToolTip>
        </span>
      </td>
    );
  }

  return (
    <td className={classes} style={{ width: extraWidth }} data-test-subj="docTableField">
      {props.formatted}
      <span className="kbnDocTableCell__filter" />
    </td>
  );
};
