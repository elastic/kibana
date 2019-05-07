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

import React, { Component, createRef, Fragment } from 'react';
import * as Rx from 'rxjs';

import {
  // TODO: add type annotations
  // @ts-ignore
  EuiHeader,
  // @ts-ignore
  EuiHeaderLogo,
  // @ts-ignore
  EuiHeaderSection,
  // @ts-ignore
  EuiHeaderSectionItem,
  // @ts-ignore
  EuiHeaderSectionItemButton,
  // @ts-ignore
  EuiHideFor,
  EuiHorizontalRule,
  EuiIcon,
  // @ts-ignore
  EuiImage,
  // @ts-ignore
  EuiListGroupItem,
  // @ts-ignore
  EuiNavDrawer,
  // @ts-ignore
  EuiNavDrawerGroup,
  // @ts-ignore
  EuiShowFor,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { UICapabilities } from 'ui/capabilities';
import chrome, { NavLink } from 'ui/chrome';
import { HelpExtension } from 'ui/chrome';
import { RecentlyAccessedHistoryItem } from 'ui/persisted_log';
import { ChromeHeaderNavControlsRegistry } from 'ui/registry/chrome_header_nav_controls';
import { relativeToAbsolute } from 'ui/url/relative_to_absolute';

import { HeaderBadge } from './header_badge';
import { HeaderBreadcrumbs } from './header_breadcrumbs';
import { HeaderHelpMenu } from './header_help_menu';
import { HeaderNavControls } from './header_nav_controls';

import { NavControlSide } from '../';
import { ChromeBadge, ChromeBreadcrumb } from '../../../../../../../core/public';

interface Props {
  appTitle?: string;
  badge$: Rx.Observable<ChromeBadge | undefined>;
  breadcrumbs$: Rx.Observable<ChromeBreadcrumb[]>;
  homeHref: string;
  isVisible: boolean;
  navLinks$: Rx.Observable<NavLink[]>;
  recentlyAccessed$: Rx.Observable<RecentlyAccessedHistoryItem[]>;
  forceAppSwitcherNavigation$: Rx.Observable<boolean>;
  helpExtension$: Rx.Observable<HelpExtension>;
  navControls: ChromeHeaderNavControlsRegistry;
  intl: InjectedIntl;
  uiCapabilities: UICapabilities;
}

// Providing a buffer between the limit and the cut off index
// protects from truncating just the last couple (6) characters
const TRUNCATE_LIMIT: number = 64;
const TRUNCATE_AT: number = 58;

function extendRecentlyAccessedHistoryItem(
  navLinks: NavLink[],
  recentlyAccessed: RecentlyAccessedHistoryItem
) {
  const href = relativeToAbsolute(chrome.addBasePath(recentlyAccessed.link));
  const navLink = navLinks.find(nl => href.startsWith(nl.subUrlBase));

  let titleAndAriaLabel = recentlyAccessed.label;
  if (navLink) {
    const objectTypeForAriaAppendix = navLink.title;
    titleAndAriaLabel = i18n.translate('common.ui.recentLinks.linkItem.screenReaderLabel', {
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

function extendNavLink(navLink: NavLink) {
  return {
    ...navLink,
    href: navLink.lastSubUrl && !navLink.active ? navLink.lastSubUrl : navLink.url,
  };
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

interface State {
  navLinks: Array<ReturnType<typeof extendNavLink>>;
  recentlyAccessed: Array<ReturnType<typeof extendRecentlyAccessedHistoryItem>>;
  forceNavigation: boolean;
}

class HeaderUI extends Component<Props, State> {
  private subscription?: Rx.Subscription;
  private navDrawerRef = createRef<EuiNavDrawer>();

  constructor(props: Props) {
    super(props);

    this.state = {
      navLinks: [],
      recentlyAccessed: [],
      forceNavigation: false,
    };
  }

  public componentDidMount() {
    this.subscription = Rx.combineLatest(
      this.props.navLinks$,
      this.props.recentlyAccessed$,
      this.props.forceAppSwitcherNavigation$
    ).subscribe({
      next: ([navLinks, recentlyAccessed, forceNavigation]) => {
        this.setState({
          forceNavigation,
          navLinks: navLinks.map(navLink => extendNavLink(navLink)),
          recentlyAccessed: recentlyAccessed.map(ra =>
            extendRecentlyAccessedHistoryItem(navLinks, ra)
          ),
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
          id: 'common.ui.chrome.headerGlobalNav.goHomePageIconAriaLabel',
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

  public render() {
    const {
      appTitle,
      badge$,
      breadcrumbs$,
      isVisible,
      navControls,
      helpExtension$,
      intl,
      uiCapabilities,
    } = this.props;
    const { navLinks, recentlyAccessed } = this.state;

    if (!isVisible) {
      return null;
    }

    const leftNavControls = navControls.bySide[NavControlSide.Left];
    const rightNavControls = navControls.bySide[NavControlSide.Right];

    let navLinksArray = navLinks.map(navLink =>
      navLink.hidden || !uiCapabilities.navLinks[navLink.id]
        ? null
        : {
            key: navLink.id,
            label: navLink.title,
            href: navLink.href,
            iconType: navLink.euiIconType,
            icon:
              !navLink.euiIconType && navLink.icon ? (
                <EuiImage
                  size="s"
                  alt=""
                  aria-hidden={true}
                  url={chrome.addBasePath(`/${navLink.icon}`)}
                />
              ) : (
                undefined
              ),
            isActive: navLink.active,
            'data-test-subj': 'navDrawerAppsMenuLink',
          }
    );
    // filter out the null items
    navLinksArray = navLinksArray.filter(item => item !== null);

    const recentLinksArray = [
      {
        label: intl.formatMessage({
          id: 'common.ui.chrome.sideGlobalNav.viewRecentItemsLabel',
          defaultMessage: 'Recently viewed',
        }),
        iconType: 'clock',
        isDisabled: recentlyAccessed.length > 0 ? false : true,
        flyoutMenu: {
          title: intl.formatMessage({
            id: 'common.ui.chrome.sideGlobalNav.viewRecentItemsFlyoutTitle',
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
      <Fragment>
        <EuiHeader>
          <EuiHeaderSection grow={false}>
            <EuiShowFor sizes={['xs', 's']}>
              <EuiHeaderSectionItem border="right">{this.renderMenuTrigger()}</EuiHeaderSectionItem>
            </EuiShowFor>

            <EuiHeaderSectionItem border="right">{this.renderLogo()}</EuiHeaderSectionItem>

            <HeaderNavControls navControls={leftNavControls} />
          </EuiHeaderSection>

          <HeaderBreadcrumbs appTitle={appTitle} breadcrumbs$={breadcrumbs$} />

          <HeaderBadge badge$={badge$} />

          <EuiHeaderSection side="right">
            <EuiHeaderSectionItem>
              <HeaderHelpMenu helpExtension$={helpExtension$} />
            </EuiHeaderSectionItem>

            <HeaderNavControls navControls={rightNavControls} />
          </EuiHeaderSection>
        </EuiHeader>

        <EuiNavDrawer ref={this.navDrawerRef} data-test-subj="navDrawer">
          <EuiNavDrawerGroup listItems={recentLinksArray} />
          <EuiHorizontalRule margin="none" />
          <EuiNavDrawerGroup data-test-subj="navDrawerAppsMenu" listItems={navLinksArray} />
        </EuiNavDrawer>
      </Fragment>
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
