/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function DocViewTableScoreSortWarning() {
  const tooltipContent = i18n.translate('discover.docViews.table.scoreSortWarningTooltip', {
    defaultMessage: 'In order to retrieve values for _score, you must sort by it.',
  });

  return <EuiIconTip content={tooltipContent} color="warning" size="s" type="alert" />;
}
