/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { groupBy, sortBy } from 'lodash';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import { EuiNavDrawer, EuiHorizontalRule, EuiNavDrawerGroup } from '@elastic/eui';
import { NavSetting, OnIsLockedUpdate } from './';
import { ChromeNavLink, ChromeRecentlyAccessedHistoryItem } from '../../..';
import { AppCategory } from '../../../../types';
import { HttpStart } from '../../../http';
import { NavLink } from './nav_link';
import { RecentLinks } from './recent_links';

function getAllCategories(allCategorizedLinks: Record<string, NavLink[]>) {
  const allCategories = {} as Record<string, AppCategory | undefined>;

  for (const [key, value] of Object.entries(allCategorizedLinks)) {
    allCategories[key] = value[0].category;
  }

  return allCategories;
}

function getOrderedCategories(
  mainCategories: Record<string, NavLink[]>,
  categoryDictionary: ReturnType<typeof getAllCategories>
) {
  return sortBy(
    Object.keys(mainCategories),
    categoryName => categoryDictionary[categoryName]?.order
  );
}

export interface Props {
  navSetting: NavSetting;
  isLocked?: boolean;
  onIsLockedUpdate?: OnIsLockedUpdate;
  navLinks: NavLink[];
  chromeNavLinks: ChromeNavLink[];
  recentlyAccessedItems: ChromeRecentlyAccessedHistoryItem[];
  basePath: HttpStart['basePath'];
}

function navDrawerRenderer(
  {
    navSetting,
    isLocked,
    onIsLockedUpdate,
    navLinks,
    chromeNavLinks,
    recentlyAccessedItems,
    basePath,
  }: Props,
  ref: React.Ref<HTMLElement>
) {
  const disableGroupedNavSetting = navSetting === 'individual';
  const groupedNavLinks = groupBy(navLinks, link => link?.category?.label);
  const { undefined: unknowns, ...allCategorizedLinks } = groupedNavLinks;
  const { Management: management, ...mainCategories } = allCategorizedLinks;
  const categoryDictionary = getAllCategories(allCategorizedLinks);
  const orderedCategories = getOrderedCategories(mainCategories, categoryDictionary);
  const showUngroupedNav =
    disableGroupedNavSetting || navLinks.length < 7 || Object.keys(mainCategories).length === 1;

  return (
    <EuiNavDrawer
      ref={ref}
      data-test-subj="navDrawer"
      isLocked={isLocked}
      onIsLockedUpdate={onIsLockedUpdate}
      aria-label={i18n.translate('core.ui.primaryNav.screenReaderLabel', {
        defaultMessage: 'Primary',
      })}
    >
      {RecentLinks({
        recentlyAccessedItems,
        navLinks: chromeNavLinks,
        basePath,
      })}
      <EuiHorizontalRule margin="none" />
      {showUngroupedNav ? (
        <EuiNavDrawerGroup
          data-test-subj="navDrawerAppsMenu"
          listItems={navLinks}
          aria-label={i18n.translate('core.ui.primaryNavList.screenReaderLabel', {
            defaultMessage: 'Primary navigation links',
          })}
        />
      ) : (
        <>
          <EuiNavDrawerGroup
            data-test-subj="navDrawerAppsMenu"
            aria-label={i18n.translate('core.ui.primaryNavList.screenReaderLabel', {
              defaultMessage: 'Primary navigation links',
            })}
            listItems={[
              ...orderedCategories.map(categoryName => {
                const category = categoryDictionary[categoryName]!;
                const links = mainCategories[categoryName];

                if (links.length === 1) {
                  return {
                    ...links[0],
                    label: category.label,
                    iconType: category.euiIconType || links[0].iconType,
                  };
                }

                return {
                  'data-test-subj': 'navDrawerCategory',
                  iconType: category.euiIconType,
                  label: category.label,
                  flyoutMenu: {
                    title: category.label,
                    listItems: sortBy(links, 'order').map(link => {
                      link['data-test-subj'] = 'navDrawerFlyoutLink';
                      return link;
                    }),
                  },
                };
              }),
              ...sortBy(unknowns, 'order'),
            ]}
          />
          <EuiHorizontalRule margin="none" />
          <EuiNavDrawerGroup
            data-test-subj="navDrawerManagementMenu"
            aria-label={i18n.translate('core.ui.managementNavList.screenReaderLabel', {
              defaultMessage: 'Management navigation links',
            })}
            listItems={[
              {
                label: categoryDictionary.Management!.label,
                iconType: categoryDictionary.Management!.euiIconType,
                'data-test-subj': 'navDrawerCategory',
                flyoutMenu: {
                  title: categoryDictionary.Management!.label,
                  listItems: sortBy(management, 'order').map(link => {
                    link['data-test-subj'] = 'navDrawerFlyoutLink';
                    return link;
                  }),
                },
              },
            ]}
          />
        </>
      )}
    </EuiNavDrawer>
  );
}

export const NavDrawer = React.forwardRef(navDrawerRenderer);
