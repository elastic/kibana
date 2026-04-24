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

const CLOUD_DEV_OVERRIDE_KEY = '__kibana_dev_cloud_enabled';

const badgeStyles = css`
  cursor: pointer;
`;

const isDevCloudOverrideActive = (): boolean => {
  try {
    return window.localStorage.getItem(CLOUD_DEV_OVERRIDE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const CloudEnvironmentToggle: React.FC = () => {
  const isActive = isDevCloudOverrideActive();

  const toggle = useCallback(() => {
    if (isActive) {
      window.localStorage.removeItem(CLOUD_DEV_OVERRIDE_KEY);
    } else {
      window.localStorage.setItem(CLOUD_DEV_OVERRIDE_KEY, 'true');
    }
    window.location.reload();
  }, [isActive]);

  return (
    <EuiToolTip
      content={
        isActive
          ? 'Cloud environment active. Click to disable and reload.'
          : 'Click to enable cloud environment and reload.'
      }
    >
      <EuiBadge
        css={badgeStyles}
        color={isActive ? 'success' : 'default'}
        iconType="cloud"
        onClick={toggle}
        onClickAriaLabel={isActive ? 'Disable cloud environment' : 'Enable cloud environment'}
      >
        {isActive ? 'Cloud: ON' : 'Cloud: OFF'}
      </EuiBadge>
    </EuiToolTip>
  );
};
