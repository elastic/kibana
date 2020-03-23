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
  // @ts-ignore
  EuiNavDrawer,
  // @ts-ignore
  EuiShowFor,
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
import { OnIsLockedUpdate } from './';
import { HeaderBreadcrumbs } from './header_breadcrumbs';
import { HeaderHelpMenu } from './header_help_menu';
import { HeaderNavControls } from './header_nav_controls';
import { euiNavLink } from './nav_link';
import { HeaderLogo } from './header_logo';
import { NavDrawer } from './nav_drawer';

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
}

export class Header extends Component<HeaderProps, State> {
  private subscription?: Rx.Subscription;
  private navDrawerRef = createRef<EuiNavDrawer>();

  constructor(props: HeaderProps) {
    super(props);

    this.state = {
      appTitle: 'Kibana',
      isVisible: true,
      navLinks: [],
      recentlyAccessed: [],
      forceNavigation: false,
      navControlsLeft: [],
      navControlsRight: [],
      currentAppId: '',
      isLocked: false,
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
        this.props.isLocked$
      )
    ).subscribe({
      next: ([
        appTitle,
        isVisible,
        forceNavigation,
        navLinks,
        recentlyAccessed,
        [navControlsLeft, navControlsRight, currentAppId, isLocked],
      ]) => {
        this.setState({
          appTitle,
          isVisible,
          forceNavigation,
          navLinks: navLinks.filter(navLink => !navLink.hidden),
          recentlyAccessed,
          navControlsLeft,
          navControlsRight,
          currentAppId,
          isLocked,
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
        onClick={() => this.navDrawerRef.current.toggleOpen()}
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
    const navLinks = this.state.navLinks.map(link =>
      euiNavLink(
        link,
        this.props.legacyMode,
        this.state.currentAppId,
        this.props.basePath,
        this.props.application.navigateToApp
      )
    );

    if (!isVisible) {
      return null;
    }

    const className = classnames(
      'chrHeaderWrapper',
      {
        'chrHeaderWrapper--navIsLocked': this.state.isLocked,
      },
      'hide-for-sharing'
    );

    return (
      <header className={className} data-test-subj="headerGlobalNav">
        <EuiHeader>
          <EuiHeaderSection grow={false}>
            <EuiShowFor sizes={['xs', 's']}>
              <EuiHeaderSectionItem border="right">{this.renderMenuTrigger()}</EuiHeaderSectionItem>
            </EuiShowFor>

            <EuiHeaderSectionItem border="right">
              <HeaderLogo
                href={this.props.homeHref}
                forceNavigation={this.state.forceNavigation}
                navLinks={navLinks}
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
        <NavDrawer
          isLocked={this.state.isLocked}
          onIsLockedUpdate={this.props.onIsLockedUpdate}
          navLinks={navLinks}
          chromeNavLinks={this.state.navLinks}
          recentlyAccessedItems={this.state.recentlyAccessed}
          basePath={this.props.basePath}
          ref={this.navDrawerRef}
        />
      </header>
    );
  }
}
