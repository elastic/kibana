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

import classNames from 'classnames';
import React, { Component, Fragment } from 'react';
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
  EuiListGroup,
  // @ts-ignore
  EuiListGroupItem,
  // @ts-ignore
  EuiNavDrawer,
  // @ts-ignore
  EuiNavDrawerFlyout,
  // @ts-ignore
  EuiNavDrawerMenu,
  EuiOutsideClickDetector,
  // @ts-ignore
  EuiShowFor,
} from '@elastic/eui';

import { HeaderBreadcrumbs } from './header_breadcrumbs';
import { HeaderNavControls } from './header_nav_controls';

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import chrome, { NavLink } from 'ui/chrome';
import { RecentlyAccessedHistoryItem } from 'ui/persisted_log';
import { ChromeHeaderNavControlsRegistry } from 'ui/registry/chrome_header_nav_controls';
import { relativeToAbsolute } from 'ui/url/relative_to_absolute';
import { NavControlSide } from '../';
import { Breadcrumb } from '../../../../../../core/public/chrome';

interface Props {
  appTitle?: string;
  breadcrumbs$: Rx.Observable<Breadcrumb[]>;
  homeHref: string;
  isVisible: boolean;
  navLinks$: Rx.Observable<NavLink[]>;
  recentlyAccessed$: Rx.Observable<RecentlyAccessedHistoryItem[]>;
  navControls: ChromeHeaderNavControlsRegistry;
  intl: InjectedIntl;
}

function extendRecentlyAccessedHistoryItem(
  navLinks: NavLink[],
  recentlyAccessed: RecentlyAccessedHistoryItem
) {
  const href = relativeToAbsolute(chrome.addBasePath(recentlyAccessed.link));
  const navLink = navLinks.find(nl => href.startsWith(nl.subUrlBase));

  return {
    ...recentlyAccessed,
    href,
    euiIconType: navLink ? navLink.euiIconType : undefined,
  };
}

interface State {
  isCollapsed: boolean;
  flyoutIsCollapsed: boolean;
  flyoutIsAnimating: boolean;
  navFlyoutTitle: string;
  navFlyoutContent: [];
  mobileIsHidden: boolean;
  showScrollbar: boolean;
  outsideClickDisabled: boolean;
  isManagingFocus: boolean;
  navLinks: NavLink[];
  recentlyAccessed: Array<ReturnType<typeof extendRecentlyAccessedHistoryItem>>;
}

class HeaderUI extends Component<Props, State> {
  private subscription?: Rx.Subscription;
  private timeoutID?: ReturnType<typeof setTimeout>;

  constructor(props: Props) {
    super(props);

    this.state = {
      isCollapsed: true,
      flyoutIsCollapsed: true,
      flyoutIsAnimating: false,
      navFlyoutTitle: '',
      navFlyoutContent: [],
      mobileIsHidden: true,
      showScrollbar: false,
      outsideClickDisabled: true,
      isManagingFocus: false,
      navLinks: [],
      recentlyAccessed: [],
    };
  }

