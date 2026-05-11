/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
import { isNextChrome, toggleNextChrome } from '.';

const badgeStyles = css`
  cursor: pointer;
`;

interface ChromeNextToggleProps {
  featureFlags: Pick<FeatureFlagsStart, 'getBooleanValue'>;
}

export const ChromeNextToggle: React.FC<ChromeNextToggleProps> = ({ featureFlags }) => {
  const isEnabled = isNextChrome(featureFlags);

  const onClick = useCallback(() => {
    toggleNextChrome(featureFlags);
  }, [featureFlags]);

  return (
    <EuiToolTip
      content={`Click to ${isEnabled ? 'disable' : 'enable'} Chrome Next. Page will reload.`}
    >
      <EuiBadge
        color={isEnabled ? 'success' : 'danger'}
        css={badgeStyles}
        iconType="beaker"
        iconSide="left"
        onClick={onClick}
        onClickAriaLabel="Toggle Chrome Next"
      >
        Chrome Next: {isEnabled ? 'ON' : 'OFF'}
      </EuiBadge>
    </EuiToolTip>
  );
};
