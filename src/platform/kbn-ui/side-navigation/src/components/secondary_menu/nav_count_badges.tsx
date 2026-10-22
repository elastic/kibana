/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

const formatAlertTooltip = (count: number): string =>
  count === 1
    ? '1 resource with active alerts — click to filter by alerts'
    : `${count.toLocaleString()} resources with active alerts — click to filter by alerts`;

const alertDotHitTargetStyles = css`
  align-items: center;
  background: transparent;
  border: none;
  cursor: pointer;
  display: inline-flex;
  flex-shrink: 0;
  justify-content: center;
  line-height: 0;
  margin: 0;
  min-height: 24px;
  min-width: 24px;
  padding: 0;
`;

export const NavCountBadges = ({
  notificationCount,
  notificationHref,
}: {
  inventoryCount?: number;
  notificationCount?: number;
  notificationHref?: string;
}): JSX.Element | null => {
  const { euiTheme } = useEuiTheme();

  const alertDotStyles = css`
    background-color: ${euiTheme.colors.danger};
    border-radius: 50%;
    flex-shrink: 0;
    height: 8px;
    width: 8px;
  `;

  const showNotification =
    typeof notificationCount === 'number' &&
    Number.isFinite(notificationCount) &&
    notificationCount > 0;

  const onAlertIndicatorClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (notificationHref) {
        window.location.assign(notificationHref);
      }
    },
    [notificationHref]
  );

  const stopNavRowActivation = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  if (!showNotification) {
    return null;
  }

  const tooltip = formatAlertTooltip(notificationCount!);
  const dot = <span css={alertDotStyles} data-test-subj="sideNavAlertIndicator" />;

  if (notificationHref) {
    return (
      <EuiToolTip content={tooltip} disableScreenReaderOutput>
        <button
          type="button"
          css={alertDotHitTargetStyles}
          aria-label={tooltip}
          onClick={onAlertIndicatorClick}
          onMouseDown={stopNavRowActivation}
        >
          {dot}
        </button>
      </EuiToolTip>
    );
  }

  return (
    <EuiToolTip content={tooltip}>
      <span css={alertDotHitTargetStyles} aria-label={tooltip}>
        {dot}
      </span>
    </EuiToolTip>
  );
};
