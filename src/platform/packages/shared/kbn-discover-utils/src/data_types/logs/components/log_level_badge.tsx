/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactElement } from 'react';
import { EuiBadge, EuiBadgeProps, mathWithUnits, useEuiTheme } from '@elastic/eui';
import { CSSObject } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { getLogLevelCoalescedValue, getLogLevelColor } from '../utils';

const badgeCss: CSSObject = {
  maxWidth: mathWithUnits(euiThemeVars.euiSize, (size) => size * 7.5),
};

export const LogLevelBadge = ({
  logLevel,
  fallback,
  'data-test-subj': dataTestSubj = 'logLevelBadge',
  ...badgeProps
}: Omit<EuiBadgeProps, 'children' | 'color'> & {
  logLevel: {};
  fallback?: ReactElement;
}) => {
  const { euiTheme } = useEuiTheme();
  const coalescedValue = getLogLevelCoalescedValue(logLevel);
  const color = coalescedValue ? getLogLevelColor(coalescedValue, euiTheme) : undefined;
  const castedBadgeProps = badgeProps as EuiBadgeProps;

  if (!color || !coalescedValue) {
    return fallback ? (
      fallback
    ) : (
      <EuiBadge
        {...castedBadgeProps}
        color="hollow"
        data-test-subj={`${dataTestSubj}-unknown`}
        css={badgeCss}
      >
        {logLevel as React.ReactNode}
      </EuiBadge>
    );
  }

  return (
    <EuiBadge
      {...castedBadgeProps}
      color={color}
      data-test-subj={`${dataTestSubj}-${coalescedValue}`}
      css={badgeCss}
    >
      {logLevel as React.ReactNode}
    </EuiBadge>
  );
};
