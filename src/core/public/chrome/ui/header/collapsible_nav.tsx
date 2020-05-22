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

import {
  EuiCollapsibleNav,
  EuiCollapsibleNavGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiListGroup,
  EuiListGroupItem,
  EuiShowFor,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { groupBy, sortBy } from 'lodash';
import React, { useRef } from 'react';
import { AppCategory } from '../../../../types';
import { OnIsLockedUpdate } from './';
import { NavLink, RecentNavLink } from './nav_link';

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
    (categoryName) => categoryDictionary[categoryName]?.order
  );
}

function getCategoryLocalStorageKey(id: string) {
  return `core.navGroup.${id}`;
}

function getIsCategoryOpen(id: string, storage: Storage) {
  const value = storage.getItem(getCategoryLocalStorageKey(id)) ?? 'true';

  return value === 'true';
}

function setIsCategoryOpen(id: string, isOpen: boolean, storage: Storage) {
  storage.setItem(getCategoryLocalStorageKey(id), `${isOpen}`);
}

interface Props {
  isLocked: boolean;
  isOpen: boolean;
  navLinks: NavLink[];
  recentNavLinks: RecentNavLink[];
  homeHref: string;
  id: string;
  storage?: Storage;
  onIsLockedUpdate: OnIsLockedUpdate;
  onIsOpenUpdate: (isOpen?: boolean) => void;
  navigateToApp: (appId: string) => void;
}

