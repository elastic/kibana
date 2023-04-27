/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCollapsibleNavGroup, EuiSideNav, EuiSideNavItemType } from '@elastic/eui';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { NavigationProps, NavigationServices } from '../../../types';
import { getI18nStrings } from '../../i18n_strings';
import { navigationStyles as styles } from '../../styles';

interface Props {
  recentlyAccessed$: Observable<RecentItem[]>;
}

export const RecentlyAccessed = (props: Props) => {
  const strings = getI18nStrings();
  const recentlyAccessed = useObservable(props.recentlyAccessed$, []);
  if (recentlyAccessed.length > 0) {
    const navItems: Array<EuiSideNavItemType<unknown>> = [
      {
        name: '', // no list header title
        id: 'recents_root',
        items: recentlyAccessed.map(({ id, label, link }) => ({
          id,
          name: label,
          href: link,
        })),
      },
    ];

    return (
      <EuiCollapsibleNavGroup
        title={strings.recentlyAccessed}
        iconType="clock"
        isCollapsible={true}
        initialIsOpen={true}
        data-test-subj={`nav-bucket-recentlyAccessed`}
      >
        <EuiSideNav items={navItems} css={styles.euiSideNavItems} />
      </EuiCollapsibleNavGroup>
    );
  }

  return null;
};
