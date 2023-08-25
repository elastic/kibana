/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCollapsibleNavGroup, EuiSideNav, EuiSideNavItemType } from '@elastic/eui';
import React, { FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';

import { RecentItem } from '../../../types/internal';
import { useNavigation as useServices } from '../../services';

import { getI18nStrings } from '../i18n_strings';

export interface Props {
  /**
   * Optional observable for recently accessed items. If not provided, the
   * recently items from the Chrome service will be used.
   */
  recentlyAccessed$?: Observable<RecentItem[]>;
  /**
   * If true, the recently accessed list will be collapsed by default.
   * @default false
   */
  defaultIsCollapsed?: boolean;
}

export const RecentlyAccessed: FC<Props> = ({
  recentlyAccessed$: recentlyAccessedProp$,
  defaultIsCollapsed = false,
}) => {
  const strings = getI18nStrings();
  const { recentlyAccessed$, basePath, navigateToUrl } = useServices();
  const recentlyAccessed = useObservable(recentlyAccessedProp$ ?? recentlyAccessed$, []);

  if (recentlyAccessed.length === 0) {
    return null;
  }

  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      name: '', // no list header title
      id: 'recents_root',
      items: recentlyAccessed.map((recent) => {
        const { id, label, link } = recent;
        const href = basePath.prepend(link);

        return {
          id,
          name: label,
          href,
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
            navigateToUrl(href);
          },
        };
      }),
    },
  ];

  return (
    <EuiCollapsibleNavGroup
      title={strings.recentlyAccessed}
      iconType="clock"
      isCollapsible={true}
      initialIsOpen={!defaultIsCollapsed}
      data-test-subj={`nav-bucket-recentlyAccessed`}
    >
      <EuiSideNav items={navItems} mobileBreakpoints={/* turn off responsive behavior */ []} />
    </EuiCollapsibleNavGroup>
  );
};