export function CollapsibleNav({
  isLocked,
  isOpen,
  navLinks,
  recentNavLinks,
  onIsLockedUpdate,
  onIsOpenUpdate,
  homeHref,
  id,
  navigateToApp,
  storage = window.localStorage,
}: Props) {
  const lockRef = useRef<HTMLButtonElement>(null);
  const groupedNavLinks = groupBy(navLinks, (link) => link?.category?.id);
  const { undefined: unknowns = [], ...allCategorizedLinks } = groupedNavLinks;
  const categoryDictionary = getAllCategories(allCategorizedLinks);
  const orderedCategories = getOrderedCategories(allCategorizedLinks, categoryDictionary);

  return (
    <EuiCollapsibleNav
      data-test-subj="collapsibleNav"
      id={id}
      aria-label={i18n.translate('core.ui.primaryNav.screenReaderLabel', {
        defaultMessage: 'Primary',
      })}
      isOpen={isOpen}
      isDocked={isLocked}
      onClose={onIsOpenUpdate}
    >
      {/* Pinned items */}
      <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
        <EuiCollapsibleNavGroup
          background="light"
          className="eui-yScroll"
          style={{ maxHeight: '40vh' }}
        >
          <EuiListGroup
            aria-label={i18n.translate('core.ui.primaryNav.pinnedLinksAriaLabel', {
              defaultMessage: 'Pinned links',
            })}
            listItems={[
              {
                label: 'Home',
                iconType: 'home',
                href: homeHref,
                onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                  onIsOpenUpdate(false);
                  if (
                    event.isDefaultPrevented() ||
                    event.altKey ||
                    event.metaKey ||
                    event.ctrlKey
                  ) {
                    return;
                  }
                  event.preventDefault();
                  navigateToApp('home');
                },
              },
            ]}
            maxWidth="none"
            color="text"
            gutterSize="none"
            size="s"
          />
        </EuiCollapsibleNavGroup>
      </EuiFlexItem>

      {/* Recently viewed */}
      <EuiCollapsibleNavGroup
        key="recentlyViewed"
        background="light"
        title={i18n.translate('core.ui.recentlyViewed', { defaultMessage: 'Recently viewed' })}
        isCollapsible={true}
        initialIsOpen={getIsCategoryOpen('recentlyViewed', storage)}
        onToggle={(isCategoryOpen) => setIsCategoryOpen('recentlyViewed', isCategoryOpen, storage)}
        data-test-subj="collapsibleNavGroup-recentlyViewed"
      >
        {recentNavLinks.length > 0 ? (
          <EuiListGroup
            aria-label={i18n.translate('core.ui.recentlyViewedAriaLabel', {
              defaultMessage: 'Recently viewed links',
            })}
            // TODO #64541
            // Can remove icon from recent links completely
            listItems={recentNavLinks.map(({ iconType, onClick = () => {}, ...link }) => ({
              'data-test-subj': 'collapsibleNavAppLink--recent',
              onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                onIsOpenUpdate(false);
                onClick(e);
              },
              ...link,
            }))}
            maxWidth="none"
            color="subdued"
            gutterSize="none"
            size="s"
            className="kbnCollapsibleNav__recentsListGroup"
          />
        ) : (
          <EuiText size="s" color="subdued" style={{ padding: '0 8px 8px' }}>
            <p>
              {i18n.translate('core.ui.EmptyRecentlyViewed', {
                defaultMessage: 'No recently viewed items',
              })}
            </p>
          </EuiText>
        )}
      </EuiCollapsibleNavGroup>

      <EuiHorizontalRule margin="none" />

      <EuiFlexItem className="eui-yScroll">
        {/* Kibana, Observability, Security, and Management sections */}
        {orderedCategories.map((categoryName, i) => {
          const category = categoryDictionary[categoryName]!;
          const links = allCategorizedLinks[categoryName].map(
            ({ label, href, isActive, isDisabled, onClick }) => ({
              label,
              href,
              isActive,
              isDisabled,
              'data-test-subj': 'collapsibleNavAppLink',
              onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                onIsOpenUpdate(false);
                onClick(e);
              },
            })
          );

          return (
            <EuiCollapsibleNavGroup
              key={category.id}
              iconType={category.euiIconType}
              title={category.label}
              isCollapsible={true}
              initialIsOpen={getIsCategoryOpen(category.id, storage)}
              onToggle={(isCategoryOpen) => setIsCategoryOpen(category.id, isCategoryOpen, storage)}
              data-test-subj={`collapsibleNavGroup-${category.id}`}
            >
              <EuiListGroup
                aria-label={i18n.translate('core.ui.primaryNavSection.screenReaderLabel', {
                  defaultMessage: 'Primary navigation links, {category}',
                  values: { category: category.label },
                })}
                listItems={links}
                maxWidth="none"
                color="subdued"
                gutterSize="none"
                size="s"
              />
            </EuiCollapsibleNavGroup>
          );
        })}

        {/* Things with no category (largely for custom plugins) */}
        {unknowns.map(({ label, href, icon, isActive, isDisabled, onClick }, i) => (
          <EuiCollapsibleNavGroup key={i}>
            <EuiListGroup flush>
              <EuiListGroupItem
                color="text"
                size="s"
                label={label}
                href={href}
                icon={icon}
                isActive={isActive}
                isDisabled={isDisabled}
                data-test-subj="collapsibleNavAppLink"
                onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                  onIsOpenUpdate(false);
                  onClick(e);
                }}
              />
            </EuiListGroup>
          </EuiCollapsibleNavGroup>
        ))}

        {/* Docking button only for larger screens that can support it*/}
        <EuiShowFor sizes={['l', 'xl']}>
          <EuiCollapsibleNavGroup>
            <EuiListGroup flush>
              <EuiListGroupItem
                data-test-subj="collapsible-nav-lock"
                buttonRef={lockRef}
                size="xs"
                color="subdued"
                label={
                  isLocked
                    ? i18n.translate('core.ui.primaryNavSection.undockLabel', {
                        defaultMessage: 'Undock navigation',
                      })
                    : i18n.translate('core.ui.primaryNavSection.dockLabel', {
                        defaultMessage: 'Dock navigation',
                      })
                }
                aria-label={
                  isLocked
                    ? i18n.translate('core.ui.primaryNavSection.undockAriaLabel', {
                        defaultMessage: 'Undock primary navigation',
                      })
                    : i18n.translate('core.ui.primaryNavSection.dockAriaLabel', {
                        defaultMessage: 'Dock primary navigation',
                      })
                }
                onClick={() => {
                  onIsLockedUpdate(!isLocked);
                  if (lockRef.current) {
                    lockRef.current.focus();
                  }
                }}
                iconType={isLocked ? 'lock' : 'lockOpen'}
              />
            </EuiListGroup>
          </EuiCollapsibleNavGroup>
        </EuiShowFor>
      </EuiFlexItem>
    </EuiCollapsibleNav>
  );
}
