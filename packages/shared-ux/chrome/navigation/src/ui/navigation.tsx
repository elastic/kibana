/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useObservable from 'react-use/lib/useObservable';
import {
  EuiCollapsibleNavGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderLogo,
  EuiLink,
  EuiLoadingSpinner,
  EuiSideNav,
  EuiSideNavItemType,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { getI18nStrings } from './i18n_strings';
import { NavigationBucketProps, NavigationProps } from '../../types';
import { NavigationModel } from '../model';
import { useNavigation } from '../services';
import { navigationStyles as styles } from '../styles';
import { ElasticMark } from './elastic_mark';
import './header_logo.scss';
import { NavigationBucket } from './navigation_bucket';

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

  const strings = getI18nStrings();

  const NavHeader = () => {
    const loadingCount = useObservable(observables.loadingCount$, 0);
    const homeUrl = basePath.prepend(props.homeHref);
    const navigateHome = (event: React.MouseEvent) => {
      event.preventDefault();
      navigateToUrl(homeUrl);
    };
    const logo =
      loadingCount === 0 ? (
        <EuiHeaderLogo
          iconType="logoElastic"
          aria-label={strings.headerLogoAriaLabel}
          onClick={navigateHome}
          data-test-subj="nav-header-logo"
        />
      ) : (
        <a href={homeUrl} onClick={navigateHome}>
          <EuiLoadingSpinner
            size="l"
            aria-hidden={false}
            onClick={navigateHome}
            data-test-subj="nav-header-loading-spinner"
          />
        </a>
      );

    return (
      <>
        {logo}
        {navIsOpen ? <ElasticMark className="chrHeaderLogo__mark" aria-hidden={true} /> : null}
      </>
    );
  };

  const LinkToCloud = () => {
    switch (props.linkToCloud) {
      case 'projects':
        return (
          <EuiLink
            href="https://cloud.elastic.co/projects"
            color="text"
            data-test-subj="nav-header-link-to-projects"
          >
            <EuiCollapsibleNavGroup iconType="spaces" title={strings.linkToCloudProjects} />
          </EuiLink>
        );
      case 'deployments':
        return (
          <EuiLink
            href="https://cloud.elastic.co/deployments"
            color="text"
            data-test-subj="nav-header-link-to-deployments"
          >
            <EuiCollapsibleNavGroup iconType="spaces" title={strings.linkToCloudDeployments} />
          </EuiLink>
        );
      default:
        return null;
    }
  };

  const RecentlyAccessed = () => {
    const recentlyAccessed = useObservable(observables.recentlyAccessed$, []);

    const navItems: Array<EuiSideNavItemType<unknown>> = [
      {
        name: '',
        id: 'recents_root',
        items: recentlyAccessed.map((item) => ({
          ...item,
          name: item.label,
          href: item.link,
        })),
      },
    ];

    return (
      <EuiCollapsibleNavGroup
        title={strings.recentlyAccessed}
        iconType="clock"
        isCollapsible={true}
        initialIsOpen={recentlyAccessed.length > 0}
        data-test-subj={`nav-bucket-recentlyAccessed`}
      >
        <EuiSideNav items={navItems} css={styles.euiSideNavItems} />
      </EuiCollapsibleNavGroup>
    );
  };

  // higher-order-component to keep the common props DRY
  const NavigationBucketHoc = (outerProps: Omit<NavigationBucketProps, 'activeNavItemId'>) => (
    <NavigationBucket {...outerProps} activeNavItemId={activeNav} />
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="none" style={{ overflowY: 'auto' }}>
      <EuiFlexItem grow={false}>
        <EuiCollapsibleNavGroup css={{ background: euiTheme.colors.darkestShade, height: '50px' }}>
          <NavHeader />
        </EuiCollapsibleNavGroup>

        <LinkToCloud />

        <RecentlyAccessed />

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
