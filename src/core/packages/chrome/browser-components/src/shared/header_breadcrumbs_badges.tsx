/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import React, { Fragment } from 'react';

import type { EuiBadgeProps, EuiToolTipProps } from '@elastic/eui';
import { EuiBadge, EuiBadgeGroup, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export type HeaderBreadcrumbsBadgeProps = EuiBadgeProps & {
  badgeText: string;
  toolTipProps?: Partial<EuiToolTipProps>;
  renderCustomBadge?: (props: { badgeText: string }) => ReactElement;
};

export const HeaderBreadcrumbsBadges = ({
  badges,
  isFirst,
}: {
  badges: HeaderBreadcrumbsBadgeProps[] | undefined;
  isFirst: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  if (!badges || badges.length === 0) return null;
  return (
    <EuiBadgeGroup
      data-test-subj="header-breadcrumbs-badge-group"
      css={css`
        margin-left: ${isFirst ? euiTheme.size.xs : 0};
        align-items: center;
      `}
    >
      {badges.map(createBadge)}
    </EuiBadgeGroup>
  );
};

function createBadge(
  { badgeText, toolTipProps, renderCustomBadge, ...badgeProps }: HeaderBreadcrumbsBadgeProps,
  i: number
): ReactElement {
  const key = `breadcrumbs-badge-${i}`;

  const Badge = () => (
    <EuiBadge tabIndex={0} {...badgeProps}>
      {badgeText}
    </EuiBadge>
  );

  if (renderCustomBadge) {
    return <Fragment key={key}>{renderCustomBadge({ badgeText })}</Fragment>;
  }

  return toolTipProps ? (
    <EuiToolTip key={key} {...toolTipProps}>
      <Badge />
    </EuiToolTip>
  ) : (
    <Badge key={key} />
  );
}
