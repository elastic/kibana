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
  EuiSideNavItemType,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { NavigationProps } from '../../types';
import { NavigationModel } from '../model';
import { useNavigation } from '../services';
import { getLocatorNavigation } from '../utils';
import { ElasticMark } from './elastic_mark';
import './header_logo.scss';
import { NavigationBucket } from './navigation_bucket';

export const Navigation = (props: NavigationProps) => {
  // const { euiTheme } = useEuiTheme();
  // const { fontSize: navSectionFontSize } = useEuiFontSize('m');
  // const { fontSize: navItemFontSize } = useEuiFontSize('s');
  const { getLocator, recentItems, navIsOpen } = useNavigation();

  const { euiTheme } = useEuiTheme();

  const locatorNavigation = getLocatorNavigation(getLocator);

  let euiSideNavRecentItems: Array<EuiSideNavItemType<unknown>> | undefined;
  if (recentItems) {
    euiSideNavRecentItems = [
      {
        name: '',
        id: 'recent_items_root',
        items: recentItems.map((item) => ({
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

  const nav = new NavigationModel(
    locatorNavigation,
    props.activeNavItemId,
    euiSideNavRecentItems,
    props.platformConfig,
    props.solutions
  );
  const recent = nav.getRecent();
  const solutions = nav.getSolutions();
  const { analytics, ml, devTools, management } = nav.getPlatform();

  return (
    <EuiFlexGroup direction="column" gutterSize="none" style={{ overflowY: 'auto' }}>
      <EuiFlexItem grow={false}>
        <EuiCollapsibleNavGroup
          css={{ background: euiTheme.colors.darkestShade }}
          data-test-subj="nav-header-logo"
        >
          <EuiHeaderLogo
            iconType="logoElastic"
            href="#"
            onClick={(e) => e.preventDefault()}
            aria-label="Go to home page"
          />
          {navIsOpen ? <ElasticMark className="chrHeaderLogo__mark" aria-hidden={true} /> : null}
        </EuiCollapsibleNavGroup>

        {euiSideNavRecentItems ? <NavigationBucket {...recent} /> : null}

        {solutions.map((solutionBucket, idx) => {
          return <NavigationBucket {...solutionBucket} key={`solution${idx}`} />;
        })}

        <NavigationBucket {...analytics} />
        <NavigationBucket {...ml} />
      </EuiFlexItem>

      <EuiFlexItem grow={true}>
        <EuiSpacer />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <NavigationBucket {...devTools} />
        <NavigationBucket {...management} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
