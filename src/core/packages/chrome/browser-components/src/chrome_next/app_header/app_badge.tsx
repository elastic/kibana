/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { ChromeNextHeaderBadge } from '@kbn/core-chrome-browser/src';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const useBadgeStyle = () => {
  return useMemo(() => {
    const badge = css`
      max-width: 200px;
    `;

    return { badge };
  }, []);
};

export const AppBadge = ({ badge }: { badge: ChromeNextHeaderBadge }) => {
  const { badge: badgeStyle } = useBadgeStyle();

  // @ts-expect-error supported for backward compatibility. TODO: Remove it
  if (badge?.renderCustomBadge) {
    // @ts-expect-error supported for backward compatibility. TODO: Remove it
    return badge.renderCustomBadge({ badgeText: badge.label });
  }

  const badgeOnClickAriaLabel =
    badge?.onClickAriaLabel ??
    i18n.translate('core.ui.chrome.appHeader.badge.ariaLabel', {
      defaultMessage: 'Click {label} badge',
      values: { label: badge.label },
    });

  const handleBadgeClick = () => {
    if (badge?.onClick) {
      badge.onClick();
    }
  };

  const badgeComponent = (
    <EuiBadge
      onClick={handleBadgeClick}
      onClickAriaLabel={badgeOnClickAriaLabel}
      color={badge?.color ?? 'hollow'}
      data-test-subj={badge?.['data-test-subj']}
      css={badgeStyle}
    >
      {badge.label}
    </EuiBadge>
  );

  if (badge?.tooltip) {
    return <EuiToolTip content={badge.tooltip}>{badgeComponent}</EuiToolTip>;
  }

  return badgeComponent;
};

AppBadge.displayName = 'AppBadge';
