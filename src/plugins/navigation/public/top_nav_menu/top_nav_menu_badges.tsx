/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiBadgeGroup, EuiToolTip, EuiBadgeProps, EuiToolTipProps } from '@elastic/eui';
import React, { Fragment, ReactElement } from 'react';

export type TopNavMenuBadgeProps = EuiBadgeProps & {
  badgeText: string;
  toolTipProps?: Partial<EuiToolTipProps>;
  renderCustomBadge?: (props: { badgeText: string }) => ReactElement;
};

export const TopNavMenuBadges = ({ badges }: { badges: TopNavMenuBadgeProps[] | undefined }) => {
  if (!badges || badges.length === 0) return null;
  return (
    <EuiBadgeGroup className="kbnTopNavMenu__badgeGroup">{badges.map(createBadge)}</EuiBadgeGroup>
  );
};

function createBadge(
  { badgeText, toolTipProps, renderCustomBadge, ...badgeProps }: TopNavMenuBadgeProps,
  i: number
): ReactElement {
  const key = `nav-menu-badge-${i}`;

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
