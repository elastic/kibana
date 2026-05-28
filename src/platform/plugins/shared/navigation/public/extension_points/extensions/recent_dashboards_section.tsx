/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EMPTY } from 'rxjs';
import React, { useMemo } from 'react';
import { EuiListGroup, EuiListGroupItem, EuiSkeletonText } from '@elastic/eui';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import type { SecondaryNavExtensionPointContext } from '@kbn/ui-side-navigation';

const MAX_RECENT_DASHBOARDS = 5;

export const RecentDashboardsSection = ({
  activeItemId,
}: SecondaryNavExtensionPointContext): React.ReactElement | null => {
  const chrome = useChromeService();

  const recentlyAccessed$ = useMemo(() => chrome?.recentlyAccessed.get$(), [chrome]);
  const recentlyAccessed = useObservable(recentlyAccessed$ ?? EMPTY, []);

  const recentDashboards = useMemo(
    () =>
      recentlyAccessed
        .filter((item) => item.link.startsWith('/app/dashboards'))
        .slice(0, MAX_RECENT_DASHBOARDS),
    [recentlyAccessed]
  );

  if (recentDashboards.length === 0) {
    return null;
  }

  return (
    <EuiSkeletonText
      lines={MAX_RECENT_DASHBOARDS}
      size="s"
      isLoading={recentDashboards.length === 0}
      contentAriaLabel="Demo skeleton text"
    >
      <EuiListGroup>
        {recentDashboards.map((dashboard) => {
          const itemId = `recent-${dashboard.id}`;

          return (
            <EuiListGroupItem
              key={dashboard.id}
              label={dashboard.label}
              /* TODO: Add basePath prepend */
              href={dashboard.link}
              aria-current={activeItemId === itemId ? 'page' : undefined}
              data-test-subj={`nav-item-recent-dashboard-${dashboard.id}`}
            />
          );
        })}
      </EuiListGroup>
    </EuiSkeletonText>
  );
};