  public componentDidMount() {
    this.subscription = Rx.combineLatest(
      this.props.navLinks$,
      this.props.recentlyAccessed$
    ).subscribe({
      next: ([navLinks, recentlyAccessed]) => {
        this.setState({
          navLinks,
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
      <EuiHeaderSectionItemButton aria-label="Toggle side navigation" onClick={this.toggleOpen}>
        <EuiIcon type="apps" size="m" />
      </EuiHeaderSectionItemButton>
    );
  }

  public render() {
    const { appTitle, breadcrumbs$, isVisible, navControls } = this.props;
    const { navLinks, recentlyAccessed } = this.state;

    if (!isVisible) {
      return null;
    }

    const leftNavControls = navControls.bySide[NavControlSide.Left];
    const rightNavControls = navControls.bySide[NavControlSide.Right];

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

          <EuiHeaderSection side="right">
            <HeaderNavControls navControls={rightNavControls} />
          </EuiHeaderSection>
        </EuiHeader>
        <EuiOutsideClickDetector
          onOutsideClick={() => this.collapseDrawer()}
          isDisabled={this.state.outsideClickDisabled}
        >
          <EuiNavDrawer
            isCollapsed={this.state.isCollapsed}
            flyoutIsCollapsed={this.state.flyoutIsCollapsed}
            flyoutIsAnimating={this.state.flyoutIsAnimating}
            onMouseOver={this.expandDrawer}
            onFocus={this.expandDrawer}
            onBlur={this.focusOut}
            onMouseLeave={this.collapseDrawer}
            mobileIsHidden={this.state.mobileIsHidden}
            showScrollbar={this.state.showScrollbar}
            data-test-subj={classNames(
              'navDrawer',
              this.state.isCollapsed ? 'collapsed' : 'expanded'
            )}
          >
            <EuiNavDrawerMenu id="navDrawerMenu">
              <EuiListGroup>
                <EuiListGroupItem
                  label="Recently viewed"
                  iconType="clock"
                  size="s"
                  style={{ color: 'inherit' }}
                  aria-label="Recently viewed items"
                  onClick={() => this.expandFlyout()}
                  isDisabled={recentlyAccessed.length > 0 ? false : true}
                  extraAction={{
                    color: 'subdued',
                    iconType: 'arrowRight',
                    iconSize: 's',
                    'aria-label': 'Expand to view recent apps and objects',
                    onClick: () => this.expandFlyout(),
                    alwaysShow: true,
                  }}
                />
              </EuiListGroup>
              <EuiHorizontalRule margin="none" />
              <EuiListGroup data-test-subj="appsMenu">
                {navLinks.map(navLink =>
                  navLink.hidden ? null : (
                    <EuiListGroupItem
                      key={navLink.id}
                      label={navLink.title}
                      href={
                        navLink.lastSubUrl && !navLink.active ? navLink.lastSubUrl : navLink.url
                      }
                      iconType={navLink.euiIconType}
                      size="s"
                      style={{ color: 'inherit' }}
                      aria-label={navLink.title}
                      isActive={navLink.active}
                      data-test-subj="appLink"
                    />
                  )
                )}
              </EuiListGroup>
            </EuiNavDrawerMenu>
            <EuiNavDrawerFlyout
              id="navDrawerFlyout"
              title="Recent items"
              isCollapsed={this.state.flyoutIsCollapsed}
              listItems={recentlyAccessed.map(item => ({
                label: item.label,
                href: item.href,
                iconType: item.euiIconType,
                size: 's',
                style: { color: 'inherit' },
                'aria-label': item.label,
              }))}
              onMouseLeave={this.collapseFlyout}
              wrapText={true}
            />
          </EuiNavDrawer>
        </EuiOutsideClickDetector>
      </Fragment>
    );
  }

  private toggleOpen = () => {
    this.setState({
      mobileIsHidden: !this.state.mobileIsHidden,
    });

    setTimeout(() => {
      this.setState({
        outsideClickDisabled: this.state.mobileIsHidden ? true : false,
      });
    }, this.getTimeoutMs(350));
  };

  private expandDrawer = () => {
    this.setState({ isCollapsed: false });

    setTimeout(() => {
      this.setState({
        showScrollbar: true,
      });
    }, this.getTimeoutMs(350));

    // This prevents the drawer from collapsing when tabbing through children
    // by clearing the timeout thus cancelling the onBlur event (see focusOut).
    // This means isManagingFocus remains true as long as a child element
    // has focus. This is the case since React bubbles up onFocus and onBlur
    // events from the child elements.

    if (this.timeoutID) {
      clearTimeout(this.timeoutID);
    }

    if (!this.state.isManagingFocus) {
      this.setState({
        isManagingFocus: true,
      });
    }
  };

  private collapseDrawer = () => {
    this.setState({
      flyoutIsAnimating: false,
    });

    setTimeout(() => {
      this.setState({
        isCollapsed: true,
        flyoutIsCollapsed: true,
        mobileIsHidden: true,
        showScrollbar: false,
        outsideClickDisabled: true,
      });
    }, this.getTimeoutMs(350));

    // Scrolls the menu and flyout back to top when the nav drawer collapses
    setTimeout(() => {
      const menuEl = document.getElementById('navDrawerMenu');
      if (menuEl) {
        menuEl.scrollTop = 0;
      }

      const flyoutEl = document.getElementById('navDrawerFlyout');
      if (flyoutEl) {
        flyoutEl.scrollTop = 0;
      }
    }, this.getTimeoutMs(300));
  };

  private focusOut = () => {
    // This collapses the drawer when no children have focus (i.e. tabbed out).
    // In other words, if focus does not bubble up from a child element, then
    // the drawer will collapse. See the corresponding block in expandDrawer
    // (called by onFocus) which cancels this operation via clearTimeout.
    this.timeoutID = setTimeout(() => {
      if (this.state.isManagingFocus) {
        this.setState({
          isManagingFocus: false,
        });

        this.collapseDrawer();
      }
    }, 0);
  };

  private expandFlyout = () => {
    this.setState(() => ({
      flyoutIsCollapsed: !this.state.flyoutIsCollapsed,
    }));

    this.setState({
      flyoutIsAnimating: true,
    });
  };

  private collapseFlyout = () => {
    this.setState({ flyoutIsAnimating: true });

    setTimeout(() => {
      this.setState({
        flyoutIsCollapsed: true,
      });
    }, this.getTimeoutMs(250));
  };

  private getTimeoutMs = (defaultTimeout: number) => {
    const uiSettings = chrome.getUiSettingsClient();
    return uiSettings.get('accessibility:disableAnimations') ? 0 : defaultTimeout;
  };
}

export const Header = injectI18n(HeaderUI);
