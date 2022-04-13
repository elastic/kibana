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
  EuiCollapsibleNavProps,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { groupBy, sortBy } from 'lodash';
import React, { Fragment, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import * as Rx from 'rxjs';
import { ChromeNavLink, ChromeRecentlyAccessedHistoryItem } from '../..';
import { AppCategory } from '../../../../types';
import { InternalApplicationStart } from '../../../application/types';
import { HttpStart } from '../../../http';
import { OnIsLockedUpdate } from './';
import {
  createEuiListItem,
  createRecentNavLink,
  isModifiedOrPrevented,
  createEuiButtonItem,
  createOverviewLink,
} from './nav_link';
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
  button: EuiCollapsibleNavProps['button'];
}

const overviewIDsToHide = ['kibanaOverview'];
const overviewIDs = [
  ...overviewIDsToHide,
  'observability-overview',
  'securitySolutionUI:get_started',
  'management',
];

export function CollapsibleNav({
  basePath,
  id,
  isNavOpen,
  homeHref,
  storage = window.localStorage,
  onIsLockedUpdate,
  closeNav,
  navigateToApp,
  navigateToUrl,
  button,
  ...observables
}: Props) {
  const allLinks = useObservable(observables.navLinks$, []);
  const allowedLinks = useMemo(
    () =>
      allLinks.filter(
        (link) =>
          // Filterting out hidden links,
          !link.hidden &&
          // and non-data overview pages
          !overviewIDsToHide.includes(link.id)
      ),
    [allLinks]
  );
  // Find just the integrations link
  const integrationsLink = useMemo(
    () => allLinks.find((link) => link.id === 'integrations'),
    [allLinks]
  );
  // Find all the overview (landing page) links
  const overviewLinks = useMemo(
    () => allLinks.filter((link) => overviewIDs.includes(link.id)),
    [allLinks]
  );
  const recentlyAccessed = useObservable(observables.recentlyAccessed$, []);
  const customNavLink = useObservable(observables.customNavLink$, undefined);
  const appId = useObservable(observables.appId$, '');
  const groupedNavLinks = groupBy(allowedLinks, (link) => link?.category?.id);
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
      onClose={closeNav}
      button={button}
      ownFocus={false}
      size={248}
    >
      {customNavLink && (
        <Fragment>
          <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
            <EuiCollapsibleNavGroup
              background="dark"
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
                    iconProps: { color: 'ghost' },
                  }),
                ]}
                maxWidth="none"
                gutterSize="none"
                size="s"
                color="ghost"
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
                isActive: appId === 'home',
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
      {recentlyAccessed.length > 0 && (
        <EuiCollapsibleNavGroup
          key="recentlyViewed"
          background="light"
          title={i18n.translate('core.ui.recentlyViewed', { defaultMessage: 'Recently viewed' })}
          isCollapsible={true}
          initialIsOpen={getIsCategoryOpen('recentlyViewed', storage)}
          onToggle={(isCategoryOpen) =>
            setIsCategoryOpen('recentlyViewed', isCategoryOpen, storage)
          }
          data-test-subj="collapsibleNavGroup-recentlyViewed"
        >
          <EuiListGroup
            aria-label={i18n.translate('core.ui.recentlyViewedAriaLabel', {
              defaultMessage: 'Recently viewed links',
            })}
            listItems={recentlyAccessed.map((link) => {
              // TODO #64541
              // Can remove icon from recent links completely
              const { iconType, onClick, ...hydratedLink } = createRecentNavLink(
                link,
                allowedLinks,
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
        </EuiCollapsibleNavGroup>
      )}

      <EuiHorizontalRule margin="none" />

      <EuiFlexItem className="eui-yScroll">
        {/* Kibana, Observability, Security, and Management sections */}
        {orderedCategories.map((categoryName) => {
          const category = categoryDictionary[categoryName]!;
          const overviewLink = overviewLinks.find((link) => link.category === category);

          return (
            <EuiCollapsibleNavGroup
              key={category.id}
              iconType={category.euiIconType}
              iconSize="m"
              buttonElement={overviewLink ? 'div' : 'button'}
              buttonClassName="kbnCollapsibleNav__solutionGroupButton"
              title={
                overviewLink ? (
                  <a
                    className="eui-textInheritColor kbnCollapsibleNav__solutionGroupLink"
                    {...createOverviewLink({
                      link: overviewLink,
                      navigateToUrl,
                      onClick: closeNav,
                    })}
                  >
                    {category.label}
                  </a>
                ) : (
                  category.label
                )
              }
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
      </EuiFlexItem>
      {integrationsLink && (
        <EuiFlexItem grow={false}>
          {/* Span fakes the nav group into not being the first item and therefore adding a top border */}
          <span />
          <EuiCollapsibleNavGroup>
            <EuiButton
              {...createEuiButtonItem({
                link: integrationsLink,
                navigateToUrl,
                onClick: closeNav,
              })}
              fill
              fullWidth
              iconType="plusInCircleFilled"
            >
              {i18n.translate('core.ui.primaryNav.addData', {
                defaultMessage: 'Add integrations',
              })}
            </EuiButton>
          </EuiCollapsibleNavGroup>
        </EuiFlexItem>
      )}
    </EuiCollapsibleNav>
  );
}
