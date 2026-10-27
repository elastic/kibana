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
import { i18n } from '@kbn/i18n';

/** Compact nav badge counts: full number through 9999, then `10k` / `10k+`. */
const formatNavCount = (count: number): string => {
  if (count > 10000) return '10k+';
  if (count >= 10000) return '10k';
  return count.toLocaleString();
};

const alertRatioLabel = (alerting: number, total: number): string =>
  `${formatNavCount(alerting)}/${formatNavCount(total)}`;

const inventoryTooltip = (total: number): string =>
  i18n.translate('sideNavigation.navCountBadges.inventoryTooltip', {
    defaultMessage:
      '{count, plural, one {# inventoried resource} other {# inventoried resources}}',
    values: { count: total },
  });

const alertRatioTooltip = (alerting: number, total: number): string =>
  i18n.translate('sideNavigation.navCountBadges.alertRatioTooltip', {
    defaultMessage:
      '{alerting, plural, one {# resource} other {# resources}} with active alerts out of {total, number} — click to filter by alerts',
    values: { alerting, total },
  });

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

const badgeButtonStyles = css`
  cursor: pointer;
`;

export const NavCountBadges = ({
  inventoryCount,
  notificationCount,
  notificationHref,
}: {
  inventoryCount?: number;
  notificationCount?: number;
  notificationHref?: string;
}): JSX.Element | null => {
  const hasInventory =
    typeof inventoryCount === 'number' && Number.isFinite(inventoryCount);
  const alerting =
    typeof notificationCount === 'number' &&
    Number.isFinite(notificationCount) &&
    notificationCount > 0
      ? notificationCount
      : 0;
  const showAlertRatio = alerting > 0 && hasInventory;
  const showInventoryOnly = hasInventory && !showAlertRatio;

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

  if (!showAlertRatio && !showInventoryOnly) {
    return null;
  }

  if (showAlertRatio) {
    const label = alertRatioLabel(alerting, inventoryCount!);
    const tooltip = alertRatioTooltip(alerting, inventoryCount!);
    const badge = (
      <EuiBadge color="danger" data-test-subj="sideNavAlertRatioBadge">
        {label}
      </EuiBadge>
    );

    if (notificationHref) {
      return (
        <EuiToolTip content={tooltip} disableScreenReaderOutput>
          <button
            type="button"
            css={[alertDotHitTargetStyles, badgeButtonStyles]}
            aria-label={tooltip}
            onClick={onAlertIndicatorClick}
            onMouseDown={stopNavRowActivation}
          >
            {badge}
          </button>
        </EuiToolTip>
      );
    }

    return (
      <EuiToolTip content={tooltip}>
        <span css={alertDotHitTargetStyles} aria-label={tooltip}>
          {badge}
        </span>
      </EuiToolTip>
    );
  }

  const total = inventoryCount!;
  const tooltip = inventoryTooltip(total);
  return (
    <EuiToolTip content={tooltip}>
      <span css={css({ flexShrink: 0, lineHeight: 0 })} aria-label={tooltip}>
        <EuiBadge color="hollow" data-test-subj="sideNavInventoryCountBadge">
          {formatNavCount(total)}
        </EuiBadge>
      </span>
    </EuiToolTip>
  );
};
