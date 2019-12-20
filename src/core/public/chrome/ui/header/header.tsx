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

import { PulseNotificationsTrigger } from './pulse_notifications/pulse_notifications_trigger';

// Providing a buffer between the limit and the cut off index
// protects from truncating just the last couple (6) characters
const TRUNCATE_LIMIT: number = 64;
const TRUNCATE_AT: number = 58;

/**
 *
 * @param {string} url - a relative or root relative url.  If a relative path is given then the
 * absolute url returned will depend on the current page where this function is called from. For example
 * if you are on page "http://www.mysite.com/shopping/kids" and you pass this function "adults", you would get
 * back "http://www.mysite.com/shopping/adults".  If you passed this function a root relative path, or one that
 * starts with a "/", for example "/account/cart", you would get back "http://www.mysite.com/account/cart".
 * @return {string} the relative url transformed into an absolute url
 */
function relativeToAbsolute(url: string) {
  // convert all link urls to absolute urls
  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.href;
}

function extendRecentlyAccessedHistoryItem(
  navLinks: ChromeNavLink[],
  recentlyAccessed: ChromeRecentlyAccessedHistoryItem,
  basePath: HttpStart['basePath']
) {
  const href = relativeToAbsolute(basePath.prepend(recentlyAccessed.link));
  const navLink = navLinks.find(nl => href.startsWith(nl.subUrlBase || nl.baseUrl));

  let titleAndAriaLabel = recentlyAccessed.label;
  if (navLink) {
    const objectTypeForAriaAppendix = navLink.title;
    titleAndAriaLabel = i18n.translate('core.ui.recentLinks.linkItem.screenReaderLabel', {
      defaultMessage: '{recentlyAccessedItemLinklabel}, type: {pageType}',
      values: {
        recentlyAccessedItemLinklabel: recentlyAccessed.label,
        pageType: objectTypeForAriaAppendix,
      },
    });
  }

  return {
    ...recentlyAccessed,
    href,
    euiIconType: navLink ? navLink.euiIconType : undefined,
    title: titleAndAriaLabel,
  };
}

function extendNavLink(navLink: ChromeNavLink, urlForApp: ApplicationStart['getUrlForApp']) {
  if (navLink.legacy) {
    return {
      ...navLink,
      href: navLink.url && !navLink.active ? navLink.url : navLink.baseUrl,
    };
  }

  return {
    ...navLink,
    href: urlForApp(navLink.id),
  };
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

interface State {
  appTitle: string;
  currentAppId?: string;
  isVisible: boolean;
  navLinks: ReadonlyArray<ReturnType<typeof extendNavLink>>;
  recentlyAccessed: ReadonlyArray<ReturnType<typeof extendRecentlyAccessedHistoryItem>>;
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
          navLinks: navLinks.map(navLink =>
            extendNavLink(navLink, this.props.application.getUrlForApp)
          ),
          recentlyAccessed: recentlyAccessed.map(ra =>
            extendRecentlyAccessedHistoryItem(navLinks, ra, this.props.basePath)
          ),
          navControlsLeft,
          navControlsRight,
          currentAppId,
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
    const { homeHref, intl } = this.props;
    return (
      <EuiHeaderLogo
        data-test-subj="logo"
        iconType="logoKibana"
        onClick={this.onNavClick}
        href={homeHref}
        aria-label={intl.formatMessage({
          id: 'core.ui.chrome.headerGlobalNav.goHomePageIconAriaLabel',
          defaultMessage: 'Go to home page',
        })}
      />
    );
  }

  public renderMenuTrigger() {
    return (
      <EuiHeaderSectionItemButton
        aria-label="Toggle side navigation"
        onClick={() => this.navDrawerRef.current.toggleOpen()}
      >
        <EuiIcon type="apps" size="m" />
      </EuiHeaderSectionItemButton>
    );
  }
  public renderPulseNotificationsTrigger() {
    return <PulseNotificationsTrigger />;
  }

  public render() {
    const {
      application,
      badge$,
      basePath,
      breadcrumbs$,
      helpExtension$,
      helpSupportUrl$,
      intl,
      isLocked,
      kibanaDocLink,
      kibanaVersion,
      onIsLockedUpdate,
      legacyMode,
    } = this.props;
    const {
      appTitle,
      currentAppId,
      isVisible,
      navControlsLeft,
      navControlsRight,
      navLinks,
      recentlyAccessed,
    } = this.state;

    if (!isVisible) {
      return null;
    }

    const navLinksArray = navLinks
      .filter(navLink => !navLink.hidden)
      .map(navLink => ({
        key: navLink.id,
        label: navLink.title,

        // Use href and onClick to support "open in new tab" and SPA navigation in the same link
        href: navLink.href,
        onClick: (event: MouseEvent) => {
          if (
            !legacyMode && // ignore when in legacy mode
            !navLink.legacy && // ignore links to legacy apps
            !event.defaultPrevented && // onClick prevented default
            event.button === 0 && // ignore everything but left clicks
            !isModifiedEvent(event) // ignore clicks with modifier keys
          ) {
            event.preventDefault();
            application.navigateToApp(navLink.id);
          }
        },

        // Legacy apps use `active` property, NP apps should match the current app
        isActive: navLink.active || currentAppId === navLink.id,
        isDisabled: navLink.disabled,

        iconType: navLink.euiIconType,
        icon:
          !navLink.euiIconType && navLink.icon ? (
            <EuiImage
              size="s"
              alt=""
              aria-hidden={true}
              url={basePath.prepend(`/${navLink.icon}`)}
            />
          ) : (
            undefined
          ),
        'data-test-subj': 'navDrawerAppsMenuLink',
      }));

    const recentLinksArray = [
      {
        label: intl.formatMessage({
          id: 'core.ui.chrome.sideGlobalNav.viewRecentItemsLabel',
          defaultMessage: 'Recently viewed',
        }),
        iconType: 'clock',
        isDisabled: recentlyAccessed.length > 0 ? false : true,
        flyoutMenu: {
          title: intl.formatMessage({
            id: 'core.ui.chrome.sideGlobalNav.viewRecentItemsFlyoutTitle',
            defaultMessage: 'Recent items',
          }),
          listItems: recentlyAccessed.map(item => ({
            label: truncateRecentItemLabel(item.label),
            title: item.title,
            'aria-label': item.title,
            href: item.href,
            iconType: item.euiIconType,
          })),
        },
      },
    ];

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
            <EuiHeaderSectionItem>
              <React.Fragment>{this.renderPulseNotificationsTrigger()}</React.Fragment>
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
          <EuiNavDrawerGroup
            listItems={recentLinksArray}
            aria-label={i18n.translate('core.ui.recentLinks.screenReaderLabel', {
              defaultMessage: 'Recently viewed links, navigation',
            })}
          />
          <EuiHorizontalRule margin="none" />
          <EuiNavDrawerGroup
            data-test-subj="navDrawerAppsMenu"
            listItems={navLinksArray}
            aria-label={i18n.translate('core.ui.primaryNavList.screenReaderLabel', {
              defaultMessage: 'Primary navigation links',
            })}
          />
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
    if (navLink && navLink.disabled) {
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
