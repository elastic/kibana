/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCollapsibleNavGroup, EuiIcon, EuiSideNav } from '@elastic/eui';
import React from 'react';
import { NavigationBucketProps } from '../../types';
import { useNavigation } from '../services';
import { navigationStyles as styles } from '../styles';

export const NavigationBucket = (opts: NavigationBucketProps) => {
  const { id, items, activeNavItemId, ...props } = opts;
  const { navIsOpen } = useNavigation();

  if (navIsOpen) {
    return (
      <EuiCollapsibleNavGroup
        id={id}
        title={props.name}
        iconType={props.icon}
        isCollapsible={true}
        initialIsOpen={activeNavItemId?.startsWith(id + '.')}
        data-test-subj={`nav-bucket-${id}`}
      >
        <EuiSideNav items={items} css={styles.euiSideNavItems} />
      </EuiCollapsibleNavGroup>
    );
  }

  return (
    <div>
      <EuiIcon type={props.icon ?? 'empty'} size="l" />
      <hr />
    </div>
  );
};
