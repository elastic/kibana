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

interface TableCellActionsProps {
  handleFilterFor: () => void;
  handleFilterOut: () => void;
}

export const TableCellActions = ({ handleFilterFor, handleFilterOut }: TableCellActionsProps) => {
  return (
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
          aria-label={i18n.translate('discover.docTable.tableRow.filterForValueButtonAriaLabel', {
            defaultMessage: 'Filter for value',
          })}
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
          aria-label={i18n.translate('discover.docTable.tableRow.filterOutValueButtonAriaLabel', {
            defaultMessage: 'Filter out value',
          })}
          onClick={handleFilterOut}
        >
          <EuiIcon type="minusInCircle" size="s" color="primary" />
        </button>
      </EuiToolTip>
    </span>
  );
};
