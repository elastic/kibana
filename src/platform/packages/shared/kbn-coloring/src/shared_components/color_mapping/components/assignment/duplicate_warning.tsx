/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';

const duplicateWarning = i18n.translate(
  'coloring.colorMapping.assignments.duplicateCategoryWarning',
  {
    defaultMessage:
      'This category has already been assigned a different color. Only the first matching assignment will be used.',
  }
);

export function DuplicateWarning() {
  return (
    <EuiToolTip position="bottom" content={duplicateWarning}>
      <EuiIcon size="s" type="warning" color={euiThemeVars.euiColorWarningText} />
    </EuiToolTip>
  );
}
