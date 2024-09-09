/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FC } from 'react';
import { css } from '@emotion/css';
import { euiThemeVars } from '@kbn/ui-theme';

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { useValueWithSpaceWarning } from './use_value_with_space_warning';

interface ValueWithSpaceWarningProps {
  value: string[] | string;
  tooltipIconType?: string;
  tooltipIconText?: string;
}
const containerCss = css`
  display: inline;
  margin-left: ${euiThemeVars.euiSizeXS};
`;
export const ValueWithSpaceWarning: FC<ValueWithSpaceWarningProps> = ({
  value,
  tooltipIconType = 'iInCircle',
  tooltipIconText,
}) => {
  const { showSpaceWarningIcon, warningText } = useValueWithSpaceWarning({
    value,
    tooltipIconText,
  });
  if (!showSpaceWarningIcon || !value) return null;
  return (
    <div className={containerCss}>
      <EuiToolTip position="top" content={warningText}>
        <EuiIcon
          data-test-subj="valueWithSpaceWarningTooltip"
          type={tooltipIconType}
          color="warning"
        />
      </EuiToolTip>
    </div>
  );
};
