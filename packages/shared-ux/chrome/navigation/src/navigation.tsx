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
  EuiIcon,
  EuiSideNav,
  EuiSideNavItemType,
  EuiSpacer,
  IconType,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import {
  ANALYTICS_SECTION_KEY,
  DEVTOOLS_SECTION_KEY,
  MANAGEMENT_SECTION_KEY,
  ML_SECTION_KEY,
  RECENTS_SECTION_KEY,
} from '../constants';
import { ILocatorDefinition, NavigationProps, NavItemProps, RecentItem } from '../types';
import { ElasticMark } from './elastic_mark';
import './header_logo.scss';
import { navItems } from './nav_items';
import { useNavigation } from './services';

export const Navigation = (props: NavigationProps) => {
  // const { euiTheme } = useEuiTheme();
  // const { fontSize: navSectionFontSize } = useEuiFontSize('m');
  // const { fontSize: navItemFontSize } = useEuiFontSize('s');
  const { getLocator, navIsOpen, recentItems } = useNavigation();

  const { euiTheme } = useEuiTheme();

  const locatorNavigation = (locator: ILocatorDefinition | undefined) => () => {
    if (locator) {
      const locatorInstance = getLocator(locator.id);

      if (!locatorInstance) {
        throw new Error(`Unresolved Locator instance for ${locator.id}`);
      }

      if (locator.params) {
        locatorInstance.navigateSync(locator.params);
      }
    }
  };

  // implement onClick using item's locator params
  const convertSolutionNavItemsToEuiSideNavItems = (items: NavItemProps[]) => {
    return items.map((item) => {
      const navItem: EuiSideNavItemType<unknown> = { ...item };
      if (item.locator) {
        navItem.onClick = locatorNavigation(item.locator);
      }
      if (item.items) {
        // recurse
        navItem.items = convertSolutionNavItemsToEuiSideNavItems(item.items);
      }
      return navItem;
    });
  };

  // implement "name" from item's label and onClick using item's "link"
  const convertRecentItemsToEuiSideNavItems = (items: RecentItem[]) => [
    {
      name: '',
      id: 'recent_items_root',
      items: items.map((item) => ({
        id: item.id,
        name: item.label,
        onClick: () => {
          // FIXME not implemented
          // console.log(`Go to ${item.link}`);
        },
      })),
    },
  ];

  const renderBucket = (
    iconType: IconType,
    title: React.ReactNode,
    items: NavItemProps[],
    bucketKey: keyof NavigationProps['sections'] | undefined,
    solutionKey?: string
  ) => {
    // ability to turn off bucket completely with {[bucketKey]: { enabled: false }}
    if (bucketKey && props.sections?.[bucketKey]?.enabled === false) {
      return null;
    }

    if (navIsOpen) {
      return (
        <EuiCollapsibleNavGroup
          title={title}
          iconType={iconType}
          isCollapsible={true}
          initialIsOpen={isOpen(bucketKey ?? solutionKey)}
        >
          <EuiSideNav items={items} style={{ paddingLeft: '45px' }} />
        </EuiCollapsibleNavGroup>
      );
    }

    return (
      <div>
        <EuiIcon type={iconType ?? 'empty'} size="l" />
        <hr />
      </div>
    );
  };

  const isOpen = (sectionId?: string) => {
    return sectionId ? props.initiallyOpenSections?.includes(sectionId) : false;
  };

  const {
    id,
    title: { icon, name },
  } = props;

  let euiSideNavRecentItems: Array<EuiSideNavItemType<unknown>> | undefined;
  if (recentItems) {
    euiSideNavRecentItems = convertRecentItemsToEuiSideNavItems(recentItems);
  }

  const euiSideNavSolutionItems = props.items
    ? convertSolutionNavItemsToEuiSideNavItems(props.items)
    : [];

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiCollapsibleNavGroup css={{ background: euiTheme.colors.darkestShade }}>
            <EuiHeaderLogo
              iconType="logoElastic"
              href="#"
              onClick={(e) => e.preventDefault()}
              aria-label="Go to home page"
            />

            {navIsOpen ? <ElasticMark className="chrHeaderLogo__mark" aria-hidden={true} /> : null}
          </EuiCollapsibleNavGroup>
          {euiSideNavRecentItems
            ? renderBucket('clock', 'Recent', euiSideNavRecentItems, RECENTS_SECTION_KEY)
            : null}
          {renderBucket(icon, name, euiSideNavSolutionItems, undefined, id)}
          {renderBucket(
            'stats',
            'Data exploration',
            navItems.dataExploration,
            ANALYTICS_SECTION_KEY
          )}
          {renderBucket(
            'indexMapping',
            'Machine learning',
            navItems.machineLearning,
            ML_SECTION_KEY
          )}
        </EuiFlexItem>

        <EuiFlexItem grow={true}>
          <EuiSpacer />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          {renderBucket(
            'editorCodeBlock',
            'Developer tools',
            navItems.devTools,
            DEVTOOLS_SECTION_KEY
          )}
          {renderBucket('gear', 'Management', navItems.management, MANAGEMENT_SECTION_KEY)}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
