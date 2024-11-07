/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface Props {
  onClick: () => void;
  disabled: boolean;
}

export function DocViewTableRowBtnFilterAdd({ onClick, disabled = false }: Props) {
  const tooltipContent = disabled ? (
    <FormattedMessage
      id="unifiedDocViewer.docViews.table.unindexedFieldsCanNotBeSearchedTooltip"
      defaultMessage="Unindexed fields or ignored values cannot be searched"
    />
  ) : (
    <FormattedMessage
      id="unifiedDocViewer.docViews.table.filterForValueButtonTooltip"
      defaultMessage="Filter for value"
    />
  );

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiButtonIcon
        aria-label={i18n.translate(
          'unifiedDocViewer.docViews.table.filterForValueButtonAriaLabel',
          {
            defaultMessage: 'Filter for value',
          }
        )}
        className="kbnDocViewer__actionButton"
        data-test-subj="addInclusiveFilterButton"
        disabled={disabled}
        onClick={onClick}
        iconType={'plusInCircle'}
        iconSize={'s'}
      />
    </EuiToolTip>
  );
}
