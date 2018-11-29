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
  navLinks: NavLink[];
  intl: InjectedIntl;
}

interface State {
  isOpen: boolean;
}

class HeaderAppMenuUI extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isOpen: false,
    };
  }

  public render() {
    const { navLinks = [], intl } = this.props;

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
      href={navLink.url}
      key={navLink.id}
      onClick={this.closeMenu}
    >
      <EuiIcon type={navLink.euiIconType} size="l" />
    </EuiKeyPadMenuItem>
  );
}

export const HeaderAppMenu = injectI18n(HeaderAppMenuUI);
