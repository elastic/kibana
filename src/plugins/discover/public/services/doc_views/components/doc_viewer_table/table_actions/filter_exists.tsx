/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiListGroupItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export interface Props {
  onClick: () => void;
  disabled?: boolean;
  scripted?: boolean;
}

export const FilterExists = ({ disabled = false, scripted = false, onClick }: Props) => {
  const actionElement = (
    <EuiListGroupItem
      size="s"
      color="primary"
      showToolTip={false}
      iconType="filter"
      aria-label={i18n.translate('discover.docViews.table.filterForFieldPresentButtonAriaLabel', {
        defaultMessage: 'Filter for field present',
      })}
      label={
        <FormattedMessage
          id="discover.docViews.table.filterForFieldPresentButtonTooltip"
          defaultMessage="Filter for field present"
        />
      }
      isDisabled={disabled}
      onClick={onClick}
    />
  );

  if (disabled) {
    const tooltipContent = scripted ? (
      <FormattedMessage
        id="discover.docViews.table.unableToFilterForPresenceOfScriptedFieldsTooltip"
        defaultMessage="Unable to filter for presence of scripted fields"
      />
    ) : (
      <FormattedMessage
        id="discover.docViews.table.unableToFilterForPresenceOfMetaFieldsTooltip"
        defaultMessage="Unable to filter for presence of meta fields"
      />
    );

    return <EuiToolTip content={tooltipContent}>{actionElement}</EuiToolTip>;
  }

  return actionElement;
};
