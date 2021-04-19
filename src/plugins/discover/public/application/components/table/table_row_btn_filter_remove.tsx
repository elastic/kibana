/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface Props {
  onClick: () => void;
  disabled?: boolean;
}

export function DocViewTableRowBtnFilterRemove({ onClick, disabled = false }: Props) {
  const tooltipContent = disabled ? (
    <FormattedMessage
      id="discover.docViews.table.unindexedFieldsCanNotBeSearchedTooltip"
      defaultMessage="Unindexed fields can not be searched"
    />
  ) : (
    <FormattedMessage
      id="discover.docViews.table.filterOutValueButtonTooltip"
      defaultMessage="Filter out value"
    />
  );

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiButtonIcon
        aria-label={i18n.translate('discover.docViews.table.filterOutValueButtonAriaLabel', {
          defaultMessage: 'Filter out value',
        })}
        className="kbnDocViewer__actionButton"
        data-test-subj="removeInclusiveFilterButton"
        disabled={disabled}
        onClick={onClick}
        iconType={'minusInCircle'}
        iconSize={'s'}
      />
    </EuiToolTip>
  );
}
