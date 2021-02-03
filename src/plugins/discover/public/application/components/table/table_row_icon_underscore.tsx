/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function DocViewTableRowIconUnderscore() {
  const ariaLabel = i18n.translate(
    'discover.docViews.table.fieldNamesBeginningWithUnderscoreUnsupportedAriaLabel',
    {
      defaultMessage: 'Warning',
    }
  );
  const tooltipContent = i18n.translate(
    'discover.docViews.table.fieldNamesBeginningWithUnderscoreUnsupportedTooltip',
    {
      defaultMessage: 'Field names beginning with {underscoreSign} are not supported',
      values: { underscoreSign: '_' },
    }
  );

  return (
    <EuiIconTip
      aria-label={ariaLabel}
      content={tooltipContent}
      color="warning"
      iconProps={{
        className: 'kbnDocViewer__warning',
        'data-test-subj': 'underscoreWarning',
      }}
      size="s"
      type="alert"
    />
  );
}
