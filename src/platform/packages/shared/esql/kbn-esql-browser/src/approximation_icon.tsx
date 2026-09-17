/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const approximationTooltip = i18n.translate('esqlBrowser.approximationAppliedTooltip', {
  defaultMessage:
    'This chart shows approximate results because fast mode is enabled or the query enables approximation.',
});

export const ApproximationIcon: React.FC<{
  isApproximationApplied: boolean;
  'data-test-subj'?: string;
}> = ({ isApproximationApplied, 'data-test-subj': dataTestSubj = 'approximationApplied' }) => {
  if (!isApproximationApplied) return null;

  return (
    <span style={{ marginRight: 4 }}>
      <EuiToolTip content={approximationTooltip}>
        <EuiBadge
          color="success"
          iconType="bolt"
          onClick={() => {}}
          onClickAriaLabel=""
          aria-label={approximationTooltip}
          data-test-subj={dataTestSubj}
        />
      </EuiToolTip>
    </span>
  );
};
