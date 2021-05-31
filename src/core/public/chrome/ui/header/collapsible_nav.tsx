/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './collapsible_nav.scss';
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
import React, { Fragment, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';
import * as Rx from 'rxjs';
import { ChromeNavLink, ChromeRecentlyAccessedHistoryItem } from '../..';
import { AppCategory } from '../../../../types';
import { InternalApplicationStart } from '../../../application/types';
import { HttpStart } from '../../../http';
import { OnIsLockedUpdate } from './';
import { createEuiListItem, createRecentNavLink, isModifiedOrPrevented } from './nav_link';

function getAllCategories(allCategorizedLinks: Record<string, ChromeNavLink[]>) {
  const allCategories = {} as Record<string, AppCategory | undefined>;

  for (const [key, value] of Object.entries(allCategorizedLinks)) {
    allCategories[key] = value[0].category;
  }

  return allCategories;
}

function getOrderedCategories(
  mainCategories: Record<string, ChromeNavLink[]>,
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
  appId$: InternalApplicationStart['currentAppId$'];
  basePath: HttpStart['basePath'];
  id: string;
  isLocked: boolean;
  isNavOpen: boolean;
  homeHref: string;
  navLinks$: Rx.Observable<ChromeNavLink[]>;
  recentlyAccessed$: Rx.Observable<ChromeRecentlyAccessedHistoryItem[]>;
  storage?: Storage;
  onIsLockedUpdate: OnIsLockedUpdate;
  closeNav: () => void;
  navigateToApp: InternalApplicationStart['navigateToApp'];
  navigateToUrl: InternalApplicationStart['navigateToUrl'];
  customNavLink$: Rx.Observable<ChromeNavLink | undefined>;
}

export function CollapsibleNav({
  basePath,
  id,
  isLocked,
  isNavOpen,
  homeHref,
  storage = window.localStorage,
  onIsLockedUpdate,
  closeNav,
  navigateToApp,
  navigateToUrl,
  ...observables
}: Props) {
  const navLinks = useObservable(observables.navLinks$, []).filter((link) => !link.hidden);
  const recentlyAccessed = useObservable(observables.recentlyAccessed$, []);
  const customNavLink = useObservable(observables.customNavLink$, undefined);
  const appId = useObservable(observables.appId$, '');
  const lockRef = useRef<HTMLButtonElement>(null);
  const groupedNavLinks = groupBy(navLinks, (link) => link?.category?.id);
  const { undefined: unknowns = [], ...allCategorizedLinks } = groupedNavLinks;
  const categoryDictionary = getAllCategories(allCategorizedLinks);
  const orderedCategories = getOrderedCategories(allCategorizedLinks, categoryDictionary);
  const readyForEUI = (link: ChromeNavLink, needsIcon: boolean = false) => {
    return createEuiListItem({
      link,
      appId,
      dataTestSubj: 'collapsibleNavAppLink',
      navigateToUrl,
      onClick: closeNav,
      ...(needsIcon && { basePath }),
    });
  };

  return (
    <EuiCollapsibleNav
      data-test-subj="collapsibleNav"
      id={id}
      aria-label={i18n.translate('core.ui.primaryNav.screenReaderLabel', {
        defaultMessage: 'Primary',
      })}
      isOpen={isNavOpen}
      isDocked={isLocked}
      onClose={closeNav}
    >
      {customNavLink && (
        <Fragment>
          <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
            <EuiCollapsibleNavGroup
              background="light"
              className="eui-yScroll"
              style={{ maxHeight: '40vh' }}
            >
              <EuiListGroup
                listItems={[
                  createEuiListItem({
                    link: customNavLink,
                    basePath,
                    navigateToUrl,
                    dataTestSubj: 'collapsibleNavCustomNavLink',
                    onClick: closeNav,
                    externalLink: true,
                  }),
                ]}
                maxWidth="none"
                color="text"
                gutterSize="none"
                size="s"
              />
            </EuiCollapsibleNavGroup>
          </EuiFlexItem>

          <EuiHorizontalRule margin="none" />
        </Fragment>
      )}

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
                'data-test-subj': 'homeLink',
                onClick: (event) => {
                  if (isModifiedOrPrevented(event)) {
                    return;
                  }

                  event.preventDefault();
                  closeNav();
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
        {recentlyAccessed.length > 0 ? (
          <EuiListGroup
            aria-label={i18n.translate('core.ui.recentlyViewedAriaLabel', {
              defaultMessage: 'Recently viewed links',
            })}
            listItems={recentlyAccessed.map((link) => {
              // TODO #64541
              // Can remove icon from recent links completely
              const { iconType, onClick, ...hydratedLink } = createRecentNavLink(
                link,
                navLinks,
                basePath,
                navigateToUrl
              );

              return {
                ...hydratedLink,
                'data-test-subj': 'collapsibleNavAppLink--recent',
                onClick: (event) => {
                  if (!isModifiedOrPrevented(event)) {
                    closeNav();
                    onClick(event);
                  }
                },
              };
            })}
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
        {orderedCategories.map((categoryName) => {
          const category = categoryDictionary[categoryName]!;

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
                listItems={allCategorizedLinks[categoryName].map((link) => readyForEUI(link))}
                maxWidth="none"
                color="subdued"
                gutterSize="none"
                size="s"
              />
            </EuiCollapsibleNavGroup>
          );
        })}

        {/* Things with no category (largely for custom plugins) */}
        {unknowns.map((link, i) => (
          <EuiCollapsibleNavGroup data-test-subj={`collapsibleNavGroup-noCategory`} key={i}>
            <EuiListGroup flush>
              <EuiListGroupItem color="text" size="s" {...readyForEUI(link, true)} />
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
