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

import React, { Component } from 'react';
import * as Rx from 'rxjs';

import {
  // TODO: add type annotations
  // @ts-ignore
  EuiHeaderSectionItemButton,
  // @ts-ignore
  EuiIcon,
  // @ts-ignore
  EuiKeyPadMenu,
  // @ts-ignore
  EuiKeyPadMenuItem,
  EuiPopover,
} from '@elastic/eui';

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { NavLink } from '../';

interface Props {
  navLinks$: Rx.Observable<NavLink[]>;
  intl: InjectedIntl;
}

interface State {
  isOpen: boolean;
  navLinks: NavLink[];
}

class HeaderAppMenuUI extends Component<Props, State> {
  private subscription?: Rx.Subscription;

  constructor(props: Props) {
    super(props);

    this.state = {
      isOpen: false,
      navLinks: [],
    };
  }

  public componentDidMount() {
    this.subscription = this.props.navLinks$.subscribe({
      next: navLinks => {
        this.setState({ navLinks });
      },
    });
  }

  public componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  public render() {
    const { intl } = this.props;
    const { navLinks } = this.state;

    const button = (
      <EuiHeaderSectionItemButton
        aria-controls="keyPadMenu"
        aria-expanded={this.state.isOpen}
        aria-haspopup="true"
        aria-label={intl.formatMessage({
          id: 'common.ui.chrome.headerGlobalNav.appMenuButtonAriaLabel',
          defaultMessage: 'Apps menu',
        })}
        onClick={this.onMenuButtonClick}
      >
        <EuiIcon type="apps" size="m" />
      </EuiHeaderSectionItemButton>
    );

    return (
      <EuiPopover
        id="headerAppMenu"
        button={button}
        isOpen={this.state.isOpen}
        anchorPosition="downRight"
        // @ts-ignore
        repositionOnScroll
        closePopover={this.closeMenu}
      >
        <EuiKeyPadMenu id="keyPadMenu" style={{ width: 288 }}>
          {navLinks.map(this.renderNavLink)}
        </EuiKeyPadMenu>
      </EuiPopover>
    );
  }

  private onMenuButtonClick = () => {
    this.setState({
      isOpen: !this.state.isOpen,
    });
  };

  private closeMenu = () => {
    this.setState({
      isOpen: false,
    });
  };

  private renderNavLink = (navLink: NavLink) => (
    <EuiKeyPadMenuItem
      label={navLink.title}
      href={navLink.active || !navLink.lastSubUrl ? navLink.url : navLink.lastSubUrl}
      key={navLink.id}
      onClick={this.closeMenu}
    >
      <EuiIcon type={navLink.euiIconType} size="l" />
    </EuiKeyPadMenuItem>
  );
}

export const HeaderAppMenu = injectI18n(HeaderAppMenuUI);
