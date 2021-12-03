/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiListGroupItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export interface Props {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  fieldname: string;
}

export const ToggleColumn = ({ onClick, active, disabled = false, fieldname = '' }: Props) => {
  return (
    <EuiListGroupItem
      size="s"
      showToolTip={false}
      iconType="listAdd"
      data-test-subj={`toggleColumnButton_${fieldname}`}
      aria-label={i18n.translate('discover.docViews.table.toggleColumnInTableButtonAriaLabel', {
        defaultMessage: 'Toggle column in table',
      })}
      aria-pressed={active}
      label={
        <FormattedMessage
          id="discover.docViews.table.toggleColumnInTableButtonTooltip"
          defaultMessage="Toggle column in table"
        />
      }
      isDisabled={disabled}
      color="primary"
      onClick={onClick}
    />
  );
};
