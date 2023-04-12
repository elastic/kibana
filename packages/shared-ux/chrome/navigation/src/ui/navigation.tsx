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
  EuiHeaderLogo,
  EuiLoadingSpinner,
  EuiSideNavItemType,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { NavigationProps } from '../../types';
import { NavigationModel } from '../model';
import { useNavigation } from '../services';
import { ElasticMark } from './elastic_mark';
import './header_logo.scss';
import { NavigationBucket } from './navigation_bucket';

export const Navigation = (props: NavigationProps) => {
  // const { euiTheme } = useEuiTheme();
  // const { fontSize: navSectionFontSize } = useEuiFontSize('m');
  // const { fontSize: navItemFontSize } = useEuiFontSize('s');

  const {
    recentItems: recentItemsFromService,
    loadingCount,
    activeNavItemId,
    ...services
  } = useNavigation();
  const { euiTheme } = useEuiTheme();

  let recentItems: Array<EuiSideNavItemType<unknown>> | undefined;
  if (recentItemsFromService) {
    recentItems = [
      {
        name: '',
        id: 'recent_items_root',
        items: recentItemsFromService.map((item) => ({
          id: item.id,
          name: item.label,
          onClick: () => {
            // FIXME not implemented
            // console.log(`Go to ${item.link}`);
          },
        })),
      },
    ];
  }

  const activeNav = activeNavItemId ?? props.activeNavItemId;

  const nav = new NavigationModel(
    services,
    recentItems,
    props.platformConfig,
    props.solutions,
    activeNav
  );

  const recent = nav.getRecent();
  const solutions = nav.getSolutions();
  const { analytics, ml, devTools, management } = nav.getPlatform();

  const NavHeader = () => {
    const homeUrl = services.basePath.prepend(props.homeHref);
    const navigateHome = (event: React.MouseEvent) => {
      event.preventDefault();
      services.navigateToUrl(homeUrl);
    };
    const logo =
      loadingCount === 0 ? (
        <EuiHeaderLogo iconType="logoElastic" aria-label="Go to home page" />
      ) : (
        <EuiLoadingSpinner size="l" aria-hidden={false} onClick={navigateHome} />
      );

    return (
      <>
        <a href={homeUrl} onClick={navigateHome}>
          {logo}
        </a>
        {services.navIsOpen ? (
          <ElasticMark className="chrHeaderLogo__mark" aria-hidden={true} />
        ) : null}
      </>
    );
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="none" style={{ overflowY: 'auto' }}>
      <EuiFlexItem grow={false}>
        <EuiCollapsibleNavGroup
          css={{ background: euiTheme.colors.darkestShade, height: '50px' }}
          data-test-subj="nav-header-logo"
        >
          <NavHeader />
        </EuiCollapsibleNavGroup>

        {recentItems ? <NavigationBucket {...recent} /> : null}

        {solutions.map((solutionBucket, idx) => {
          return <NavigationBucket {...solutionBucket} key={`solution${idx}`} />;
        })}

        {nav.isEnabled('analytics') ? <NavigationBucket {...analytics} /> : null}
        {nav.isEnabled('ml') ? <NavigationBucket {...ml} /> : null}
      </EuiFlexItem>

      <EuiFlexItem grow={true}>
        <EuiSpacer />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {nav.isEnabled('devTools') ? <NavigationBucket {...devTools} /> : null}
        {nav.isEnabled('management') ? <NavigationBucket {...management} /> : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
