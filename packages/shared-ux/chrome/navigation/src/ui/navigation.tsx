/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiCollapsibleNavGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { NavigationBucketProps, NavigationProps } from '../../types';
import { NavigationModel } from '../model';
import { useNavigation } from '../services';
import { LinkToCloud, NavHeader, NavigationBucket, RecentlyAccessed } from './components';

export const Navigation = (props: NavigationProps) => {
  const { activeNavItemId, basePath, navIsOpen, navigateToUrl, ...observables } = useNavigation();
  const { euiTheme } = useEuiTheme();

  const activeNav = activeNavItemId ?? props.activeNavItemId;

  const nav = new NavigationModel(
    { basePath, navigateToUrl },
    props.platformConfig,
    props.solutions,
    activeNav
  );

  const solutions = nav.getSolutions();
  const { analytics, ml, devTools, management } = nav.getPlatform();

  // higher-order-component to keep the common props DRY
  const NavigationBucketHoc = (outerProps: Omit<NavigationBucketProps, 'activeNavItemId'>) => (
    <NavigationBucket {...outerProps} activeNavItemId={activeNav} />
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="none" style={{ overflowY: 'auto' }}>
      <EuiFlexItem grow={false}>
        <EuiCollapsibleNavGroup css={{ background: euiTheme.colors.darkestShade, height: '50px' }}>
          <NavHeader {...observables} {...props} {...{ basePath, navIsOpen, navigateToUrl }} />
        </EuiCollapsibleNavGroup>

        <LinkToCloud {...props} />

        <RecentlyAccessed {...observables} {...props} />

        {solutions.map((solutionBucket, idx) => {
          return <NavigationBucketHoc {...solutionBucket} key={`solution${idx}`} />;
        })}

        {nav.isEnabled('analytics') ? <NavigationBucketHoc {...analytics} /> : null}
        {nav.isEnabled('ml') ? <NavigationBucketHoc {...ml} /> : null}
      </EuiFlexItem>

      <EuiFlexItem grow={true}>
        <EuiSpacer />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {nav.isEnabled('devTools') ? <NavigationBucketHoc {...devTools} /> : null}
        {nav.isEnabled('management') ? <NavigationBucketHoc {...management} /> : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
