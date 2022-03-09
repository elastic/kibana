/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';

export interface Props {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  fieldname: string;
}

export function DocViewTableRowBtnToggleColumn({
  onClick,
  active,
  disabled = false,
  fieldname = '',
}: Props) {
  if (disabled) {
    return (
      <EuiButtonIcon
        aria-label={i18n.translate('discover.docViews.table.toggleColumnInTableButtonAriaLabel', {
          defaultMessage: 'Toggle column in table',
        })}
        className="kbnDocViewer__actionButton"
        data-test-subj="toggleColumnButton"
        disabled
        iconType={'listAdd'}
        iconSize={'s'}
      />
    );
  }
  return (
    <EuiToolTip
      content={
        <FormattedMessage
          id="discover.docViews.table.toggleColumnInTableButtonTooltip"
          defaultMessage="Toggle column in table"
        />
      }
    >
      <EuiButtonIcon
        aria-label={i18n.translate('discover.docViews.table.toggleColumnInTableButtonAriaLabel', {
          defaultMessage: 'Toggle column in table',
        })}
        aria-pressed={active}
        onClick={onClick}
        className="kbnDocViewer__actionButton"
        data-test-subj={`toggleColumnButton-${fieldname}`}
        iconType={'listAdd'}
        iconSize={'s'}
      />
    </EuiToolTip>
  );
}
