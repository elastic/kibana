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

import Url from 'url';

import React, { Component, createRef } from 'react';
import * as Rx from 'rxjs';

import {
  // TODO: add type annotations
  EuiHeader,
  EuiHeaderLogo,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiHeaderSectionItemButton,
  EuiHorizontalRule,
  EuiIcon,
  EuiImage,
  // @ts-ignore
  EuiNavDrawer,
  // @ts-ignore
  EuiNavDrawerGroup,
  // @ts-ignore
  EuiShowFor,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';

import { groupBy, sortBy } from 'lodash';
import { HeaderBadge } from './header_badge';
import { HeaderBreadcrumbs } from './header_breadcrumbs';
import { HeaderHelpMenu } from './header_help_menu';
import { HeaderNavControls } from './header_nav_controls';

import {
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeNavLink,
  ChromeRecentlyAccessedHistoryItem,
  ChromeNavControl,
} from '../..';
import { HttpStart } from '../../../http';
import { ChromeHelpExtension } from '../../chrome_service';
import { ApplicationStart, InternalApplicationStart } from '../../../application/types';
import { NavLinkWrapper } from '../../nav_links/nav_link';

// Providing a buffer between the limit and the cut off index
// protects from truncating just the last couple (6) characters
const TRUNCATE_LIMIT: number = 64;
const TRUNCATE_AT: number = 58;

/**
 * @param {string} url - a relative or root relative url.  If a relative path is given then the
 * absolute url returned will depend on the current page where this function is called from. For example
 * if you are on page "http://www.mysite.com/shopping/kids" and you pass this function "adults", you would get
 * back "http://www.mysite.com/shopping/adults".  If you passed this function a root relative path, or one that
 * starts with a "/", for example "/account/cart", you would get back "http://www.mysite.com/account/cart".
 * @return {string} the relative url transformed into an absolute url
 */
function relativeToAbsolute(url: string) {
  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.href;
}

function euiRecentItem(
  navLinks: ChromeNavLink[],
  recentlyAccessed: ChromeRecentlyAccessedHistoryItem,
  basePath: HttpStart['basePath']
) {
  const href = relativeToAbsolute(basePath.prepend(recentlyAccessed.link));
  const navLink = navLinks.find(nl => href.startsWith(nl.subUrlBase || nl.baseUrl));
  let titleAndAriaLabel = recentlyAccessed.label;

  if (navLink) {
    titleAndAriaLabel = i18n.translate('core.ui.recentLinks.linkItem.screenReaderLabel', {
      defaultMessage: '{recentlyAccessedItemLinklabel}, type: {pageType}',
      values: {
        recentlyAccessedItemLinklabel: recentlyAccessed.label,
        pageType: navLink.title,
      },
    });
  }

  return {
    href,
    label: truncateRecentItemLabel(recentlyAccessed.label),
    title: titleAndAriaLabel,
    'aria-label': titleAndAriaLabel,
    euiIconType: navLink?.euiIconType,
  };
}

function euiNavLink(
  navLink: ChromeNavLink,
  urlForApp: ApplicationStart['getUrlForApp'],
  legacyMode: boolean,
  navigateToApp: ApplicationStart['navigateToApp'],
  currentAppId: string | undefined,
  basePath: HttpStart['basePath']
) {
  const {
    legacy,
    url,
    active,
    baseUrl,
    id,
    title,
    disabled,
    euiIconType,
    icon,
    category,
    order,
  } = navLink;
  let href = urlForApp(id);

  if (legacy) {
    href = url && !active ? url : baseUrl;
  }

  return {
    category,
    key: id,
    label: title,
    href, // Use href and onClick to support "open in new tab" and SPA navigation in the same link
    onClick(event: MouseEvent) {
      if (
        !legacyMode && // ignore when in legacy mode
        !legacy && // ignore links to legacy apps
        !event.defaultPrevented && // onClick prevented default
        event.button === 0 && // ignore everything but left clicks
        !isModifiedEvent(event) // ignore clicks with modifier keys
      ) {
        event.preventDefault();
        navigateToApp(id);
      }
    },
    // Legacy apps use `active` property, NP apps should match the current app
    isActive: active || currentAppId === id,
    isDisabled: disabled,
    iconType: euiIconType,
    icon: !euiIconType && icon ? renderLinkIcon(basePath.prepend(`/${icon}`)) : undefined,
    order,
    'data-test-subj': 'navDrawerAppsMenuLink',
  };
}

function renderLinkIcon(url: string) {
  return <EuiImage size="s" alt="" aria-hidden={true} url={url} />;
}

function isModifiedEvent(event: MouseEvent) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

function findClosestAnchor(element: HTMLElement): HTMLAnchorElement | void {
  let current = element;
  while (current) {
    if (current.tagName === 'A') {
      return current as HTMLAnchorElement;
    }

    if (!current.parentElement || current.parentElement === document.body) {
      return undefined;
    }

    current = current.parentElement;
  }
}

// TODO@myasonik use an enum or something
const categoryIcon = {
  management: 'managementApp',
};

function getGroupIcon(groupName: string) {
  return categoryIcon[groupName];
}

function truncateRecentItemLabel(label: string): string {
  if (label.length > TRUNCATE_LIMIT) {
    label = `${label.substring(0, TRUNCATE_AT)}…`;
  }

  return label;
}

export type HeaderProps = Pick<Props, Exclude<keyof Props, 'intl'>>;

interface Props {
  kibanaVersion: string;
  application: InternalApplicationStart;
  appTitle$: Rx.Observable<string>;
  badge$: Rx.Observable<ChromeBadge | undefined>;
  breadcrumbs$: Rx.Observable<ChromeBreadcrumb[]>;
  homeHref: string;
  isVisible$: Rx.Observable<boolean>;
  kibanaDocLink: string;
  navLinks$: Rx.Observable<ChromeNavLink[]>;
  recentlyAccessed$: Rx.Observable<ChromeRecentlyAccessedHistoryItem[]>;
  forceAppSwitcherNavigation$: Rx.Observable<boolean>;
  helpExtension$: Rx.Observable<ChromeHelpExtension | undefined>;
  helpSupportUrl$: Rx.Observable<string>;
  legacyMode: boolean;
  navControlsLeft$: Rx.Observable<readonly ChromeNavControl[]>;
  navControlsRight$: Rx.Observable<readonly ChromeNavControl[]>;
  intl: InjectedIntl;
  basePath: HttpStart['basePath'];
  isLocked?: boolean;
  onIsLockedUpdate?: (isLocked: boolean) => void;
}

type ExtendedRecentlyAccessedHistoryItem = ReturnType<typeof euiRecentItem>;

interface State {
  appTitle: string;
  isVisible: boolean;
  navLinks: ReadonlyArray<ReturnType<typeof euiNavLink>>;
  recentlyAccessed: ExtendedRecentlyAccessedHistoryItem[];
  forceNavigation: boolean;
  navControlsLeft: readonly ChromeNavControl[];
  navControlsRight: readonly ChromeNavControl[];
}

class HeaderUI extends Component<Props, State> {
  private subscription?: Rx.Subscription;
  private navDrawerRef = createRef<EuiNavDrawer>();

  constructor(props: Props) {
    super(props);

    this.state = {
      appTitle: 'Kibana',
      isVisible: true,
      navLinks: [],
      recentlyAccessed: [],
      forceNavigation: false,
      navControlsLeft: [],
      navControlsRight: [],
    };
  }

  public componentDidMount() {
    this.subscription = Rx.combineLatest(
      this.props.appTitle$,
      this.props.isVisible$,
      this.props.forceAppSwitcherNavigation$,
      this.props.navLinks$,
      this.props.recentlyAccessed$,
      // Types for combineLatest only handle up to 6 inferred types so we combine these two separately.
      Rx.combineLatest(
        this.props.navControlsLeft$,
        this.props.navControlsRight$,
        this.props.application.currentAppId$
      )
    ).subscribe({
      next: ([
        appTitle,
        isVisible,
        forceNavigation,
        navLinks,
        recentlyAccessed,
        [navControlsLeft, navControlsRight, currentAppId],
      ]) => {
        this.setState({
          appTitle,
          isVisible,
          forceNavigation,
          navLinks: navLinks
            .filter(navLink => !navLink.hidden)
            .map(navLink =>
              euiNavLink(
                navLink,
                this.props.application.getUrlForApp,
                this.props.legacyMode,
                this.props.application.navigateToApp,
                currentAppId,
                this.props.basePath
              )
            ),
          recentlyAccessed: recentlyAccessed.map(ra =>
            euiRecentItem(navLinks, ra, this.props.basePath)
          ),
          navControlsLeft,
          navControlsRight,
        });
      },
    });
  }

  public componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public renderLogo() {
    const { homeHref } = this.props;
    return (
      <EuiHeaderLogo
        data-test-subj="logo"
        iconType="logoKibana"
        onClick={this.onNavClick}
        href={homeHref}
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.goHomePageIconAriaLabel', {
          defaultMessage: 'Go to home page',
        })}
      />
    );
  }

  public renderMenuTrigger() {
    return (
      <EuiHeaderSectionItemButton
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.toggleSideNavAriaLabel', {
          defaultMessage: 'Toggle side navigation',
        })}
        onClick={() => this.navDrawerRef.current.toggleOpen()}
      >
        <EuiIcon type="apps" size="m" />
      </EuiHeaderSectionItemButton>
    );
  }

  public renderRecentLinks(recentlyAccessed: ExtendedRecentlyAccessedHistoryItem[]) {
    return (
      <EuiNavDrawerGroup
        listItems={[
          {
            label: i18n.translate('core.ui.chrome.sideGlobalNav.viewRecentItemsLabel', {
              defaultMessage: 'Recently viewed',
            }),
            iconType: 'clock',
            isDisabled: !(recentlyAccessed.length > 0),
            flyoutMenu: {
              title: i18n.translate('core.ui.chrome.sideGlobalNav.viewRecentItemsFlyoutTitle', {
                defaultMessage: 'Recent items',
              }),
              listItems: recentlyAccessed,
            },
          },
        ]}
        aria-label={i18n.translate('core.ui.recentLinks.screenReaderLabel', {
          defaultMessage: 'Recently viewed links, navigation',
        })}
      />
    );
  }

  public renderNavLinks(navLinks: NavLinkWrapper[]) {
    const isOSS = false; // TODO@myasonik
    if (navLinks.length < 6 || isOSS) {
      return (
        <EuiNavDrawerGroup
          data-test-subj="navDrawerAppsMenu"
          listItems={navLinks}
          aria-label={i18n.translate('core.ui.primaryNavList.screenReaderLabel', {
            defaultMessage: 'Primary navigation links',
          })}
        />
      );
    }

    // TODO@myasonik use an enum or something
    const { undefined: unknowns, management, ...mainNav } = groupBy(navLinks, 'category');
    return (
      <EuiNavDrawerGroup
        data-test-subj="navDrawerAppsMenu"
        aria-label={i18n.translate('core.ui.primaryNavList.screenReaderLabel', {
          defaultMessage: 'Primary navigation links',
        })}
        listItems={[
          ...Object.keys(mainNav).map(groupName => ({
            label: groupName,
            iconType: getGroupIcon(groupName),
            flyoutMenu: { title: groupName, listItems: sortBy(mainNav[groupName], 'order') },
          })),
          ...sortBy(unknowns, 'order'),
        ]}
      />
    );
  }
  // <>
  //   <EuiNavDrawerGroup
  //     data-test-subj="navDrawerAppsMenu"
  //     aria-label={i18n.translate('core.ui.primaryNavList.screenReaderLabel', {
  //       defaultMessage: 'Primary navigation links',
  //     })}
  //     listItems={[
  //       ...Object.keys(mainNav).map(groupName => ({
  //         label: groupName,
  //         iconType: getGroupIcon(groupName),
  //         flyoutMenu: { title: groupName, listItems: sortBy(mainNav[groupName], 'order') },
  //       })),
  //       ...sortBy(unknowns, 'order'),
  //     ]}
  //   />
  //   <EuiHorizontalRule margin="none" />
  //   <EuiNavDrawerGroup
  //     data-test-subj="navDrawerManagementMenu"
  //     aria-label={i18n.translate('core.ui.managementNavList.screenReaderLabel', {
  //       defaultMessage: 'Management navigation links',
  //     })}
  //     listItems={[
  //       {
  //         label: 'management',
  //         iconType: getGroupIcon('management'),
  //         flyoutMenu: { title: 'management', listItems: sortBy(management, 'order') },
  //       },
  //     ]}
  //   />
  // </>

  public render() {
    const {
      badge$,
      breadcrumbs$,
      helpExtension$,
      helpSupportUrl$,
      isLocked,
      kibanaDocLink,
      kibanaVersion,
      onIsLockedUpdate,
    } = this.props;
    const {
      appTitle,
      isVisible,
      navControlsLeft,
      navControlsRight,
      navLinks,
      recentlyAccessed,
    } = this.state;

    if (!isVisible) {
      return null;
    }

    return (
      <header>
        <EuiHeader>
          <EuiHeaderSection grow={false}>
            <EuiShowFor sizes={['xs', 's']}>
              <EuiHeaderSectionItem border="right">{this.renderMenuTrigger()}</EuiHeaderSectionItem>
            </EuiShowFor>

            <EuiHeaderSectionItem border="right">{this.renderLogo()}</EuiHeaderSectionItem>

            <HeaderNavControls side="left" navControls={navControlsLeft} />
          </EuiHeaderSection>

          <HeaderBreadcrumbs appTitle={appTitle} breadcrumbs$={breadcrumbs$} />

          <HeaderBadge badge$={badge$} />

          <EuiHeaderSection side="right">
            <EuiHeaderSectionItem>
              <HeaderHelpMenu
                {...{
                  helpExtension$,
                  helpSupportUrl$,
                  kibanaDocLink,
                  kibanaVersion,
                }}
              />
            </EuiHeaderSectionItem>

            <HeaderNavControls side="right" navControls={navControlsRight} />
          </EuiHeaderSection>
        </EuiHeader>

        <EuiNavDrawer
          ref={this.navDrawerRef}
          data-test-subj="navDrawer"
          isLocked={isLocked}
          onIsLockedUpdate={onIsLockedUpdate}
          aria-label={i18n.translate('core.ui.primaryNav.screenReaderLabel', {
            defaultMessage: 'Primary',
          })}
        >
          {this.renderRecentLinks(recentlyAccessed)}
          <EuiHorizontalRule margin="none" />
          {this.renderNavLinks(navLinks)}
        </EuiNavDrawer>
      </header>
    );
  }

  private onNavClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const anchor = findClosestAnchor((event as any).nativeEvent.target);
    if (!anchor) {
      return;
    }

    const navLink = this.state.navLinks.find(item => item.href === anchor.href);
    if (navLink && navLink.isDisabled) {
      event.preventDefault();
      return;
    }

    if (
      !this.state.forceNavigation ||
      event.isDefaultPrevented() ||
      event.altKey ||
      event.metaKey ||
      event.ctrlKey
    ) {
      return;
    }

    const toParsed = Url.parse(anchor.href);
    const fromParsed = Url.parse(document.location.href);
    const sameProto = toParsed.protocol === fromParsed.protocol;
    const sameHost = toParsed.host === fromParsed.host;
    const samePath = toParsed.path === fromParsed.path;

    if (sameProto && sameHost && samePath) {
      if (toParsed.hash) {
        document.location.reload();
      }

      // event.preventDefault() keeps the browser from seeing the new url as an update
      // and even setting window.location does not mimic that behavior, so instead
      // we use stopPropagation() to prevent angular from seeing the click and
      // starting a digest cycle/attempting to handle it in the router.
      event.stopPropagation();
    }
  };
}

export const Header = injectI18n(HeaderUI);
