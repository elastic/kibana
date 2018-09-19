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
  EuiHeader,
  // @ts-ignore
  EuiHeaderBreadcrumbs,
  // @ts-ignore
  EuiHeaderLogo,
  // @ts-ignore
  EuiHeaderSection,
  // @ts-ignore
  EuiHeaderSectionItem,
} from '@elastic/eui';

import { HeaderAppMenu } from './header_app_menu';
import { HeaderNavControl } from './header_nav_control';
import { HeaderSpacesMenu } from './header_spaces_menu';

import { NavControl, NavLink } from '../';

interface Props {
  navLinks: NavLink[];
  navControls: NavControl[];
  isVisible: boolean;
  appTitle?: string;
}

export class Header extends Component<Props> {
  public renderLogo() {
    return <EuiHeaderLogo iconType="logoKibana" href="/" aria-label="Go to home page" />;
  }

  public renderBreadcrumbs() {
    const { appTitle } = this.props;

    if (!appTitle) {
      return null;
    }

    const breadcrumbs = [
      {
        text: appTitle,
      },
    ];

    return <EuiHeaderBreadcrumbs breadcrumbs={breadcrumbs} />;
  }

  public renderControls() {
    const { navControls } = this.props;

    return (
      navControls &&
      navControls.map(navControl => (
        <EuiHeaderSectionItem key={navControl.name}>
          <HeaderNavControl navControl={navControl} />
        </EuiHeaderSectionItem>
      ))
    );
  }

  public render() {
    const { navLinks, isVisible } = this.props;

    if (!isVisible) {
      return null;
    }

    return (
      <EuiHeader>
        <EuiHeaderSection>
          <EuiHeaderSectionItem border="right">{this.renderLogo()}</EuiHeaderSectionItem>

          <EuiHeaderSectionItem border="right">
            <HeaderSpacesMenu />
          </EuiHeaderSectionItem>

          {this.renderBreadcrumbs()}
        </EuiHeaderSection>

        <EuiHeaderSection side="right">
          {this.renderControls()}

          <EuiHeaderSectionItem>
            <HeaderAppMenu navLinks={navLinks} />
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
      </EuiHeader>
    );
  }
}
