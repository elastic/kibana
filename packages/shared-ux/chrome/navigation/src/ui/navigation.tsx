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
  EuiLink,
  EuiLoadingSpinner,
  EuiSideNav,
  EuiSideNavItemType,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { ChromeNavigationViewModel } from '../../types';
import { NavigationModel } from '../model';
import { useNavigation } from '../services';
import { navigationStyles as styles } from '../styles';
import { ElasticMark } from './elastic_mark';
import './header_logo.scss';
import { getI18nStrings } from './i18n_strings';
import { NavigationBucket, type Props as NavigationBucketProps } from './navigation_bucket';

interface Props extends ChromeNavigationViewModel {
  /**
   * ID of sections to highlight
   */
  activeNavItemId?: string;
  dataTestSubj?: string; // optional test subject for the navigation
}

export const Navigation = ({
  platformConfig,
  navigationTree,
  homeHref,
  linkToCloud,
  activeNavItemId: activeNavItemIdProps,
  ...props
}: Props) => {
  const { activeNavItemId } = useNavigation();
  const { euiTheme } = useEuiTheme();

  const activeNav = activeNavItemId ?? activeNavItemIdProps;

  const nav = new NavigationModel(platformConfig, navigationTree);

  const solutions = nav.getSolutions();
  const { analytics, ml, devTools, management } = nav.getPlatform();

  const strings = getI18nStrings();

  const NavHeader = () => {
    const { basePath, navIsOpen, navigateToUrl, loadingCount$ } = useNavigation();
    const loadingCount = useObservable(loadingCount$, 0);
    const homeUrl = basePath.prepend(homeHref);
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
    switch (linkToCloud) {
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
    const { recentlyAccessed$ } = useNavigation();
    const recentlyAccessed = useObservable(recentlyAccessed$, []);

    // consumer may filter objects from recent that are not applicable to the project
    let filteredRecent = recentlyAccessed;
    if (props.recentlyAccessedFilter) {
      filteredRecent = props.recentlyAccessedFilter(recentlyAccessed);
    }

    if (filteredRecent.length > 0) {
      const navItems: Array<EuiSideNavItemType<unknown>> = [
        {
          name: '', // no list header title
          id: 'recents_root',
          items: filteredRecent.map(({ id, label, link }) => ({
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

  // higher-order-component to keep the common props DRY
  const NavigationBucketHoc = (outerProps: Omit<NavigationBucketProps, 'activeNavItemId'>) => (
    <NavigationBucket {...outerProps} activeNavItemId={activeNav} />
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      style={{ overflowY: 'auto' }}
      data-test-subj={props.dataTestSubj}
    >
      <EuiFlexItem grow={false}>
        <EuiCollapsibleNavGroup css={{ background: euiTheme.colors.darkestShade, height: '50px' }}>
          <NavHeader />
        </EuiCollapsibleNavGroup>

        <LinkToCloud />

        <RecentlyAccessed />

        {solutions.map((navTree, idx) => {
          return <NavigationBucketHoc navigationTree={navTree} key={`solution${idx}`} />;
        })}

        {nav.isEnabled('analytics') ? <NavigationBucketHoc navigationTree={analytics} /> : null}
        {nav.isEnabled('ml') ? <NavigationBucketHoc navigationTree={ml} /> : null}
      </EuiFlexItem>

      <EuiFlexItem grow={true}>
        <EuiSpacer />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {nav.isEnabled('devTools') ? <NavigationBucketHoc navigationTree={devTools} /> : null}
        {nav.isEnabled('management') ? <NavigationBucketHoc navigationTree={management} /> : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
