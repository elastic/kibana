/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiListGroupItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface Props {
  disabled: boolean;
  onClick: () => void;
}

export function FilterAdd({ disabled, onClick }: Props) {
  const actionElement = (
    <EuiListGroupItem
      size="s"
      showToolTip={false}
      iconType="plusInCircle"
      aria-label={i18n.translate('discover.docViews.table.filterForValueButtonAriaLabel', {
        defaultMessage: 'Filter for value',
      })}
      label={
        <FormattedMessage
          id="discover.docViews.table.filterForValueButtonTooltip"
          defaultMessage="Filter for value"
        />
      }
      isDisabled={disabled}
      color="primary"
      onClick={onClick}
    />
  );

  if (disabled) {
    return (
      <EuiToolTip
        content={
          <FormattedMessage
            id="discover.docViews.table.unindexedFieldsCanNotBeSearchedTooltip"
            defaultMessage="Unindexed fields or ignored values cannot be searched"
          />
        }
      >
        {actionElement}
      </EuiToolTip>
    );
  }

  return actionElement;
}
