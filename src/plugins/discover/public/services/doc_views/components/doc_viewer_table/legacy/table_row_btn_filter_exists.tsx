/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface Props {
  field: string;
  onClick: () => void;
  disabled?: boolean;
  scripted?: boolean;
}

export function DocViewTableRowBtnFilterExists({
  field,
  onClick,
  disabled = false,
  scripted = false,
}: Props) {
  const tooltipContent = disabled ? (
    scripted ? (
      <FormattedMessage
        id="discover.docViews.table.unableToFilterForPresenceOfScriptedFieldsTooltip"
        defaultMessage="Unable to filter for presence of scripted fields"
      />
    ) : (
      <FormattedMessage
        id="discover.docViews.table.unableToFilterForPresenceOfMetaFieldsTooltip"
        defaultMessage="Unable to filter for presence of meta fields"
      />
    )
  ) : (
    <FormattedMessage
      id="discover.docViews.table.filterForFieldPresentButtonTooltip"
      defaultMessage="Filter for field present"
    />
  );

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiButtonIcon
        aria-label={i18n.translate('discover.docViews.table.filterForFieldPresentButtonAriaLabel', {
          defaultMessage: 'Filter for field present',
        })}
        onClick={onClick}
        className="kbnDocViewer__actionButton"
        data-test-subj={`addExistsFilterButton-${field}`}
        disabled={disabled}
        iconType={'filter'}
        iconSize={'s'}
      />
    </EuiToolTip>
  );
}
