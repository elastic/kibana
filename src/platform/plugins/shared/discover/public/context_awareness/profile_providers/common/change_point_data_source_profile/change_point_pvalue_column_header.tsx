/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIconTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const TOOLTIP_TITLE = i18n.translate(
  'discover.contextAwareness.changePointPvalueColumnHeader.tooltipTitle',
  { defaultMessage: 'P-value' }
);

const TOOLTIP_CONTENT = i18n.translate(
  'discover.contextAwareness.changePointPvalueColumnHeader.tooltipContent',
  {
    defaultMessage:
      'Statistical significance of the change point. Lower values indicate a more extreme change. The impact badge reflects this (e.g. very high for p < 0.001).',
  }
);

interface ChangePointPvalueColumnHeaderProps {
  columnDisplayName?: string;
  headerRowHeight?: number;
}

export const ChangePointPvalueColumnHeader: React.FC<ChangePointPvalueColumnHeaderProps> = ({
  columnDisplayName,
  headerRowHeight = 1,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        minHeight: 0,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <span css={{ marginRight: euiTheme.size.xs }}>
        <EuiIconTip
          data-test-subj="change-point-pvalue-header-icon"
          type="info"
          content={TOOLTIP_CONTENT}
          title={TOOLTIP_TITLE}
        />
      </span>
      <span css={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {columnDisplayName ?? 'pvalue'}
      </span>
    </div>
  );
};
