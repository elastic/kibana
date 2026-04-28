/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBack, AppHeaderBadge } from '@kbn/app-header';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getReadOnlyBadge } from '../../application/discover_router';

const chromeBadgeToHeaderBadge = (badge: {
  badgeText: string;
  color?: string;
  toolTipProps?: { content?: string | React.ReactNode };
  'data-test-subj'?: string;
}): AppHeaderBadge => ({
  label: badge.badgeText,
  color: badge.color as AppHeaderBadge['color'],
  tooltip: badge.toolTipProps?.content as string | undefined,
  'data-test-subj': badge['data-test-subj'] as string | undefined,
});

export interface DiscoverAppHeaderProps {
  title: string;
  back?: AppHeaderBack;
  appMenu?: AppMenuConfig;
  badges?: AppHeaderBadge[];
}

export const DiscoverAppHeader: React.FC<DiscoverAppHeaderProps> = ({
  title,
  back,
  appMenu,
  badges: extraBadges,
}) => {
  const { capabilities } = useDiscoverServices();

  const badges = useMemo(() => {
    const result: AppHeaderBadge[] = [];

    const readOnlyBadge = getReadOnlyBadge({ capabilities });
    if (readOnlyBadge) {
      result.push(chromeBadgeToHeaderBadge(readOnlyBadge));
    }

    if (extraBadges) {
      result.push(...extraBadges);
    }

    return result.length > 0 ? result : undefined;
  }, [capabilities, extraBadges]);

  return (
    <AppHeader
      title={title}
      back={back}
      menu={appMenu}
      badges={badges}
      fallback={null}
      sticky
    />
  );
};
