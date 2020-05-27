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
  EuiHeader,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiNavDrawer,
  EuiShowFor,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Component, createRef } from 'react';
import classnames from 'classnames';
import * as Rx from 'rxjs';
import {
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeNavControl,
  ChromeNavLink,
  ChromeRecentlyAccessedHistoryItem,
} from '../..';
import { InternalApplicationStart } from '../../../application/types';
import { HttpStart } from '../../../http';
import { ChromeHelpExtension } from '../../chrome_service';
import { HeaderBadge } from './header_badge';
import { NavType, OnIsLockedUpdate } from './';
import { HeaderBreadcrumbs } from './header_breadcrumbs';
import { HeaderHelpMenu } from './header_help_menu';
import { HeaderNavControls } from './header_nav_controls';
import { createNavLink, createRecentNavLink } from './nav_link';
import { HeaderLogo } from './header_logo';
import { NavDrawer } from './nav_drawer';
import { CollapsibleNav } from './collapsible_nav';

export interface HeaderProps {
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
  basePath: HttpStart['basePath'];
  isLocked$: Rx.Observable<boolean>;
  navType$: Rx.Observable<NavType>;
  onIsLockedUpdate: OnIsLockedUpdate;
}

interface State {
  appTitle: string;
  isVisible: boolean;
  navLinks: ChromeNavLink[];
  recentlyAccessed: ChromeRecentlyAccessedHistoryItem[];
  forceNavigation: boolean;
  navControlsLeft: readonly ChromeNavControl[];
  navControlsRight: readonly ChromeNavControl[];
  currentAppId: string | undefined;
  isLocked: boolean;
  navType: NavType;
  isOpen: boolean;
}

export class Header extends Component<HeaderProps, State> {
  private subscription?: Rx.Subscription;
  private navDrawerRef = createRef<EuiNavDrawer>();
  private toggleCollapsibleNavRef = createRef<HTMLButtonElement>();

  constructor(props: HeaderProps) {
    super(props);

    let isLocked = false;
    props.isLocked$.subscribe((initialIsLocked) => (isLocked = initialIsLocked));

    this.state = {
      appTitle: 'Kibana',
      isVisible: true,
      navLinks: [],
      recentlyAccessed: [],
      forceNavigation: false,
      navControlsLeft: [],
      navControlsRight: [],
      currentAppId: '',
      isLocked,
      navType: 'modern',
      isOpen: false,
    };
  }

  public componentDidMount() {
    this.subscription = Rx.combineLatest(
      this.props.appTitle$,
      this.props.isVisible$,
      this.props.forceAppSwitcherNavigation$,
      this.props.navLinks$,
      this.props.recentlyAccessed$,
      // Types for combineLatest only handle up to 6 inferred types so we combine these separately.
      Rx.combineLatest(
        this.props.navControlsLeft$,
        this.props.navControlsRight$,
        this.props.application.currentAppId$,
        this.props.isLocked$,
        this.props.navType$
      )
    ).subscribe({
      next: ([
        appTitle,
        isVisible,
        forceNavigation,
        navLinks,
        recentlyAccessed,
        [navControlsLeft, navControlsRight, currentAppId, isLocked, navType],
      ]) => {
        this.setState({
          appTitle,
          isVisible,
          forceNavigation,
          navLinks: navLinks.filter((navLink) => !navLink.hidden),
          recentlyAccessed,
          navControlsLeft,
          navControlsRight,
          currentAppId,
          isLocked,
          navType,
        });
      },
    });
  }

  public componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public renderMenuTrigger() {
    return (
      <EuiHeaderSectionItemButton
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.toggleSideNavAriaLabel', {
          defaultMessage: 'Toggle side navigation',
        })}
        onClick={() => this.navDrawerRef.current?.toggleOpen()}
      >
        <EuiIcon type="apps" size="m" />
      </EuiHeaderSectionItemButton>
    );
  }

  public render() {
    const { appTitle, isVisible, navControlsLeft, navControlsRight } = this.state;
    const {
      badge$,
      breadcrumbs$,
      helpExtension$,
      helpSupportUrl$,
      kibanaDocLink,
      kibanaVersion,
    } = this.props;
    const navLinks = this.state.navLinks.map((link) =>
      createNavLink(
        link,
        this.props.legacyMode,
        this.state.currentAppId,
        this.props.basePath,
        this.props.application.navigateToApp
      )
    );
    const recentNavLinks = this.state.recentlyAccessed.map((link) =>
      createRecentNavLink(link, this.state.navLinks, this.props.basePath)
    );

    if (!isVisible) {
      return null;
    }

    const className = classnames(
      'chrHeaderWrapper', // TODO #64541 - delete this
      'hide-for-sharing',
      {
        'chrHeaderWrapper--navIsLocked': this.state.isLocked,
        headerWrapper: this.state.navType === 'modern',
      }
    );
    const navId = htmlIdGenerator()();
    return (
      <header className={className} data-test-subj="headerGlobalNav">
        <EuiHeader position="fixed">
          <EuiHeaderSection grow={false}>
            {this.state.navType === 'modern' ? (
              <EuiHeaderSectionItem border="right" className="header__toggleNavButtonSection">
                <EuiHeaderSectionItemButton
                  data-test-subj="toggleNavButton"
                  aria-label={i18n.translate('core.ui.primaryNav.toggleNavAriaLabel', {
                    defaultMessage: 'Toggle primary navigation',
                  })}
                  onClick={() => {
                    this.setState({ isOpen: !this.state.isOpen });
                  }}
                  aria-expanded={this.state.isOpen}
                  aria-pressed={this.state.isOpen}
                  aria-controls={navId}
                  ref={this.toggleCollapsibleNavRef}
                >
                  <EuiIcon type="menu" size="m" />
                </EuiHeaderSectionItemButton>
              </EuiHeaderSectionItem>
            ) : (
              // TODO #64541
              // Delete this block
              <EuiShowFor sizes={['xs', 's']}>
                <EuiHeaderSectionItem border="right">
                  {this.renderMenuTrigger()}
                </EuiHeaderSectionItem>
              </EuiShowFor>
            )}

            <EuiHeaderSectionItem border="right">
              <HeaderLogo
                href={this.props.homeHref}
                forceNavigation={this.state.forceNavigation}
                navLinks={navLinks}
                navigateToApp={this.props.application.navigateToApp}
              />
            </EuiHeaderSectionItem>

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
        {this.state.navType === 'modern' ? (
          <CollapsibleNav
            id={navId}
            isLocked={this.state.isLocked}
            onIsLockedUpdate={this.props.onIsLockedUpdate}
            navLinks={navLinks}
            recentNavLinks={recentNavLinks}
            isOpen={this.state.isOpen}
            homeHref={this.props.homeHref}
            onIsOpenUpdate={(isOpen = !this.state.isOpen) => {
              this.setState({ isOpen });
              if (this.toggleCollapsibleNavRef.current) {
                this.toggleCollapsibleNavRef.current.focus();
              }
            }}
            navigateToApp={this.props.application.navigateToApp}
          />
        ) : (
          // TODO #64541
          // Delete this block
          <NavDrawer
            isLocked={this.state.isLocked}
            onIsLockedUpdate={this.props.onIsLockedUpdate}
            navLinks={navLinks}
            recentNavLinks={recentNavLinks}
            ref={this.navDrawerRef}
          />
        )}
      </header>
    );
  }
}
